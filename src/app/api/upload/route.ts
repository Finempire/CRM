import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storageProvider } from "@/lib/storage";
import type { UploadFolder } from "@/lib/s3/upload";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "application/zip",
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * GET /api/upload?folder=documents&fileName=spec.pdf&contentType=application/pdf
 *
 * Returns a pre-signed PUT URL (S3 mode) or a local upload stub.
 * The client should PUT the file directly to `uploadUrl` (S3) or POST
 * FormData to `/api/upload` (local).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folder = (searchParams.get("folder") ?? "misc") as UploadFolder;
  const fileName = searchParams.get("fileName");
  const contentType = searchParams.get("contentType");

  if (!fileName || !contentType) {
    return NextResponse.json(
      { error: "fileName and contentType are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const validFolders: UploadFolder[] = [
    "tech-packs",
    "patterns",
    "documents",
    "avatars",
    "misc",
  ];
  if (!validFolders.includes(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  if (storageProvider === "s3") {
    const { createPresignedUploadUrl } = await import("@/lib/s3/upload");
    const result = await createPresignedUploadUrl(folder, fileName, contentType);
    return NextResponse.json(result);
  }

  // Local mode: return a placeholder; client POSTs FormData to /api/upload
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;
  return NextResponse.json({
    uploadUrl: `/api/upload`,
    key,
    publicUrl: `/uploads/${key}`,
    method: "POST", // caller must POST FormData
  });
}

/**
 * POST /api/upload  (local dev only)
 *
 * Accepts a FormData body with `file` (File) and `folder` (string).
 * Saves to /public/uploads/<folder>/<filename> and returns the public URL.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (storageProvider === "s3") {
    return NextResponse.json(
      { error: "Direct upload not supported in S3 mode; use the pre-signed URL from GET /api/upload" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as UploadFolder | null) ?? "misc";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(process.cwd(), "public", "uploads", key), buffer);

  return NextResponse.json({
    key,
    publicUrl: `/uploads/${key}`,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  });
}
