import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, toSerial } from "../../lib/format.ts";

test("formatBytes: 0 o negativo se muestra como 0 B", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-10), "0 B");
});

test("formatBytes: bytes por debajo de 1 KB no llevan decimales", () => {
  assert.equal(formatBytes(512), "512 B");
});

test("formatBytes: escala a KB/MB/GB con un decimal", () => {
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1024 * 1024 * 2.5), "2.5 MB");
  assert.equal(formatBytes(1024 ** 3 * 1.2), "1.2 GB");
});

test("toSerial: usa los últimos 6 caracteres del id en mayúsculas", () => {
  assert.equal(toSerial("6aa4be64792d7d0b8a0bd02e"), "0BD02E");
});
