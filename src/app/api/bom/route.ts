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

  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const bomItems = await prisma.bomItem.findMany({
    where: { orderId },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: [{ category: "asc" }, { itemName: "asc" }],
  });

  return NextResponse.json({ bomItems });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:bom")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    orderId, orderLineId, category, itemName, description, specification,
    color, requiredQty, unit, wastagePercent, vendorId, estimatedRate, notes, isJobWork,
  } = body;

  if (!orderId || !category || !itemName || !requiredQty || !unit) {
    return NextResponse.json({ error: "orderId, category, itemName, requiredQty, and unit are required" }, { status: 400 });
  }

  const waste = parseFloat(wastagePercent || "5");
  const reqQty = parseFloat(requiredQty);
  const netRequiredQty = reqQty * (1 + waste / 100);
  const rate = estimatedRate ? parseFloat(estimatedRate) : null;

  const bomItem = await prisma.bomItem.create({
    data: {
      orderId,
      orderLineId: orderLineId || null,
      category,
      itemName,
      description: description || null,
      specification: specification || null,
      color: color || null,
      requiredQty: reqQty,
      unit,
      wastagePercent: waste,
      netRequiredQty,
      vendorId: vendorId || null,
      estimatedRate: rate,
      estimatedAmount: rate ? netRequiredQty * rate : null,
      notes: notes || null,
      isJobWork: isJobWork || false,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "bom_item",
    entityId: bomItem.id,
    orderId,
    description: `BOM item "${itemName}" added`,
  });

  return NextResponse.json({ bomItem }, { status: 201 });
}
