import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, uploadVideoViaUi } from "./helpers";

test("el vídeo subido se reproduce sin errores 403/404 en la URL prefirmada", async ({ page }) => {
  const user = makeUser("playback");
  await registerViaUi(page, user);

  const nombre = "Clip reproducible E2E";
  await uploadVideoViaUi(page, { nombre });

  const rustfsOrigin = new URL(process.env.RUSTFS_ENDPOINT ?? "http://localhost:9001").origin;
  const mediaStatuses: number[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(rustfsOrigin)) {
      mediaStatuses.push(response.status());
    }
  });

  await expect(page.getByTestId("video-title")).toHaveText(nombre);
  await expect(page.getByTestId("video-player")).toBeVisible();

  // Espera al evento loadeddata real del elemento <video>, no un timeout fijo.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement | null;
    return !!el && el.readyState >= 2; // HAVE_CURRENT_DATA
  }, { timeout: 15_000 });

  await expect(page.getByTestId("video-player-error")).toHaveCount(0);
  expect(mediaStatuses.length).toBeGreaterThan(0);
  expect(mediaStatuses.every((status) => status < 400)).toBe(true);
});
