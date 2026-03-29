import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FINANCE_ROLES } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role as UserRole;
  if (!FINANCE_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const {
    fabricCost = 0, trimmingsCost = 0, accessoriesCost = 0, packagingCost = 0,
    cuttingCost = 0, stitchingCost = 0, finishingCost = 0,
    printingCost = 0, embroideryCost = 0, washingCost = 0, otherJobWorkCost = 0,
    overheadCost = 0, shippingCost = 0, sellingRate = 0, notes,
  } = body;

  const totalCost = [
    fabricCost, trimmingsCost, accessoriesCost, packagingCost,
    cuttingCost, stitchingCost, finishingCost,
    printingCost, embroideryCost, washingCost, otherJobWorkCost,
    overheadCost, shippingCost,
  ].reduce((a, b) => a + Number(b), 0);

  // Get order lines to calculate total qty
  const costing = await prisma.costing.findUnique({
    where: { id },
    include: { order: { include: { orderLines: true } } },
  });
  if (!costing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalQty = costing.order.orderLines.reduce((a, l) => a + l.quantity, 0);
  const totalRevenue = Number(sellingRate) * totalQty;
  const grossMargin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  const updated = await prisma.costing.update({
    where: { id },
    data: {
      fabricCost, trimmingsCost, accessoriesCost, packagingCost,
      cuttingCost, stitchingCost, finishingCost,
      printingCost, embroideryCost, washingCost, otherJobWorkCost,
      overheadCost, shippingCost,
      sellingRate, totalCost, totalRevenue, grossMargin, marginPercent,
      notes: notes ?? null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "costing",
    entityId: id,
    orderId: costing.orderId,
    description: `Updated costing for order ${costing.order.orderNumber}`,
  });

  return NextResponse.json({ costing: updated });
}
