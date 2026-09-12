import { test, expect } from "@playwright/test";
import { makeUser, registerViaUi, uploadVideoViaUi, SAMPLE_VIDEO_SIZE_BYTES } from "./helpers";

test("el dashboard refleja el número de vídeos y el espacio ocupado reales", async ({ page }) => {
  const user = makeUser("dashboard");
  await registerViaUi(page, user);

  const videoCount = 3;
  for (let i = 0; i < videoCount; i += 1) {
    await uploadVideoViaUi(page, { nombre: `Clip dashboard E2E ${i + 1}` });
  }

  await page.goto("/dashboard");
  await expect(page.getByTestId("stat-total-videos")).toHaveText(String(videoCount));

  const response = await page.request.get("/api/dashboard");
  const data = await response.json();
  expect(data.totalVideos).toBe(videoCount);
  expect(data.totalBytes).toBe(SAMPLE_VIDEO_SIZE_BYTES * videoCount);
});
