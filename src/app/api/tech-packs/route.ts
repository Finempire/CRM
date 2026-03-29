import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");

  const where: any = {
    order: { deletedAt: null },
    ...(orderId ? { orderId } : {}),
    ...(status ? { approvalStatus: status } : {}),
    ...(role === "MERCHANDISER" ? { order: { merchandiserId: session.user.id } } : {}),
  };

  const techPacks = await prisma.techPack.findMany({
    where,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      style: { select: { name: true } },
      files: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ techPacks });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "upload:tech_pack")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, styleId, title, version, buyerComments, fitComments, notes } = body;

  if (!orderId || !title) {
    return NextResponse.json({ error: "orderId and title are required" }, { status: 400 });
  }

  const techPack = await prisma.techPack.create({
    data: {
      orderId,
      styleId: styleId || null,
      title,
      version: version || "v1",
      approvalStatus: "PENDING",
      buyerComments: buyerComments || null,
      fitComments: fitComments || null,
      notes: notes || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPLOADED",
    entityType: "tech_pack",
    entityId: techPack.id,
    orderId,
    description: `Tech pack "${title}" created`,
  });

  return NextResponse.json({ techPack }, { status: 201 });
}
