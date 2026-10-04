/** Narrow bridge exposed only by the offline Android container. */
declare global {
  interface Window {
    DinoGroveAndroid?: {
      savePhoto(base64Png: string, filename: string, requestId: string): void;
      setImmersive?(enabled: boolean): void;
    };
  }
}

export function hasAndroidPhotoSave(): boolean {
  return typeof window.DinoGroveAndroid?.savePhoto === "function";
}

export async function saveAndroidPhoto(blob: Blob, filename: string): Promise<void> {
  const bridge = window.DinoGroveAndroid;
  if (!bridge || blob.type !== "image/png" || blob.size > 8 * 1024 * 1024) throw new Error("invalid-photo");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
  await new Promise<void>((resolve, reject) => {
    const id = crypto.randomUUID();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      window.removeEventListener("dino-grove-photo-result", onResult);
      if (error) reject(error); else resolve();
    };
    const onResult = (event: Event) => {
      const result = (event as CustomEvent<{ id: string; success: boolean }>).detail;
      if (result?.id === id) finish(result.success ? undefined : new Error("save-failed"));
    };
    const timer = window.setTimeout(() => finish(new Error("save-timeout")), 15000);
    window.addEventListener("dino-grove-photo-result", onResult);
    try { bridge.savePhoto(base64, filename, id); }
    catch { finish(new Error("bridge-failed")); }
  });
}
