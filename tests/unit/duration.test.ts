import { test } from "node:test";
import assert from "node:assert/strict";
import { durationToSeconds } from "../../lib/auth/duration.ts";

test("durationToSeconds: convierte cada unidad soportada", () => {
  assert.equal(durationToSeconds("30s"), 30);
  assert.equal(durationToSeconds("15m"), 15 * 60);
  assert.equal(durationToSeconds("12h"), 12 * 3600);
  assert.equal(durationToSeconds("7d"), 7 * 86400);
  assert.equal(durationToSeconds("2w"), 2 * 604800);
});

test("durationToSeconds: ignora espacios alrededor del valor", () => {
  assert.equal(durationToSeconds(" 7d "), 7 * 86400);
});

test("durationToSeconds: rechaza formatos inválidos", () => {
  assert.throws(() => durationToSeconds("7 days"));
  assert.throws(() => durationToSeconds("abc"));
  assert.throws(() => durationToSeconds(""));
});
