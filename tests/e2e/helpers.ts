import path from "node:path";
import { statSync } from "node:fs";
import type { Page } from "@playwright/test";

export const SAMPLE_VIDEO_PATH = path.resolve(__dirname, "fixtures/sample.mp4");
export const SAMPLE_VIDEO_SIZE_BYTES = statSync(SAMPLE_VIDEO_PATH).size;

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/** Email con prefijo "e2e-" para que global-teardown.ts pueda limpiarlo. */
export function makeUser(prefix: string): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `E2E ${prefix}`,
    email: `e2e-${prefix}-${unique}@example.com`,
    password: "password123!",
  };
}

export async function registerViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/register");
  await page.getByTestId("register-name").fill(user.name);
  await page.getByTestId("register-email").fill(user.email);
  await page.getByTestId("register-password").fill(user.password);
  await page.getByTestId("register-submit").click();
  await page.waitForURL("**/videos");
}

export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(user.email);
  await page.getByTestId("login-password").fill(user.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/videos");
}

export interface UploadOptions {
  nombre: string;
  descripcion?: string;
  tags?: string[];
  kv?: Record<string, string>;
  filePath?: string;
}

/** Sube un vídeo vía la UI real (presign -> PUT a RustFS -> guardar ficha) y devuelve su id. */
export async function uploadVideoViaUi(page: Page, options: UploadOptions): Promise<string> {
  await page.goto("/videos/upload");
  await page.getByTestId("upload-file").setInputFiles(options.filePath ?? SAMPLE_VIDEO_PATH);
  await page.getByTestId("upload-nombre").fill(options.nombre);

  if (options.descripcion) {
    await page.getByTestId("upload-descripcion").fill(options.descripcion);
  }

  for (const tag of options.tags ?? []) {
    await page.getByTestId("upload-tag-input").fill(tag);
    await page.getByTestId("upload-tag-input").press("Enter");
  }

  const kvEntries = Object.entries(options.kv ?? {});
  for (const [index, [key, value]] of kvEntries.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "+ Añadir par" }).click();
    }
    await page.getByTestId(`upload-kv-key-${index}`).fill(key);
    await page.getByTestId(`upload-kv-value-${index}`).fill(value);
  }

  await page.getByTestId("upload-submit").click();
  await page.waitForURL(/\/videos\/[a-f0-9]{24}$/, { timeout: 30_000 });

  const id = page.url().split("/").pop();
  if (!id) throw new Error("No se pudo extraer el id del vídeo tras subirlo");
  return id;
}
