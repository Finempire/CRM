import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import type { UserRole, ShipmentStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      order: { include: { buyer: true, orderLines: true } },
      updates: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ shipment });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:shipments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const shipment = await prisma.shipment.findUnique({ where: { id } });
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    status, transporter, courierName, trackingNumber,
    cartonCount, grossWeight, netWeight, cbm,
    dispatchDate, expectedDeliveryDate, actualDeliveryDate,
    shippingCost, insuranceCost, fromAddress, toAddress, podUrl,
    notes, trackingNote, trackingLocation,
  } = body;

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      ...(status !== undefined && { status: status as ShipmentStatus }),
      ...(transporter !== undefined && { transporter }),
      ...(courierName !== undefined && { courierName }),
      ...(trackingNumber !== undefined && { trackingNumber }),
      ...(cartonCount !== undefined && { cartonCount: cartonCount ? parseInt(cartonCount) : null }),
      ...(grossWeight !== undefined && { grossWeight: grossWeight ? parseFloat(grossWeight) : null }),
      ...(netWeight !== undefined && { netWeight: netWeight ? parseFloat(netWeight) : null }),
      ...(cbm !== undefined && { cbm: cbm ? parseFloat(cbm) : null }),
      ...(dispatchDate !== undefined && { dispatchDate: dispatchDate ? new Date(dispatchDate) : null }),
      ...(expectedDeliveryDate !== undefined && { expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null }),
      ...(actualDeliveryDate !== undefined && { actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : null }),
      ...(shippingCost !== undefined && { shippingCost: shippingCost ? parseFloat(shippingCost) : null }),
      ...(insuranceCost !== undefined && { insuranceCost: insuranceCost ? parseFloat(insuranceCost) : null }),
      ...(fromAddress !== undefined && { fromAddress }),
      ...(toAddress !== undefined && { toAddress }),
      ...(podUrl !== undefined && { podUrl }),
      ...(notes !== undefined && { notes }),
    },
  });

  // Add tracking update if provided
  if (trackingNote || status) {
    await prisma.shipmentUpdate.create({
      data: {
        shipmentId: id,
        status: status || shipment.status,
        location: trackingLocation || null,
        note: trackingNote || `Status updated to ${status || shipment.status}`,
      },
    });
  }

  // When delivered, update order status to DELIVERY and notify accountant
  if (status === "DELIVERED") {
    await prisma.order.update({ where: { id: shipment.orderId }, data: { status: "DELIVERY", actualDeliveryDate: new Date() } });

    const accountants = await prisma.user.findMany({
      where: { role: { in: ["ACCOUNTANT", "ACCOUNTANT_ADMIN"] }, isActive: true },
    });
    for (const acc of accountants) {
      await sendNotification({
        userId: acc.id,
        type: "DELIVERY_CONFIRMED",
        title: "Order Delivered",
        message: `Shipment ${shipment.shipmentNumber} has been delivered. Please generate invoice.`,
        orderId: shipment.orderId,
        actionUrl: `/orders/${shipment.orderId}?tab=invoice`,
        priority: "HIGH",
      });
    }
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "shipment",
    entityId: id,
    orderId: shipment.orderId,
    description: `Shipment ${shipment.shipmentNumber} updated${status ? ` → ${status}` : ""}`,
  });

  return NextResponse.json({ shipment: updated });
}
