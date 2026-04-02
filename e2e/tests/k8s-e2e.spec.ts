import { test, expect } from "@playwright/test";

/**
 * K8s E2E tests — run against a port-forwarded frontend (default localhost:8081).
 * The frontend nginx proxies /todos to the API service inside the cluster.
 *
 * Usage:
 *   BASE_URL=http://localhost:8081 npx playwright test tests/k8s-e2e.spec.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8081";

test.describe("TodoApp K8s E2E", () => {
  test("frontend loads successfully", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Todo/i);
  });

  test("can add a todo item", async ({ page }) => {
    await page.goto(BASE_URL);

    // Type a new todo
    await page.fill("input", "k8s-e2e-test-item", { timeout: 10000 });

    // Click add button
    await page.click("button:has-text('add')");

    // Verify the todo appears
    const todo = page.getByTestId("todo-checkbox").last();
    await expect(todo).toBeVisible({ timeout: 10000 });
    await expect(todo).toHaveText("k8s-e2e-test-item");
  });

  test("API is reachable through nginx proxy", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/todos`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
