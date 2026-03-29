import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole, InvoiceStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "view:financial_data") && !hasPermission(role, "generate:invoice")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id, deletedAt: null },
    include: {
      order: { include: { buyer: true } },
      lines: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "generate:invoice")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const invoice = await prisma.invoice.findUnique({ where: { id, deletedAt: null } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, dueDate, notes, termsConditions } = body;

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...(status !== undefined && { status: status as InvoiceStatus }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(notes !== undefined && { notes }),
      ...(termsConditions !== undefined && { termsConditions }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "invoice",
    entityId: id,
    orderId: invoice.orderId,
    description: `Invoice ${invoice.invoiceNumber} updated${status ? ` → ${status}` : ""}`,
  });

  return NextResponse.json({ invoice: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id, deletedAt: null } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (invoice.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT invoices can be deleted" }, { status: 400 });
  }

  await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
