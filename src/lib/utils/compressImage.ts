/**
 * Compresse une image côté navigateur pour qu'elle tienne dans un document
 * Firestore (limite 1 Mo par document) : redimensionnement + JPEG en data-URL.
 */
export async function compressImage(
  file: File,
  maxDim = 1200,
  maxChars = 250_000
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Image illisible"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // On baisse la qualité jusqu'à passer sous la limite
  for (const quality of [0.8, 0.65, 0.5, 0.35, 0.25]) {
    const out = canvas.toDataURL("image/jpeg", quality);
    if (out.length <= maxChars) return out;
  }
  throw new Error("Image trop lourde, même compressée — choisis une image plus petite.");
}
