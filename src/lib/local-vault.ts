import type { EncryptedBackup } from "@/lib/vault-crypto";

const DATABASE = "clave-local";
const STORE = "vault";
const RECORD_ID = "main";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador no permite almacenamiento local seguro."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("No se pudo abrir la bóveda local."));
  });
}

export async function readLocalBackup(): Promise<EncryptedBackup | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(RECORD_ID);
    request.onsuccess = () => { db.close(); resolve((request.result?.backup as EncryptedBackup | undefined) ?? null); };
    request.onerror = () => { db.close(); reject(new Error("No se pudo leer la bóveda local.")); };
  });
}

export async function writeLocalBackup(backup: EncryptedBackup): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put({ id: RECORD_ID, backup });
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(new Error("No se pudo guardar la bóveda en este dispositivo.")); };
    transaction.onabort = () => { db.close(); reject(new Error("Se canceló el guardado de la bóveda local.")); };
  });
}

export async function deleteLocalBackup(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(RECORD_ID);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(new Error("No se pudo eliminar la bóveda local.")); };
  });
}
