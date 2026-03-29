import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole, StockTransactionType } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.stockItem.findUnique({
    where: { id },
    include: {
      vendor: { select: { name: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const item = await prisma.stockItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle stock adjustment transaction
  if (body.transactionType) {
    const qty = parseFloat(body.quantity);
    const txType = body.transactionType as StockTransactionType;

    let newStock = Number(item.currentStock);
    if (["INWARD", "RETURN"].includes(txType)) newStock += qty;
    else if (["ISSUE", "WASTAGE"].includes(txType)) newStock -= qty;
    else if (txType === "ADJUSTMENT") newStock = qty; // set absolute

    const [updatedItem] = await prisma.$transaction([
      prisma.stockItem.update({
        where: { id },
        data: {
          currentStock: Math.max(0, newStock),
          availableStock: Math.max(0, newStock - Number(item.reservedStock)),
          ...(body.rate !== undefined && { lastRate: parseFloat(body.rate) }),
        },
      }),
      prisma.stockTransaction.create({
        data: {
          stockItemId: id,
          transactionType: txType,
          quantity: qty,
          rate: body.rate ? parseFloat(body.rate) : null,
          referenceType: body.referenceType || null,
          referenceId: body.referenceId || null,
          orderId: body.orderId || null,
          note: body.note || null,
          createdById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({ item: updatedItem });
  }

  // Regular field update
  const { name, category, unit, description, vendorId, reorderLevel, location, notes, isActive } = body;
  const updated = await prisma.stockItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(unit !== undefined && { unit }),
      ...(description !== undefined && { description }),
      ...(vendorId !== undefined && { vendorId: vendorId || null }),
      ...(reorderLevel !== undefined && { reorderLevel: parseFloat(reorderLevel) }),
      ...(location !== undefined && { location }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ item: updated });
}
