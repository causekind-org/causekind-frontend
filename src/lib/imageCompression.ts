// Long edge to downscale to. Larger than the in-app camera's 1280 (see
// CameraCaptureDialog) because these are identity/address documents that the
// backend screeners have to read text off — losing that detail fails screening.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
// Stay comfortably under spring.servlet.multipart.max-file-size (10MB). Files
// under this go up untouched; a 3MB photo is not what causes the 413.
const SKIP_IF_UNDER_BYTES = 3 * 1024 * 1024;

/**
 * Resizes and re-encodes large photos in-browser before upload so they fit under
 * the server's per-file multipart limit.
 *
 * This covers the file-picker path only — photos taken through CameraCaptureDialog
 * are already downscaled at capture. Picking an existing shot out of the phone's
 * gallery is what routinely exceeds 10MB.
 *
 * Never throws: any failure returns the original file, so an unsupported format
 * (HEIC, which createImageBitmap rejects in most browsers) still gets its upload
 * attempt rather than being blocked here. If it is genuinely too big the server
 * 413s and uploadVerificationDocument turns that into a message the user can act on.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // A PDF can't be shrunk on a canvas, and small images don't need it.
  if (!file.type.startsWith("image/") || file.size <= SKIP_IF_UNDER_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    // Re-encoding an already-optimised image can make it bigger — keep the smaller one.
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
