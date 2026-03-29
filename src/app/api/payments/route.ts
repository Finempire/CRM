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
  if (!hasPermission(role, "view:financial_data") && !hasPermission(role, "record:payment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    ...(invoiceId ? { invoiceId } : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: { order: { include: { buyer: { select: { name: true } } } } },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "record:payment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { invoiceId, paymentDate, amount, currency, paymentMode, referenceNumber, bankName, proofUrl, notes } = body;

  if (!invoiceId || !amount) {
    return NextResponse.json({ error: "invoiceId and amount are required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, deletedAt: null },
    include: { order: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const paymentNumber = generateOrderNumber("PAY");
  const paymentAmt = parseFloat(amount);

  const payment = await prisma.payment.create({
    data: {
      paymentNumber,
      invoiceId,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: paymentAmt,
      currency: currency || invoice.currency,
      paymentMode: paymentMode || null,
      referenceNumber: referenceNumber || null,
      bankName: bankName || null,
      proofUrl: proofUrl || null,
      status: "PAID",
      notes: notes || null,
    },
  });

  // Recompute invoice paid/balance amounts and update status
  const allPayments = await prisma.payment.findMany({
    where: { invoiceId, status: "PAID" },
    select: { amount: true },
  });
  const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(invoice.totalAmount) - totalPaid;
  const invoiceStatus = balance <= 0 ? "PAID" : "PARTIALLY_PAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: totalPaid, balanceAmount: Math.max(0, balance), status: invoiceStatus },
  });

  // Update order to PAID when fully settled
  if (invoiceStatus === "PAID") {
    await prisma.order.update({ where: { id: invoice.orderId }, data: { status: "PAID" } });
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "payment",
    entityId: payment.id,
    orderId: invoice.orderId,
    description: `Payment ${paymentNumber} of ₹${paymentAmt.toFixed(2)} recorded`,
  });

  return NextResponse.json({ payment, invoiceStatus, balance }, { status: 201 });
}
