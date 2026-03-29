import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import { generateOrderNumber } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    ...(orderId ? { orderId } : {}),
    ...(status ? { status } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.materialRequest.findMany({
      where,
      include: {
        order: { include: { buyer: { select: { name: true } } } },
        lines: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.materialRequest.count({ where }),
  ]);

  return NextResponse.json({ requests, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, notes, lines } = body;

  if (!orderId || !lines?.length) {
    return NextResponse.json({ error: "orderId and lines are required" }, { status: 400 });
  }

  const requestNumber = generateOrderNumber("MR");

  const materialRequest = await prisma.materialRequest.create({
    data: {
      requestNumber,
      orderId,
      requestedById: session.user.id,
      status: "PENDING",
      notes: notes || null,
      lines: {
        create: lines.map((l: any) => ({
          itemName: l.itemName,
          category: l.category || null,
          requiredQty: parseFloat(l.requiredQty),
          unit: l.unit,
          availableQty: parseFloat(l.availableQty || "0"),
          shortageQty: parseFloat(l.shortageQty || "0"),
          status: "PENDING",
          notes: l.notes || null,
          bomItemId: l.bomItemId || null,
        })),
      },
    },
    include: { lines: true },
  });

  // Notify store manager
  const storeManagers = await prisma.user.findMany({ where: { role: "STORE_MANAGER", isActive: true } });
  for (const sm of storeManagers) {
    await sendNotification({
      userId: sm.id,
      type: "APPROVAL_REQUIRED",
      title: "New Material Request",
      message: `Material request ${requestNumber} requires review`,
      orderId,
      actionUrl: `/material-requests`,
      priority: "MEDIUM",
    });
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "material_request",
    entityId: materialRequest.id,
    orderId,
    description: `Material request ${requestNumber} created`,
  });

  return NextResponse.json({ materialRequest }, { status: 201 });
}
