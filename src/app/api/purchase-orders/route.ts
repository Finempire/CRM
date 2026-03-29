import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { generateOrderNumber } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const vendorId = searchParams.get("vendorId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    deletedAt: null,
    ...(orderId ? { orderId } : {}),
    ...(vendorId ? { vendorId } : {}),
    ...(status ? { status } : {}),
  };

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        order: { include: { buyer: { select: { name: true } } } },
        lines: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return NextResponse.json({ purchaseOrders, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "create:purchase_order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, vendorId, currency, paymentTerms, deliveryDate, deliveryAddress, notes, lines } = body;

  if (!orderId || !vendorId || !lines?.length) {
    return NextResponse.json({ error: "orderId, vendorId, and lines are required" }, { status: 400 });
  }

  const poNumber = generateOrderNumber("PO");

  // Calculate totals
  const lineItems = lines.map((l: any) => ({
    itemName: l.itemName,
    description: l.description || null,
    quantity: parseFloat(l.quantity),
    unit: l.unit,
    rate: parseFloat(l.rate),
    amount: parseFloat(l.quantity) * parseFloat(l.rate),
    pendingQty: parseFloat(l.quantity),
    notes: l.notes || null,
    materialRequestLineId: l.materialRequestLineId || null,
  }));

  const totalAmount = lineItems.reduce((s: number, l: any) => s + l.amount, 0);
  const taxAmount = parseFloat(body.taxAmount || "0");

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      orderId,
      vendorId,
      createdById: session.user.id,
      status: "DRAFT",
      currency: currency || "INR",
      totalAmount,
      taxAmount,
      grandTotal: totalAmount + taxAmount,
      paymentTerms: paymentTerms || null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      deliveryAddress: deliveryAddress || null,
      notes: notes || null,
      lines: { create: lineItems },
    },
    include: { lines: true, vendor: true },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "purchase_order",
    entityId: po.id,
    orderId,
    description: `Purchase order ${poNumber} created for vendor ${po.vendor.name}`,
  });

  return NextResponse.json({ purchaseOrder: po }, { status: 201 });
}
