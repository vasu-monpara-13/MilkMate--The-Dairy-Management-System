// src/lib/imageCompress.ts
export async function compressImage(
  file: File,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<File> {
  const maxWidth = opts?.maxWidth ?? 1200;
  const maxHeight = opts?.maxHeight ?? 1200;
  const quality = opts?.quality ?? 0.8;

  if (!file.type.startsWith("image/")) return file;

  const img = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    let { width, height } = img;

    // Keep aspect ratio
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    // Prefer webp if supported by the browser
    const outType = "image/webp";
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), outType, quality)
    );

    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([blob], newName, { type: outType });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}