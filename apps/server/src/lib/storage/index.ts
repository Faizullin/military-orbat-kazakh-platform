import { env } from "../env";
import { CloudinaryService } from "./cloudinary";
import type { IStorageProvider, StorageProviderType } from "./types";
import { VercelBlobService } from "./vercel-blob";

export type { IStorageProvider, StorageFile, StorageProviderType, StorageUploadOptions, UploadResult } from "./types";

export function getStorageProvider(providerName?: StorageProviderType): IStorageProvider {
  const provider = providerName || env.STORAGE_PROVIDER;

  switch (provider) {
    case "cloudinary":
      return CloudinaryService;
    case "vercel":
      return VercelBlobService;
    default:
      throw new Error(`Unknown storage provider: ${provider}. Use "cloudinary" or "vercel".`);
  }
}
