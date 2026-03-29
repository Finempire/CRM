import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
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

  const milestones = await prisma.tnaMilestone.findMany({
    where,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      updates: { take: 3, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { plannedDate: "asc" },
  });

  return NextResponse.json({ milestones });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:tna")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, name, description, plannedDate, responsibleRole } = body;

  if (!orderId || !name || !plannedDate) {
    return NextResponse.json({ error: "orderId, name, and plannedDate are required" }, { status: 400 });
  }

  const milestone = await prisma.tnaMilestone.create({
    data: {
      orderId,
      name,
      description: description || null,
      plannedDate: new Date(plannedDate),
      status: "PENDING",
      responsibleRole: responsibleRole || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "tna_milestone",
    entityId: milestone.id,
    orderId,
    description: `TNA milestone "${name}" created`,
  });

  return NextResponse.json({ milestone }, { status: 201 });
}
