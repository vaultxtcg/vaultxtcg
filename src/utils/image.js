import { supabase } from "../lib/supabase";
import { BUCKET_NAME } from "./helpers";

export function compressImage(file, maxWidth = 1200, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^.]+$/, "");
            resolve(
              new File([blob], `${cleanName}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(cardId, file, side, showToast) {
  if (!file) return null;

  const compressedFile = await compressImage(file);
  const safeFileName = compressedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${cardId}-${side}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, compressedFile, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    showToast(error.message, "error");
    return null;
  }
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}
