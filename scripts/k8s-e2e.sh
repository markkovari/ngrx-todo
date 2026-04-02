#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# k8s-e2e.sh — Deploy the TodoApp Helm chart, run Playwright E2E tests,
#               and clean up the namespace.
#
# Usage:
#   ./scripts/k8s-e2e.sh [--no-cleanup]
#
# Requirements: kubectl, helm, npm (for Playwright), docker (for image builds)
# -----------------------------------------------------------------------------
set -euo pipefail

NAMESPACE="todo-e2e-${RANDOM}"
RELEASE="todo-e2e"
CHART_DIR="$(cd "$(dirname "$0")/../chart" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_PORT=8081
NO_CLEANUP=false
PF_PID=""

for arg in "$@"; do
  case "$arg" in
    --no-cleanup) NO_CLEANUP=true ;;
  esac
done

cleanup() {
  echo ""
  echo "==> Cleaning up..."
  # Kill port-forward if running
  if [[ -n "$PF_PID" ]] && kill -0 "$PF_PID" 2>/dev/null; then
    kill "$PF_PID" 2>/dev/null || true
    wait "$PF_PID" 2>/dev/null || true
    echo "    Port-forward stopped."
  fi
  if [[ "$NO_CLEANUP" == "false" ]]; then
    helm uninstall "$RELEASE" --namespace "$NAMESPACE" 2>/dev/null || true
    kubectl delete namespace "$NAMESPACE" --wait=false 2>/dev/null || true
    echo "    Namespace $NAMESPACE deleted."
  else
    echo "    Skipping cleanup (--no-cleanup). Namespace: $NAMESPACE"
  fi
}
trap cleanup EXIT

echo "==> Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE"

echo "==> Building Docker images..."
docker build -t todo-api:latest "$REPO_ROOT/todo-api"
docker build -t todo-app:latest "$REPO_ROOT/todo-app"

# If using kind, load images into the cluster
if command -v kind &>/dev/null; then
  echo "==> Loading images into kind cluster..."
  kind load docker-image todo-api:latest todo-app:latest 2>/dev/null || true
fi

# If using minikube, images are already available via eval $(minikube docker-env)
if command -v minikube &>/dev/null && [[ "${MINIKUBE_ACTIVE_DOCKERD:-}" == "minikube" ]]; then
  echo "    Using minikube Docker daemon — images available in cluster."
fi

echo "==> Installing Helm chart into namespace $NAMESPACE..."
helm install "$RELEASE" "$CHART_DIR" \
  --namespace "$NAMESPACE" \
  --set api.image.pullPolicy=IfNotPresent \
  --set frontend.image.pullPolicy=IfNotPresent \
  --wait \
  --timeout 120s

echo "==> Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod \
  --all \
  --namespace "$NAMESPACE" \
  --timeout=90s

echo "==> All pods ready:"
kubectl get pods --namespace "$NAMESPACE"

echo "==> Running Helm tests..."
helm test "$RELEASE" --namespace "$NAMESPACE" --timeout 120s || true

echo "==> Port-forwarding frontend on localhost:$FRONTEND_PORT..."
FRONTEND_SVC=$(kubectl get svc --namespace "$NAMESPACE" -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward "svc/$FRONTEND_SVC" "$FRONTEND_PORT:80" --namespace "$NAMESPACE" &
PF_PID=$!

# Wait for port-forward to be ready
echo "    Waiting for port-forward..."
for i in $(seq 1 20); do
  if curl -sf "http://localhost:$FRONTEND_PORT/" > /dev/null 2>&1; then
    echo "    Port-forward ready."
    break
  fi
  if [[ $i -eq 20 ]]; then
    echo "ERROR: Port-forward did not become ready."
    exit 1
  fi
  sleep 1
done

echo "==> Running Playwright E2E tests..."
cd "$REPO_ROOT/e2e"
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts
npx playwright install chromium --with-deps 2>/dev/null || true
BASE_URL="http://localhost:$FRONTEND_PORT" npx playwright test tests/k8s-e2e.spec.ts --project=chromium --reporter=list
E2E_EXIT=$?

if [[ $E2E_EXIT -eq 0 ]]; then
  echo ""
  echo "==> All E2E tests passed!"
else
  echo ""
  echo "==> E2E tests FAILED (exit code $E2E_EXIT)"
fi

exit $E2E_EXIT
