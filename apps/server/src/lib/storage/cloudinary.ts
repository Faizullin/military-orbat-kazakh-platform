import { v2 as cloudinary } from "cloudinary";
import type { IStorageProvider, StorageUploadOptions, UploadResult } from "./types";
import { env } from "../env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const CloudinaryService: IStorageProvider = {
  async uploadFile(options: StorageUploadOptions): Promise<UploadResult> {
    const { file, type, access = "public" } = options;
    if (!file?.data) throw new Error("No file data provided");

    return new Promise((resolve, reject) => {
      const folderPath = `${env.UPLOAD_FOLDER_PREFIX}/${access.toLowerCase()}/${type}`;

      const stream = cloudinary.uploader.upload_stream(
        { folder: folderPath, resource_type: "auto", transformation: [{ quality: "auto", fetch_format: "auto" }] },
        (error, result) => {
          if (error || !result) return reject(new Error(error?.message || "Cloudinary upload failed"));
          resolve({
            url: result.secure_url,
            storageKey: result.public_id,
            storageBackend: "cloudinary",
            originalFilename: file.name,
            contentType: file.mimetype || `image/${result.format}`,
            fileSize: result.bytes,
            metadata: { public_id: result.public_id, resource_type: result.resource_type, format: result.format },
          });
        },
      );
      stream.end(file.data);
    });
  },

  async deleteFile(storageKey: string): Promise<boolean> {
    if (!storageKey) throw new Error("No storage key provided");
    const result = await cloudinary.uploader.destroy(storageKey);
    return result.result === "ok" || result.result === "not found";
  },
};
