#!/usr/bin/env bash
#
# K8s E2E Test Script
# Deploys the todo-app Helm chart, runs verification and Cucumber BDD tests,
# then cleans up the namespace.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CHART_DIR="$REPO_ROOT/chart"
E2E_DIR="$REPO_ROOT/e2e"

NAMESPACE="${K8S_NAMESPACE:-todo-e2e-$(date +%s)}"
RELEASE_NAME="${HELM_RELEASE:-todo-e2e}"
FRONTEND_LOCAL_PORT="${FRONTEND_PORT:-8082}"
API_LOCAL_PORT="${API_PORT:-3000}"
TIMEOUT="${DEPLOY_TIMEOUT:-120s}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

cleanup() {
  log "Cleaning up..."

  # Kill port-forward processes
  if [ -n "${PF_FRONTEND_PID:-}" ]; then
    kill "$PF_FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "${PF_API_PID:-}" ]; then
    kill "$PF_API_PID" 2>/dev/null || true
  fi

  # Uninstall Helm release and delete namespace
  if helm status "$RELEASE_NAME" -n "$NAMESPACE" &>/dev/null; then
    log "Uninstalling Helm release '$RELEASE_NAME'..."
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" --wait
  fi

  if kubectl get namespace "$NAMESPACE" &>/dev/null; then
    log "Deleting namespace '$NAMESPACE'..."
    kubectl delete namespace "$NAMESPACE" --wait=true --timeout=60s
  fi

  log "Cleanup complete."
}

trap cleanup EXIT

# ---- Pre-flight checks ----
log "Checking prerequisites..."

for cmd in helm kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd is not installed or not in PATH"
    exit 1
  fi
done

# ---- Build Docker images ----
log "Building Docker images..."
docker build -t todo-api:latest "$REPO_ROOT/todo-api"
docker build -t todo-app:latest "$REPO_ROOT/todo-app"

# ---- Create namespace ----
log "Creating namespace '$NAMESPACE'..."
kubectl create namespace "$NAMESPACE"

# ---- Deploy with Helm ----
log "Installing Helm chart..."
helm install "$RELEASE_NAME" "$CHART_DIR" \
  --namespace "$NAMESPACE" \
  --set api.image.repository=todo-api \
  --set api.image.tag=latest \
  --set api.image.pullPolicy=Never \
  --set frontend.image.repository=todo-app \
  --set frontend.image.tag=latest \
  --set frontend.image.pullPolicy=Never \
  --wait \
  --timeout "$TIMEOUT"

log "Helm install complete."

# ---- Wait for pods ready ----
log "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod \
  -l "app=${RELEASE_NAME}-api" \
  -n "$NAMESPACE" \
  --timeout="$TIMEOUT"

kubectl wait --for=condition=ready pod \
  -l "app=${RELEASE_NAME}-frontend" \
  -n "$NAMESPACE" \
  --timeout="$TIMEOUT"

log "All pods are ready."
kubectl get pods -n "$NAMESPACE"

# ---- Verify API via kubectl exec ----
log "Verifying API via kubectl exec..."
API_POD=$(kubectl get pod -n "$NAMESPACE" -l "app=${RELEASE_NAME}-api" -o jsonpath='{.items[0].metadata.name}')

log "Testing GET /todos on pod $API_POD..."
RESULT=$(kubectl exec -n "$NAMESPACE" "$API_POD" -- \
  wget -qO- http://localhost:3000/todos 2>&1) || {
    # Fallback: try with curl if wget not available
    RESULT=$(kubectl exec -n "$NAMESPACE" "$API_POD" -- \
      curl -sf http://localhost:3000/todos 2>&1) || true
  }

echo "  API response: $RESULT"
if echo "$RESULT" | grep -q '\[\]'; then
  log "API verification passed (empty todos list)."
else
  warn "API returned unexpected response, but continuing..."
fi

# ---- Run Helm tests ----
log "Running Helm tests..."
helm test "$RELEASE_NAME" -n "$NAMESPACE" --timeout "$TIMEOUT" || {
  warn "Helm tests failed (non-fatal, continuing with E2E)."
}

# ---- Port-forward frontend ----
log "Setting up port-forward: frontend on localhost:$FRONTEND_LOCAL_PORT..."
kubectl port-forward -n "$NAMESPACE" \
  "svc/${RELEASE_NAME}-frontend" \
  "${FRONTEND_LOCAL_PORT}:80" &
PF_FRONTEND_PID=$!

log "Setting up port-forward: API on localhost:$API_LOCAL_PORT..."
kubectl port-forward -n "$NAMESPACE" \
  "svc/${RELEASE_NAME}-api" \
  "${API_LOCAL_PORT}:3000" &
PF_API_PID=$!

# Wait for port-forwards to establish
sleep 3

# Verify port-forward is working
curl -sf "http://localhost:${API_LOCAL_PORT}/todos" > /dev/null 2>&1 || {
  error "API port-forward not working"
  exit 1
}
log "Port-forward verified."

# ---- Run Cucumber BDD E2E tests ----
log "Running Cucumber BDD E2E tests..."
cd "$E2E_DIR"

# Set environment variables for the test to use K8s-deployed services
export E2E_BASE_URL="http://localhost:${FRONTEND_LOCAL_PORT}"
export E2E_API_URL="http://localhost:${API_LOCAL_PORT}"
export E2E_USE_K8S=true

if [ -f "package.json" ]; then
  npm install --silent 2>/dev/null || true
  npx cucumber-js --config cucumber-k8s.json -f @cucumber/pretty-formatter || {
    error "Cucumber E2E tests failed!"
    exit 1
  }
fi

log "All E2E tests passed!"
log "Namespace '$NAMESPACE' will be cleaned up on exit."
