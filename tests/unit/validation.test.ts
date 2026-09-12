import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, isNonEmptyString } from "../../lib/validation.ts";

test("isValidEmail: acepta emails con forma válida", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("a.b+c@sub.example.co"), true);
});

test("isValidEmail: rechaza valores sin forma de email o no-strings", () => {
  assert.equal(isValidEmail("no-es-un-email"), false);
  assert.equal(isValidEmail("falta-dominio@"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(42), false);
});

test("isNonEmptyString: rechaza vacío, solo espacios y valores por encima del máximo", () => {
  assert.equal(isNonEmptyString("hola"), true);
  assert.equal(isNonEmptyString(""), false);
  assert.equal(isNonEmptyString("   "), false);
  assert.equal(isNonEmptyString("a".repeat(10), 5), false);
});
