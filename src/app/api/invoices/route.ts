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

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "view:financial_data") && !hasPermission(role, "generate:invoice")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    deletedAt: null,
    ...(orderId ? { orderId } : {}),
    ...(status ? { status } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        order: { include: { buyer: { select: { name: true, currency: true } } } },
        payments: { select: { amount: true, status: true } },
        lines: true,
      },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "generate:invoice")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, dueDate, currency, taxAmount, discount, notes, termsConditions, lines } = body;

  if (!orderId || !lines?.length) {
    return NextResponse.json({ error: "orderId and lines are required" }, { status: 400 });
  }

  const invoiceNumber = generateOrderNumber("INV");

  const lineItems = lines.map((l: any) => ({
    description: l.description,
    quantity: parseFloat(l.quantity),
    unit: l.unit || "PCS",
    rate: parseFloat(l.rate),
    amount: parseFloat(l.quantity) * parseFloat(l.rate),
    taxRate: parseFloat(l.taxRate || "0"),
    taxAmount: (parseFloat(l.quantity) * parseFloat(l.rate)) * (parseFloat(l.taxRate || "0") / 100),
    total: parseFloat(l.quantity) * parseFloat(l.rate) * (1 + parseFloat(l.taxRate || "0") / 100),
  }));

  const subTotal = lineItems.reduce((s: number, l: any) => s + l.amount, 0);
  const computedTax = parseFloat(taxAmount || "0");
  const computedDiscount = parseFloat(discount || "0");
  const totalAmount = subTotal + computedTax - computedDiscount;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId,
      status: "DRAFT",
      dueDate: dueDate ? new Date(dueDate) : null,
      currency: currency || "INR",
      subTotal,
      taxAmount: computedTax,
      discount: computedDiscount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      notes: notes || null,
      termsConditions: termsConditions || null,
      lines: { create: lineItems },
    },
    include: { lines: true },
  });

  // Update order to INVOICED
  await prisma.order.update({ where: { id: orderId }, data: { status: "INVOICED" } });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "invoice",
    entityId: invoice.id,
    orderId,
    description: `Invoice ${invoiceNumber} generated for ₹${totalAmount.toFixed(2)}`,
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
