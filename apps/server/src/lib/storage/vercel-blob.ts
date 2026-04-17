import { put, del } from "@vercel/blob";
import type { IStorageProvider, StorageUploadOptions, UploadResult } from "./types";
import { env } from "../env";

export const VercelBlobService: IStorageProvider = {
  async uploadFile(options: StorageUploadOptions): Promise<UploadResult> {
    const { file, type } = options;
    if (!file?.data) throw new Error("No file data provided");

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blobPath = `${env.UPLOAD_FOLDER_PREFIX}/${type}/${filename}`;

    const blob = await put(blobPath, file.data, {
      access: "public",
      contentType: file.mimetype,
      token: env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      storageKey: blob.url,
      storageBackend: "vercel",
      originalFilename: file.name,
      contentType: file.mimetype,
      fileSize: file.size,
      metadata: { pathname: blob.pathname, downloadUrl: blob.downloadUrl },
    };
  },

  async deleteFile(url: string): Promise<boolean> {
    if (!url) throw new Error("No URL provided for deletion");
    await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
    return true;
  },
};
