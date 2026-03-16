// src/lib/uploadProductImage.ts
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompress";

const BUCKET = "product-images";

function getExt(file: File) {
  const n = (file.name || "").toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (n.endsWith(".webp")) return "webp";
  return "webp";
}

function safeUUID() {
  const c: any = crypto as any;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadProductImage(
  file: File,
  farmerId: string
): Promise<{ publicUrl: string; path: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file (png/jpg/webp).");
  }

  // ✅ compress image (recommended)
  const compressed = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
  });

  const ext = getExt(compressed);
  const path = `${farmerId}/${safeUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      upsert: true,
      contentType: compressed.type,
      cacheControl: "3600",
    });

  if (uploadError) throw uploadError;

  // ✅ Bucket should be PUBLIC for this to work
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/** Optional helpers (not required) */
export async function deleteProductImageByPath(path: string) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function publicUrlToPath(publicUrl: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}