import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole, PurchaseOrderStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id, deletedAt: null },
    include: {
      vendor: true,
      order: { include: { buyer: true } },
      lines: true,
      inwardRecords: { include: { lines: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ purchaseOrder: po });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "create:purchase_order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const po = await prisma.purchaseOrder.findUnique({ where: { id, deletedAt: null } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, paymentTerms, deliveryDate, notes } = body;

  // Only admin/accountant can approve PO
  if (status && !hasPermission(role, "approve:purchase_order") && ["ACKNOWLEDGED", "SENT"].includes(status)) {
    if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "STORE_MANAGER", "PROCUREMENT_USER"].includes(role)) {
      return NextResponse.json({ error: "Not authorised to update PO status" }, { status: 403 });
    }
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(status !== undefined && { status: status as PurchaseOrderStatus }),
      ...(paymentTerms !== undefined && { paymentTerms }),
      ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
      ...(notes !== undefined && { notes }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "purchase_order",
    entityId: id,
    orderId: po.orderId,
    description: `PO ${po.poNumber} updated${status ? ` → ${status}` : ""}`,
  });

  return NextResponse.json({ purchaseOrder: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "STORE_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({ where: { id, deletedAt: null } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["DRAFT"].includes(po.status)) {
    return NextResponse.json({ error: "Only DRAFT purchase orders can be deleted" }, { status: 400 });
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
