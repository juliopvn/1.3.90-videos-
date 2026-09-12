import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, uploadVideoViaUi } from "./helpers";

test("buscar por tag devuelve solo el vídeo con ese tag", async ({ page }) => {
  const user = makeUser("search");
  await registerViaUi(page, user);

  const nombreAlpha = "Reel Alpha E2E";
  const nombreBeta = "Reel Beta E2E";

  await uploadVideoViaUi(page, { nombre: nombreAlpha, tags: ["alpha-e2e"] });
  await uploadVideoViaUi(page, { nombre: nombreBeta, tags: ["beta-e2e"] });

  await page.goto("/videos");
  await page.getByTestId("search-tags").fill("alpha-e2e");
  await page.getByTestId("search-submit").click();

  const results = page.getByTestId("video-card");
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText(nombreAlpha);
  await expect(page.getByTestId("video-list")).not.toContainText(nombreBeta);
});

test("buscar por nombre y por metadato kv también filtra correctamente", async ({ page }) => {
  const user = makeUser("search-kv");
  await registerViaUi(page, user);

  const nombre = "Ficha con metadato único";
  await uploadVideoViaUi(page, { nombre, kv: { cliente: "acme-e2e" } });
  await uploadVideoViaUi(page, { nombre: "Otro vídeo sin relación" });

  await page.goto("/videos");
  await page.getByTestId("search-q").fill("metadato único");
  await page.getByTestId("search-submit").click();
  await expect(page.getByTestId("video-card")).toHaveCount(1);

  await page.getByTestId("search-clear").click();
  await page.getByTestId("search-kv").fill("cliente:acme-e2e");
  await page.getByTestId("search-submit").click();
  const results = page.getByTestId("video-card");
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText(nombre);
});
