import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
};

/**
 * Uploads a file buffer to Cloudinary under a folder namespaced by `website/`.
 * Callers must validate file type/size and the caller's permission before invoking this.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder: string; filename?: string }
): Promise<CloudinaryUploadResult> {
  const result = await new Promise<import("cloudinary").UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `fysit/${options.folder}`,
        public_id: options.filename,
        resource_type: "auto",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(uploadResult);
      }
    );
    uploadStream.end(buffer);
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType: result.resource_type,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
