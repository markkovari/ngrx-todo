import { Given, When, Then, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { chromium, expect } from "@playwright/test";
import { Browser, Page } from "playwright";
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  DownedDockerComposeEnvironment,
} from "testcontainers";

let page: Page;
let browser: Browser;
let docker: DockerComposeEnvironment;
let startedDocker: StartedDockerComposeEnvironment;
let downedDocker: DownedDockerComposeEnvironment;

BeforeAll(async () => {
  docker = new DockerComposeEnvironment("../..", "docker-compose.yml");
  startedDocker = await docker.up();
  browser = await chromium.launch();
  page = await browser.newPage();
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
});

AfterAll(async () => {
  await page.close();
  await browser.close();
  downedDocker = await startedDocker.down();
});

function addingATodo() {
  Given(
    "{string} that I insert into the text field",
    async function (todoInput) {
      await page.goto("http://localhost:4200");
      await page.fill("input", todoInput);
    }
  );

  When("I click on the add button", async function () {
    await page.click("button:has-text('add')");
  });

  Then(
    "I should see a todo with the {string} label",
    async function (todoItem) {
      const todo = await page.getByTestId("todo-checkbox").last(); // Added 'await' keyword
      await expect(todo).toBeVisible();
      await expect(todo).toHaveText(todoItem);
    }
  );
}

addingATodo();
