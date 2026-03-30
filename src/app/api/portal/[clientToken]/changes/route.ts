import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientToken: string }> }
) {
  const { clientToken } = await params;

  // Validate the client token
  const inquiry = await prisma.inquiry.findUnique({
    where: { clientToken },
    select: {
      id: true,
      inquiryNumber: true,
      buyerName: true,
      status: true,
      convertedOrderId: true,
    },
  });

  if (!inquiry) {
    return NextResponse.json({ error: "Invalid portal link" }, { status: 404 });
  }
  if (inquiry.status === "REJECTED") {
    return NextResponse.json({ error: "This inquiry has been rejected" }, { status: 400 });
  }

  const body = await req.json();
  const { message, newShipmentDate, requestedItems } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const changeRequest = await prisma.clientChangeRequest.create({
    data: {
      inquiryId: inquiry.id,
      orderId: inquiry.convertedOrderId ?? null,
      clientName: inquiry.buyerName,
      message: message.trim(),
      newShipmentDate: newShipmentDate ? new Date(newShipmentDate) : null,
      requestedItems: requestedItems ?? null,
      status: "PENDING",
    },
  });

  // Notify accountant, admin, and merchandiser immediately
  await broadcastNotification({
    roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS", "MERCHANDISER"],
    type: "ORDER_UPDATE",
    priority: "HIGH",
    title: `Change Request: ${inquiry.inquiryNumber}`,
    message: `${inquiry.buyerName} requested changes — "${message.trim().substring(0, 80)}"`,
    referenceId: inquiry.id,
    referenceType: "inquiry",
    actionUrl: `/inquiries/${inquiry.id}`,
  });

  return NextResponse.json({ changeRequestId: changeRequest.id });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientToken: string }> }
) {
  const { clientToken } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { clientToken },
    select: { id: true },
  });

  if (!inquiry) {
    return NextResponse.json({ error: "Invalid portal link" }, { status: 404 });
  }

  const changes = await prisma.clientChangeRequest.findMany({
    where: { inquiryId: inquiry.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ changes });
}
