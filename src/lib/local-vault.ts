import type { EncryptedBackup } from "@/lib/vault-crypto";

const DATABASE = "clave-local";
const STORE = "vault";
const RECORD_ID = "main";
const FALLBACK_KEY = "clave_vault_backup";

let memoryBackup: EncryptedBackup | null = null;

function hasLocalStorage(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Tiempo de espera agotado al abrir IndexedDB."));
      }
    }, 1200);

    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        try {
          request.result.createObjectStore(STORE, { keyPath: "id" });
        } catch {
          // Ya existe el almacén
        }
      };
      request.onsuccess = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(request.result);
        }
      };
      request.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("No se pudo abrir la base de datos IndexedDB."));
        }
      };
      request.onblocked = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("Base de datos bloqueada."));
        }
      };
    } catch (cause) {
      clearTimeout(timer);
      reject(cause);
    }
  });
}

export async function readLocalBackup(): Promise<EncryptedBackup | null> {
  try {
    const db = await openDatabase();
    return await new Promise<EncryptedBackup | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(RECORD_ID);
      request.onsuccess = () => {
        db.close();
        resolve((request.result?.backup as EncryptedBackup | undefined) ?? null);
      };
      request.onerror = () => {
        db.close();
        reject(new Error("No se pudo leer la bóveda local."));
      };
    });
  } catch {
    if (hasLocalStorage()) {
      try {
        const stored = window.localStorage.getItem(FALLBACK_KEY);
        if (stored) return JSON.parse(stored) as EncryptedBackup;
      } catch {
        // Fallback a memoria
      }
    }
    return memoryBackup;
  }
}

export async function writeLocalBackup(backup: EncryptedBackup): Promise<void> {
  memoryBackup = backup;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put({ id: RECORD_ID, backup });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(new Error("Error al escribir en IndexedDB."));
      };
      transaction.onabort = () => {
        db.close();
        reject(new Error("Transacción abortada."));
      };
    });
  } catch {
    // Si falla IndexedDB, se guarda en localStorage como respaldo
  }

  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(backup));
    } catch {
      // Ignorar si el almacenamiento local está restringido
    }
  }
}

export async function deleteLocalBackup(): Promise<void> {
  memoryBackup = null;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(RECORD_ID);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(new Error("Error al borrar en IndexedDB."));
      };
    });
  } catch {
    // Fallback silencioso
  }

  if (hasLocalStorage()) {
    try {
      window.localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // Ignorar si el almacenamiento local está restringido
    }
  }
}
