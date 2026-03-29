import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.S3_ENDPOINT || !process.env.S3_REGION || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
  if (process.env.STORAGE_PROVIDER === "s3") {
    throw new Error("Missing required S3 environment variables: S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY");
  }
}

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  // Required for Linode Object Storage (path-style URLs)
  forcePathStyle: false,
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME ?? "threadflow-production-assets";

/**
 * Returns the public base URL for a stored object.
 * For Linode: https://<bucket>.<region>.linodeobjects.com/<key>
 * Can be overridden with S3_PUBLIC_URL for CDN/custom domain.
 */
export function getPublicUrl(key: string): string {
  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  // Linode virtual-hosted style: bucket.region.linodeobjects.com
  const endpoint = process.env.S3_ENDPOINT ?? "";
  const bucket = S3_BUCKET;
  if (endpoint.includes("linodeobjects.com")) {
    const region = endpoint.replace("https://", "").replace("http://", "");
    return `https://${bucket}.${region}/${key}`;
  }
  return `${endpoint}/${bucket}/${key}`;
}
