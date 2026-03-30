import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import type { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const body = await request.json();
  const {
    buyerId, type, shipmentDate, paymentTerms, taxMode, currency,
    merchandiserId, productionManagerId, notes, inquiryId,
    styleName, quantity, color, unit,
    orderLines, // array from multi-item inquiry conversion
  } = body;

  if (!buyerId || !styleName || !quantity) {
    return NextResponse.json({ error: "Buyer, style name, and quantity are required" }, { status: 400 });
  }

  const orderNumber = generateOrderNumber("ORD");

  // Build order lines: use provided array (multi-item) or fall back to single line
  const lines =
    Array.isArray(orderLines) && orderLines.length > 0
      ? orderLines.map((l: any) => ({
          styleName: l.styleName,
          description: l.description ?? null,
          quantity: parseInt(l.quantity, 10) || 1,
          unit: l.unit ?? "PCS",
        }))
      : [{ styleName, quantity: parseInt(quantity, 10), color: color || null, unit: unit ?? "PCS" }];

  const order = await prisma.order.create({
    data: {
      orderNumber,
      buyerId,
      type: type ?? "PRODUCTION",
      status: "REVIEW",
      createdById: session.user.id,
      shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
      paymentTerms: paymentTerms || null,
      taxMode: taxMode || null,
      currency: currency ?? "INR",
      merchandiserId: merchandiserId || null,
      productionManagerId: productionManagerId || null,
      notes: notes || null,
      inquiryId: inquiryId || null,
      orderLines: {
        create: lines,
      },
      statusHistory: {
        create: {
          toStatus: "REVIEW",
          changedById: session.user.id,
          note: "Order created",
        },
      },
    },
  });

  // If from inquiry, mark it as converted
  if (inquiryId) {
    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: "CONVERTED", convertedOrderId: order.id },
    });
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: (session.user as any).role as UserRole,
    action: "CREATED",
    entityType: "order",
    entityId: order.id,
    orderId: order.id,
    description: `Created order ${orderNumber}`,
  });

  // Notify assigned merchandiser
  if (merchandiserId) {
    await sendNotification({
      userId: merchandiserId,
      type: "ORDER_CREATED",
      title: "New Order Assigned",
      message: `Order ${orderNumber} has been assigned to you`,
      orderId: order.id,
      actionUrl: `/orders/${order.id}`,
      priority: "MEDIUM",
    });
  }

  return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to create order" }, { status: 500 });
  }
}
