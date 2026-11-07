// Run: npm test. Company OS: the Google service-account key from Vercel is normalised to PEM (src/lib/os/pem.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createPrivateKey } from "node:crypto";
import { normalizePrivateKey } from "../src/lib/os/pem.ts";

const pem = generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey.export({ type: "pkcs8", format: "pem" });
const escaped = pem.replace(/\n/g, "\\n");

test("accepts the key in every way it gets pasted into Vercel", () => {
  for (const raw of [pem, escaped, `"${escaped}"`, `"${escaped}",`, `'${escaped}'`, pem.replace(/\n/g, "\r\n"), `  ${escaped}  `]) {
    assert.doesNotThrow(() => createPrivateKey(normalizePrivateKey(raw)));
  }
});

test("empty stays unusable rather than inventing a key", () => {
  assert.throws(() => createPrivateKey(normalizePrivateKey(undefined)));
});
