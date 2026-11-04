import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { imageSize } from "image-size";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["jpg", "png", "webp", "avif"]);

export type ImageValidationResult =
  | { ok: true; buffer: Buffer; ext: string; width: number; height: number }
  | { ok: false; error: string };

/**
 * Validates an uploaded image by its real content, not its filename/MIME
 * header (a renamed .exe must not pass). Checked before ever touching
 * Cloudinary: size limit, magic-byte type sniff, then a real decode of the
 * dimensions to catch corrupt/non-image buffers.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image size must not exceed 2 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_IMAGE_TYPES.has(detected.ext)) {
    return { ok: false, error: "Only JPG, PNG, WEBP, and AVIF images are allowed." };
  }

  try {
    const { width, height } = imageSize(buffer);
    if (!width || !height) {
      return { ok: false, error: "The uploaded file is not a valid image." };
    }
    return { ok: true, buffer, ext: detected.ext, width, height };
  } catch {
    return { ok: false, error: "The uploaded file is not a valid image." };
  }
}
