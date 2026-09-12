import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, uploadVideoViaUi } from "./helpers";

test("subir un vídeo con metadatos lo deja visible en el listado", async ({ page }) => {
  const user = makeUser("upload");
  await registerViaUi(page, user);

  const nombre = "Clip E2E de subida";
  await uploadVideoViaUi(page, {
    nombre,
    descripcion: "Subido por el test de subida completa",
    tags: ["e2e", "subida"],
    kv: { proyecto: "videovault-e2e" },
  });

  // La subida redirige al detalle del vídeo recién creado.
  await expect(page.getByTestId("video-title")).toHaveText(nombre);
  await expect(page.getByTestId("video-tags")).toContainText("e2e");
  await expect(page.getByTestId("video-tags")).toContainText("subida");

  await page.goto("/videos");
  const card = page.getByTestId("video-card").filter({ hasText: nombre });
  await expect(card).toBeVisible();
});
