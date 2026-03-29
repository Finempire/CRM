import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import type { UserRole, MaterialStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const request = await prisma.materialRequest.findUnique({
    where: { id },
    include: {
      order: { include: { buyer: true } },
      lines: { include: { bomItem: true } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const materialRequest = await prisma.materialRequest.findUnique({ where: { id }, include: { order: true } });
  if (!materialRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, notes } = body;

  const updated = await prisma.materialRequest.update({
    where: { id },
    data: {
      ...(status !== undefined && { status: status as MaterialStatus }),
      ...(notes !== undefined && { notes }),
    },
  });

  // When material is READY, notify production manager
  if (status === "READY" && materialRequest.order.productionManagerId) {
    await sendNotification({
      userId: materialRequest.order.productionManagerId,
      type: "MATERIAL_READY",
      title: "Material Ready",
      message: `All materials for order ${materialRequest.order.orderNumber} are ready`,
      orderId: materialRequest.orderId,
      actionUrl: `/orders/${materialRequest.orderId}?tab=material`,
      priority: "HIGH",
    });
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "material_request",
    entityId: id,
    orderId: materialRequest.orderId,
    description: `Material request ${materialRequest.requestNumber} updated${status ? ` → ${status}` : ""}`,
  });

  return NextResponse.json({ materialRequest: updated });
}
