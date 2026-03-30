import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { sendNotification } from "@/lib/notifications";
import type { UserRole, ChangeRequestStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; crId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:orders")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: inquiryId, crId } = await params;
  const body = await req.json();
  const { status, resolutionNote } = body as { status: ChangeRequestStatus; resolutionNote?: string };

  if (!["APPLIED", "REJECTED", "IN_REVIEW"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const cr = await prisma.clientChangeRequest.findFirst({
    where: { id: crId, inquiryId },
    include: { inquiry: { select: { buyerName: true, inquiryNumber: true, clientToken: true } } },
  });

  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.clientChangeRequest.update({
    where: { id: crId },
    data: {
      status,
      resolutionNote: resolutionNote || null,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    },
  });

  // If applied and there's a new shipment date + converted order, update order
  if (status === "APPLIED" && cr.newShipmentDate && cr.orderId) {
    await prisma.order.update({
      where: { id: cr.orderId },
      data: { shipmentDate: cr.newShipmentDate },
    });
  }

  // If applied and there are item quantity changes + a converted order, update order lines
  if (status === "APPLIED" && cr.requestedItems && cr.orderId) {
    const items = cr.requestedItems as any[];
    for (const item of items) {
      if (item.quantity) {
        await prisma.orderLine.updateMany({
          where: { orderId: cr.orderId, styleName: { contains: item.itemName, mode: "insensitive" } },
          data: { quantity: parseInt(item.quantity) },
        });
      }
    }
  }

  return NextResponse.json({ changeRequest: updated });
}
