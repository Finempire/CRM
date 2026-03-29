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

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        order: { include: { buyer: { select: { name: true } } } },
        updates: { take: 1, orderBy: { updatedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.shipment.count({ where }),
  ]);

  return NextResponse.json({ shipments, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:shipments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    orderId, transporter, courierName, trackingNumber,
    cartonCount, grossWeight, netWeight, cbm,
    dispatchDate, expectedDeliveryDate,
    shippingCost, insuranceCost,
    fromAddress, toAddress, notes,
  } = body;

  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const shipmentNumber = generateOrderNumber("SHP");

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber,
      orderId,
      status: "DRAFT",
      transporter: transporter || null,
      courierName: courierName || null,
      trackingNumber: trackingNumber || null,
      cartonCount: cartonCount ? parseInt(cartonCount) : null,
      grossWeight: grossWeight ? parseFloat(grossWeight) : null,
      netWeight: netWeight ? parseFloat(netWeight) : null,
      cbm: cbm ? parseFloat(cbm) : null,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      shippingCost: shippingCost ? parseFloat(shippingCost) : null,
      insuranceCost: insuranceCost ? parseFloat(insuranceCost) : null,
      fromAddress: fromAddress || null,
      toAddress: toAddress || null,
      notes: notes || null,
    },
  });

  // Update order to LOGISTICS stage
  await prisma.order.update({ where: { id: orderId }, data: { status: "LOGISTICS" } });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "shipment",
    entityId: shipment.id,
    orderId,
    description: `Shipment ${shipmentNumber} created`,
  });

  return NextResponse.json({ shipment }, { status: 201 });
}
