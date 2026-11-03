import { argon2id } from "hash-wasm";

export const FORMAT = "clave-local-encrypted-v2";
export const KDF = { name: "argon2id", memorySize: 65536, iterations: 3, parallelism: 1, hashLength: 32 } as const;
const AAD = new TextEncoder().encode("clave-local-vault:v2");

export type Credential = {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  category: string;
  notes: string;
  favorite: boolean;
  updatedAt: string;
};

export type EncryptedBackup = {
  format: typeof FORMAT;
  version: 2;
  kdf: typeof KDF;
  salt: string;
  nonce: string;
  ciphertext: string;
  updatedAt: string;
};

const encoder = new TextEncoder();
const toBuffer = (data: Uint8Array) => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
export function encodeBase64(data: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < data.length; offset += 0x8000) binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
  return btoa(binary);
}
export function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export function randomSalt() {
  return encodeBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveEncryptionKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const raw = await argon2id({ password: encoder.encode(passphrase), salt: decodeBase64(salt), iterations: KDF.iterations, memorySize: KDF.memorySize, parallelism: KDF.parallelism, hashLength: KDF.hashLength, outputType: "binary" });
  return crypto.subtle.importKey("raw", toBuffer(raw as Uint8Array), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptEntries(entries: Credential[], key: CryptoKey, salt: string): Promise<EncryptedBackup> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(entries));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toBuffer(nonce), additionalData: toBuffer(AAD), tagLength: 128 }, key, toBuffer(plaintext));
  return { format: FORMAT, version: 2, kdf: KDF, salt, nonce: encodeBase64(nonce), ciphertext: encodeBase64(new Uint8Array(ciphertext)), updatedAt: new Date().toISOString() };
}

export async function decryptBackup(value: unknown, passphrase: string): Promise<{ backup: EncryptedBackup; key: CryptoKey; entries: Credential[] }> {
  const parsed = parseEncryptedFile(value);
  const key = await deriveEncryptionKey(passphrase, parsed.salt);
  const algorithm: AesGcmParams = { name: "AES-GCM", iv: toBuffer(parsed.nonce), tagLength: 128 };
  if (!parsed.legacy) algorithm.additionalData = toBuffer(AAD);
  const plaintext = await crypto.subtle.decrypt(algorithm, key, toBuffer(parsed.ciphertext));
  const entries: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!Array.isArray(entries)) throw new Error("El respaldo no contiene una lista de credenciales.");
  const normalized = normalizeCredentials(entries);
  const backup = parsed.legacy ? await encryptEntries(normalized, key, parsed.salt) : parsed.backup as EncryptedBackup;
  return { backup, key, entries: normalized };
}

function parseEncryptedFile(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("El archivo no es un respaldo válido de Clave.");
  const source = value as Record<string, unknown>;
  const legacy = source.format === "clave-encrypted-v1";
  if (legacy) {
    if (typeof source.vaultSalt !== "string" || typeof source.nonce !== "string" || typeof source.ciphertext !== "string") throw new Error("El respaldo anterior está incompleto.");
  } else {
    const kdf = source.kdf as Partial<typeof KDF> | undefined;
    if (source.format !== FORMAT || source.version !== 2 || !kdf || kdf.name !== KDF.name || kdf.memorySize !== KDF.memorySize || kdf.iterations !== KDF.iterations || kdf.parallelism !== KDF.parallelism || kdf.hashLength !== KDF.hashLength) throw new Error("Formato de respaldo no compatible.");
    if (typeof source.salt !== "string" || typeof source.nonce !== "string" || typeof source.ciphertext !== "string") throw new Error("El respaldo está incompleto.");
  }
  const saltText = (legacy ? source.vaultSalt : source.salt) as string;
  const salt = decodeBase64(saltText), nonce = decodeBase64(source.nonce as string), ciphertext = decodeBase64(source.ciphertext as string);
  if (salt.length !== 16 || nonce.length !== 12 || ciphertext.length < 16 || ciphertext.length > 8_000_000) throw new Error("El respaldo tiene un tamaño o formato no válido.");
  return { backup: legacy ? null : source as unknown as EncryptedBackup, legacy, salt: saltText, nonce, ciphertext };
}

export function validateBackup(value: unknown): EncryptedBackup { const parsed = parseEncryptedFile(value); if (parsed.legacy || !parsed.backup) throw new Error("El respaldo debe actualizarse antes de guardarlo localmente."); return parsed.backup; }

export function normalizeCredentials(value: unknown): Credential[] {
  if (!Array.isArray(value)) throw new Error("El archivo no contiene una lista de credenciales.");
  return value.map((entry) => {
    const item = entry && typeof entry === "object" ? entry as Partial<Credential> : {};
    const date = typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)) ? new Date(item.updatedAt).toISOString() : new Date().toISOString();
    return {
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      title: typeof item.title === "string" ? item.title : "",
      username: typeof item.username === "string" ? item.username : "",
      password: typeof item.password === "string" ? item.password : "",
      url: typeof item.url === "string" ? item.url : "",
      category: typeof item.category === "string" && item.category ? item.category : "Personal",
      notes: typeof item.notes === "string" ? item.notes : "",
      favorite: Boolean(item.favorite),
      updatedAt: date
    };
  });
}
