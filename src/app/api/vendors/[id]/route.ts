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
  const vendor = await prisma.vendor.findUnique({
    where: { id, deletedAt: null },
    include: {
      purchaseOrders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { order: { include: { buyer: { select: { name: true } } } } },
      },
      _count: { select: { purchaseOrders: true, bomItems: true, jobWorks: true } },
    },
  });

  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vendor });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory") && !hasPermission(role, "create:purchase_order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const vendor = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, type, email, phone, address, country, taxNumber, paymentTerms, bankDetails, rating, notes, isActive } = body;

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(country !== undefined && { country }),
      ...(taxNumber !== undefined && { taxNumber }),
      ...(paymentTerms !== undefined && { paymentTerms }),
      ...(bankDetails !== undefined && { bankDetails }),
      ...(rating !== undefined && { rating: parseInt(rating) }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "vendor",
    entityId: id,
    description: `Vendor "${vendor.name}" updated`,
  });

  return NextResponse.json({ vendor: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.vendor.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ success: true });
}
