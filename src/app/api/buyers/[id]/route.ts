import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const buyer = await prisma.buyer.findUnique({
    where: { id, deletedAt: null },
    include: {
      contacts: true,
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, orderNumber: true, status: true, type: true, shipmentDate: true, createdAt: true },
      },
      _count: { select: { orders: true, inquiries: true } },
    },
  });

  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  return NextResponse.json({ buyer });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "edit:order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const buyer = await prisma.buyer.findUnique({ where: { id, deletedAt: null } });
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });

  const { name, shortName, country, currency, email, phone, billingAddress, shippingAddress, taxNumber, paymentTerms, creditLimit, notes, isActive } = body;

  const updated = await prisma.buyer.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(shortName !== undefined && { shortName }),
      ...(country !== undefined && { country }),
      ...(currency !== undefined && { currency }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(billingAddress !== undefined && { billingAddress }),
      ...(shippingAddress !== undefined && { shippingAddress }),
      ...(taxNumber !== undefined && { taxNumber }),
      ...(paymentTerms !== undefined && { paymentTerms }),
      ...(creditLimit !== undefined && { creditLimit: creditLimit ? parseFloat(creditLimit) : null }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "buyer",
    entityId: id,
    description: `Buyer "${buyer.name}" updated`,
  });

  return NextResponse.json({ buyer: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const buyer = await prisma.buyer.findUnique({ where: { id, deletedAt: null } });
  if (!buyer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete
  await prisma.buyer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "DELETED",
    entityType: "buyer",
    entityId: id,
    description: `Buyer "${buyer.name}" deleted`,
  });

  return NextResponse.json({ success: true });
}
