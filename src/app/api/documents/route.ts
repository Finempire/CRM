import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole, DocumentCategory } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const category = searchParams.get("category") as DocumentCategory | null;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");

  const where: any = {
    deletedAt: null,
    ...(orderId ? { orderId } : {}),
    ...(category ? { category } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, buyer: { select: { name: true } } } },
        uploadedBy: { select: { name: true } },
        versions: { select: { id: true, version: true, uploadedAt: true } },
      },
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({ documents, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:documents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, category, title, description, fileName, fileUrl, fileType, fileSize, tags, approvalStatus, buyerId, styleName } = body;

  if (!orderId || !category || !title || !fileName || !fileUrl) {
    return NextResponse.json({ error: "orderId, category, title, fileName, and fileUrl are required" }, { status: 400 });
  }

  // Check if document with same title+category+orderId exists → create new version instead
  const existing = await prisma.document.findFirst({
    where: { orderId, category, title, deletedAt: null },
    include: { versions: true },
  });

  if (existing) {
    const newVersion = existing.currentVersion + 1;
    // Archive current version
    await prisma.documentVersion.create({
      data: {
        documentId: existing.id,
        version: existing.currentVersion,
        fileName: existing.fileName,
        fileUrl: existing.fileUrl,
        fileType: existing.fileType || null,
        fileSize: existing.fileSize || null,
        uploadedById: existing.uploadedById,
        uploadedAt: existing.uploadedAt,
      },
    });
    // Update document with new file
    const updated = await prisma.document.update({
      where: { id: existing.id },
      data: {
        fileName,
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize ? parseInt(fileSize) : null,
        currentVersion: newVersion,
        uploadedAt: new Date(),
        uploadedById: session.user.id,
      },
    });
    return NextResponse.json({ document: updated, isNewVersion: true, version: newVersion });
  }

  const document = await prisma.document.create({
    data: {
      orderId,
      category: category as DocumentCategory,
      title,
      description: description || null,
      fileName,
      fileUrl,
      fileType: fileType || null,
      fileSize: fileSize ? parseInt(fileSize) : null,
      tags: tags || [],
      approvalStatus: approvalStatus || "PENDING",
      currentVersion: 1,
      uploadedById: session.user.id,
      buyerId: buyerId || null,
      styleName: styleName || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPLOADED",
    entityType: "document",
    entityId: document.id,
    orderId,
    description: `Document "${title}" uploaded (${category})`,
  });

  return NextResponse.json({ document }, { status: 201 });
}
