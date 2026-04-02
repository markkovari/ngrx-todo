import { Given, When, Then, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { chromium, expect } from "@playwright/test";
import { Browser, Page } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:8082";
const API_URL = process.env.E2E_API_URL || "http://localhost:3000";

let page: Page;
let browser: Browser;
let lastResponse: any;
let lastStatusCode: number;
let createdTodoId: number | null = null;

BeforeAll({ timeout: 30000 }, async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});

AfterAll({ timeout: 10000 }, async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

// --- Background ---

Given(
  "the todo application is deployed on Kubernetes",
  async function () {
    // Verify API is reachable
    const res = await fetch(`${API_URL}/todos`);
    if (!res.ok) {
      throw new Error(`API not reachable at ${API_URL}: HTTP ${res.status}`);
    }
  }
);

// --- API Steps ---

When("I request the list of todos from the API", async function () {
  const res = await fetch(`${API_URL}/todos`);
  lastStatusCode = res.status;
  lastResponse = await res.json();
});

Then("the API should return a successful response", async function () {
  if (lastStatusCode < 200 || lastStatusCode >= 300) {
    throw new Error(`Expected 2xx, got ${lastStatusCode}`);
  }
});

Then("the response should be an empty list", async function () {
  if (!Array.isArray(lastResponse) || lastResponse.length !== 0) {
    throw new Error(`Expected empty array, got: ${JSON.stringify(lastResponse)}`);
  }
});

When("I create a todo with name {string}", async function (name: string) {
  const res = await fetch(`${API_URL}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  lastStatusCode = res.status;
  lastResponse = await res.json();
  createdTodoId = lastResponse.id;
});

Then(
  "the created todo should have name {string}",
  async function (name: string) {
    if (lastResponse.name !== name) {
      throw new Error(
        `Expected name "${name}", got "${lastResponse.name}"`
      );
    }
  }
);

Then(
  "the list should contain a todo with name {string}",
  async function (name: string) {
    const found = lastResponse.find((t: any) => t.name === name);
    if (!found) {
      throw new Error(
        `Todo "${name}" not found in list: ${JSON.stringify(lastResponse)}`
      );
    }
  }
);

When("I toggle the todo {string}", async function (name: string) {
  // Find the todo by name first
  const listRes = await fetch(`${API_URL}/todos`);
  const todos = await listRes.json();
  const todo = todos.find((t: any) => t.name === name);
  if (!todo) throw new Error(`Todo "${name}" not found for toggle`);

  const res = await fetch(`${API_URL}/todos/${todo.id}/toggle`, {
    method: "PATCH",
  });
  lastStatusCode = res.status;
  lastResponse = await res.json();
});

Then("the toggle should succeed", async function () {
  if (lastStatusCode < 200 || lastStatusCode >= 300) {
    throw new Error(`Toggle failed with status ${lastStatusCode}`);
  }
});

When("I delete the todo {string}", async function (name: string) {
  const listRes = await fetch(`${API_URL}/todos`);
  const todos = await listRes.json();
  const todo = todos.find((t: any) => t.name === name);
  if (!todo) throw new Error(`Todo "${name}" not found for deletion`);

  const res = await fetch(`${API_URL}/todos/${todo.id}`, {
    method: "DELETE",
  });
  lastStatusCode = res.status;
});

Then("the deletion should succeed", async function () {
  if (lastStatusCode < 200 || lastStatusCode >= 300) {
    throw new Error(`Delete failed with status ${lastStatusCode}`);
  }
});

Then(
  "the todo {string} should not exist in the list",
  async function (name: string) {
    const res = await fetch(`${API_URL}/todos`);
    const todos = await res.json();
    const found = todos.find((t: any) => t.name === name);
    if (found) {
      throw new Error(`Todo "${name}" still exists after deletion`);
    }
  }
);

// --- Frontend Steps ---

When("I navigate to the frontend", async function () {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
});

Then("the page should load successfully", async function () {
  const title = await page.title();
  if (!title) {
    // Verify at least some content loaded
    const body = await page.textContent("body");
    if (!body) throw new Error("Page body is empty");
  }
});

Then("I should see the todo input field", async function () {
  const input = page.locator("input");
  await expect(input).toBeVisible({ timeout: 10000 });
});

When(
  "I enter {string} into the todo input field",
  async function (text: string) {
    await page.fill("input", text, { timeout: 10000 });
  }
);

When("I click the add button", async function () {
  await page.click("button:has-text('add')");
});

Then(
  "I should see {string} in the todo list",
  async function (todoText: string) {
    const todo = page.getByTestId("todo-checkbox").last();
    await expect(todo).toBeVisible({ timeout: 10000 });
    await expect(todo).toHaveText(todoText);
  }
);
