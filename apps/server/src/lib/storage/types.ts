export interface StorageFile {
  name: string;
  data: Buffer;
  mimetype: string;
  size: number;
}

export interface StorageUploadOptions {
  file: StorageFile;
  userId: string;
  type: string; // "thumbnails" | "attachments"
  access?: string;
}

export interface UploadResult {
  url: string;
  storageKey: string;
  storageBackend: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  metadata?: Record<string, unknown>;
}

export interface IStorageProvider {
  uploadFile(options: StorageUploadOptions): Promise<UploadResult>;
  deleteFile(storageKey: string): Promise<boolean>;
}

export type StorageProviderType = "cloudinary" | "vercel" | "local";
