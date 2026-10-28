const DB_NAME = "rpg.host.images";
const DB_VERSION = 1;
const STORE = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open image store."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveSceneImageDataUrl(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Could not save the scene image."));
    };
    tx.objectStore(STORE).put(dataUrl, id);
  });
}

export async function readSceneImageDataUrl(id: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Could not read the scene image."));
    };
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => {
      db.close();
      const value = request.result;
      resolve(typeof value === "string" && value.length > 0 ? value : null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("Could not read the scene image."));
    };
  });
}

export function compressSceneImageDataUrl(dataUrl: string, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = image.width > maxWidth ? maxWidth / image.width : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    image.onerror = () => reject(new Error("The scene image could not be processed."));
    image.src = dataUrl;
  });
}

export function base64ToDataUrl(b64: string, mime = "image/png"): string {
  return `data:${mime};base64,${b64}`;
}
