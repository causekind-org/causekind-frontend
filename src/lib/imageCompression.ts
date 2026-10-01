// Long edge to downscale to. Larger than the in-app camera's 1280 (see
// CameraCaptureDialog) because these are identity/address documents that the
// backend screeners have to read text off — losing that detail fails screening.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
// Stay comfortably under spring.servlet.multipart.max-file-size (10MB). Files
// under this go up untouched; a 3MB photo is not what causes the 413.
const SKIP_IF_UNDER_BYTES = 3 * 1024 * 1024;

/**
 * One rung of the shrink ladder: a long-edge cap and a JPEG quality to try.
 *
 * Quality is spent before resolution on purpose. Dropping JPEG quality from 0.8
 * to 0.6 is close to invisible on a photograph of an object, while halving the
 * long edge is not — and for a listing photo the whole point is that a donee can
 * see what the thing looks like.
 */
const SHRINK_LADDER: ReadonlyArray<{ dimension: number; quality: number }> = [
  { dimension: 1920, quality: 0.8 },
  { dimension: 1920, quality: 0.65 },
  { dimension: 1600, quality: 0.6 },
  { dimension: 1280, quality: 0.6 },
  { dimension: 1280, quality: 0.45 },
];

export interface CompressOptions {
  /** Long edge, in pixels, for the single-pass mode. Ignored when `targetBytes` is set. */
  maxDimension?: number;
  /** JPEG quality for the single-pass mode. Ignored when `targetBytes` is set. */
  quality?: number;
  /** Files at or under this size are returned untouched. */
  skipIfUnderBytes?: number;
  /**
   * Opt into the ladder: keep re-encoding until the result fits in this many
   * bytes. Without it the function makes exactly one pass, which is the original
   * behaviour and what the document uploads rely on.
   */
  targetBytes?: number;
}

/** Draws a bitmap to a canvas at `dimension` long edge and encodes it as JPEG. */
async function encodeAt(
  bitmap: ImageBitmap,
  dimension: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

function asJpegFile(blob: Blob, originalName: string): File {
  const newName = originalName.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

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
 *
 * With `targetBytes`, it walks SHRINK_LADDER until the result fits, and returns
 * the smallest encoding it managed even if nothing got under the target — a
 * smaller file is still a better upload than the original. See
 * `compressDisplayPhoto` for the listing, offer and task callers.
 */
export async function compressImageIfNeeded(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxDimension = MAX_DIMENSION,
    quality = JPEG_QUALITY,
    skipIfUnderBytes = SKIP_IF_UNDER_BYTES,
    targetBytes,
  } = options;

  // A PDF can't be shrunk on a canvas, and small images don't need it.
  if (!file.type.startsWith("image/") || file.size <= skipIfUnderBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    if (targetBytes === undefined) {
      const blob = await encodeAt(bitmap, maxDimension, quality);
      // Re-encoding an already-optimised image can make it bigger — keep the smaller one.
      if (!blob || blob.size >= file.size) return file;
      return asJpegFile(blob, file.name);
    }

    let best: Blob | null = null;
    for (const rung of SHRINK_LADDER) {
      const blob = await encodeAt(bitmap, rung.dimension, rung.quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) break;
    }

    // Nothing beat the original (already-optimised input), so leave it alone.
    if (!best || best.size >= file.size) return file;
    return asJpegFile(best, file.name);
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** Browsed photos are shrunk to roughly this before they leave the browser. */
export const DISPLAY_PHOTO_TARGET_BYTES = 1024 * 1024;

/**
 * Shrinks a photo people browse — a listing photo, an offer photo, a task
 * attachment — to about 1MB before upload.
 *
 * Donors pick straight out of the phone gallery, where a single shot is commonly
 * 5-12MB and a modern phone can produce far more. Those uploads were being
 * refused by nginx with a bare 413 — no body, and no CORS header, so the browser
 * reported a misleading CORS failure and the wizard showed the photo as needing
 * review when in fact the server had never received it.
 *
 * Raising the server's ceiling alone would have fixed the error without fixing
 * the experience: a donee on mobile data should not be made to push 12MB to list
 * one item. So the browser shrinks first and the ceiling is only a backstop.
 *
 * Deliberately NOT used for documents and selfies. Their screeners read text and
 * faces off the image, and this ladder's bottom rungs reach 1280px at quality
 * 0.45 — enough to fail a legitimate donee's ID. Those paths keep the gentler
 * single-pass `compressImageIfNeeded`.
 *
 * The 1MB target is not a limit — nothing rejects a file for missing it. It is
 * what the ladder aims at, and an image that cannot be decoded here (HEIC on
 * most non-Safari browsers) passes through untouched to be judged by the server.
 */
export function compressDisplayPhoto(file: File): Promise<File> {
  return compressImageIfNeeded(file, {
    targetBytes: DISPLAY_PHOTO_TARGET_BYTES,
    skipIfUnderBytes: DISPLAY_PHOTO_TARGET_BYTES,
  });
}
