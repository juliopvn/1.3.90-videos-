import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, loginViaUi } from "./helpers";

test("registro, logout y login vuelven a dejar al usuario dentro", async ({ page }) => {
  const user = makeUser("auth");

  await registerViaUi(page, user);
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByTestId("logout-button")).toBeVisible();

  await page.getByTestId("logout-button").click();
  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("nav-login")).toBeVisible();

  await loginViaUi(page, user);
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByTestId("logout-button")).toBeVisible();
});

test("registrar dos veces el mismo email falla con un error claro", async ({ page }) => {
  const user = makeUser("dup");
  await registerViaUi(page, user);
  await page.getByTestId("logout-button").click();

  await page.goto("/register");
  await page.getByTestId("register-name").fill(user.name);
  await page.getByTestId("register-email").fill(user.email);
  await page.getByTestId("register-password").fill(user.password);
  await page.getByTestId("register-submit").click();

  await expect(page.getByTestId("register-error")).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});
