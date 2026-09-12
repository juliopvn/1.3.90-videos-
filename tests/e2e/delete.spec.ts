import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, uploadVideoViaUi } from "./helpers";

test("borrar un vídeo lo quita del listado y su URL prefirmada deja de servir el archivo", async ({ page }) => {
  const user = makeUser("delete");
  await registerViaUi(page, user);

  const nombre = "Clip a borrar E2E";
  await uploadVideoViaUi(page, { nombre });

  const oldSrc = await page.getByTestId("video-player").locator("source").getAttribute("src");
  expect(oldSrc).toBeTruthy();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("delete-button").click();
  await page.waitForURL(/\/videos$/);

  // Este usuario solo tenía este vídeo: tras borrarlo, el vault queda vacío.
  await expect(page.getByTestId("empty-state")).toBeVisible();

  const response = await page.request.get(oldSrc!);
  expect(response.status()).toBe(404);
});
