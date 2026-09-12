import { test, expect } from "@playwright/test";

test.describe("acceso protegido sin sesión", () => {
  test("GET /dashboard redirige a /login con ?next=/dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("GET /videos redirige a /login", async ({ page }) => {
    await page.goto("/videos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /api/videos responde 401 sin cookie de sesión", async ({ request }) => {
    const response = await request.get("/api/videos");
    expect(response.status()).toBe(401);
  });

  test("GET /api/dashboard responde 401 sin cookie de sesión", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).toBe(401);
  });
});
