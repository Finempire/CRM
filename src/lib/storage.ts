/**
 * Unified storage abstraction.
 *
 * STORAGE_PROVIDER=local  → files saved to /public/uploads (dev only)
 * STORAGE_PROVIDER=s3     → pre-signed URLs via Linode Object Storage
 *
 * All API routes that need file URLs should call `getUploadUrl()` so
 * they stay provider-agnostic.
 */

import type { UploadFolder } from "./s3/upload";

export type StorageProvider = "local" | "s3";

export const storageProvider: StorageProvider =
  (process.env.STORAGE_PROVIDER as StorageProvider) ?? "local";

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Returns a pre-signed upload URL + the final public URL for the file.
 * In local mode, returns a stub pointing at /api/upload.
 */
export async function getUploadUrl(
  folder: UploadFolder,
  fileName: string,
  contentType: string
): Promise<PresignedUploadResult> {
  if (storageProvider === "s3") {
    const { createPresignedUploadUrl } = await import("./s3/upload");
    return createPresignedUploadUrl(folder, fileName, contentType);
  }

  // Local dev: client will POST to /api/upload with the file as FormData
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;
  return {
    uploadUrl: `/api/upload`,
    key,
    publicUrl: `/uploads/${key}`,
  };
}
