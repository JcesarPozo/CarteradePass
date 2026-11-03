import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptBackup, deriveEncryptionKey, encryptEntries, normalizeCredentials, randomSalt, type Credential } from "./vault-crypto";

const fixture: Credential[] = [{ id: "test-id", title: "Correo", username: "ana@example.com", password: "Clave-fuerte-123!", url: "https://example.com", category: "Personal", notes: "nota privada", favorite: true, updatedAt: "2026-10-14T12:00:00.000Z" }];

test("cifra y descifra un respaldo v2 con frase maestra correcta", async () => {
  const salt = randomSalt();
  const key = await deriveEncryptionKey("una frase maestra de prueba segura", salt);
  const backup = await encryptEntries(fixture, key, salt);
  assert.equal(JSON.stringify(backup).includes("ana@example.com"), false);
  assert.deepEqual((await decryptBackup(backup, "una frase maestra de prueba segura")).entries, fixture);
});

test("rechaza frase maestra incorrecta y cambios en el ciphertext", async () => {
  const salt = randomSalt();
  const key = await deriveEncryptionKey("otra frase maestra de prueba", salt);
  const backup = await encryptEntries(fixture, key, salt);
  await assert.rejects(() => decryptBackup(backup, "frase incorrecta"));
  const damaged = { ...backup, ciphertext: `${backup.ciphertext.slice(0, -4)}AAAA` };
  await assert.rejects(() => decryptBackup(damaged, "otra frase maestra de prueba"));
});

test("importa y migra una copia cifrada v1 anterior", async () => {
  const salt = randomSalt();
  const key = await deriveEncryptionKey("frase de continuidad para prueba", salt);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const payload = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode(JSON.stringify(fixture)));
  const legacy = { format: "clave-encrypted-v1", vaultSalt: salt, nonce: Buffer.from(nonce).toString("base64"), ciphertext: Buffer.from(payload).toString("base64") };
  const migrated = await decryptBackup(legacy, "frase de continuidad para prueba");
  assert.equal(migrated.backup.format, "clave-local-encrypted-v2");
  assert.deepEqual(migrated.entries, fixture);
});

test("normaliza importaciones y marca los campos ausentes como vacíos", () => {
  assert.deepEqual(normalizeCredentials([{}])[0].title, "");
});
