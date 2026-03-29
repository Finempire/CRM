import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, getPublicUrl } from "./client";
import { randomUUID } from "crypto";
import path from "path";

export type UploadFolder =
  | "tech-packs"
  | "patterns"
  | "documents"
  | "avatars"
  | "misc";

/**
 * Generates a pre-signed PUT URL so the browser can upload directly to
 * Linode Object Storage without routing the file through Next.js.
 *
 * @param folder  - S3 "folder" prefix (e.g. "tech-packs")
 * @param fileName - Original filename (used to preserve extension)
 * @param contentType - MIME type of the file
 * @param expiresIn  - Seconds until the pre-signed URL expires (default 5 min)
 */
export async function createPresignedUploadUrl(
  folder: UploadFolder,
  fileName: string,
  contentType: string,
  expiresIn = 300
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const ext = path.extname(fileName);
  const key = `${folder}/${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = getPublicUrl(key);

  return { uploadUrl, key, publicUrl };
}

/**
 * Generates a short-lived GET pre-signed URL for a private object.
 * Use this for documents that should NOT be publicly accessible.
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Deletes an object from S3 by its key.
 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
