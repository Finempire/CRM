import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const role = (session.user as any).role as UserRole;

  const where: any = {
    order: { deletedAt: null },
    ...(orderId ? { orderId } : {}),
    ...(role === "MERCHANDISER" ? { order: { merchandiserId: session.user.id } } : {}),
  };

  const patterns = await prisma.pattern.findMany({
    where,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      files: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ patterns });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "upload:tech_pack")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, name, version, size, grainLine, notes } = body;

  if (!orderId || !name) return NextResponse.json({ error: "orderId and name are required" }, { status: 400 });

  const pattern = await prisma.pattern.create({
    data: {
      orderId,
      name,
      version: version || "v1",
      size: size || null,
      grainLine: grainLine || null,
      notes: notes || null,
      approvalStatus: "PENDING",
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPLOADED",
    entityType: "pattern",
    entityId: pattern.id,
    orderId,
    description: `Pattern "${name}" created`,
  });

  return NextResponse.json({ pattern }, { status: 201 });
}
