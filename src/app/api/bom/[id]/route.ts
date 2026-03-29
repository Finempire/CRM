import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:bom")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const item = await prisma.bomItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    itemName, description, specification, color,
    requiredQty, unit, wastagePercent, vendorId, estimatedRate, notes,
  } = body;

  const waste = wastagePercent !== undefined ? parseFloat(wastagePercent) : Number(item.wastagePercent);
  const reqQty = requiredQty !== undefined ? parseFloat(requiredQty) : Number(item.requiredQty);
  const netRequiredQty = reqQty * (1 + waste / 100);
  const rate = estimatedRate !== undefined ? (estimatedRate ? parseFloat(estimatedRate) : null) : (item.estimatedRate ? Number(item.estimatedRate) : null);

  const updated = await prisma.bomItem.update({
    where: { id },
    data: {
      ...(itemName !== undefined && { itemName }),
      ...(description !== undefined && { description }),
      ...(specification !== undefined && { specification }),
      ...(color !== undefined && { color }),
      requiredQty: reqQty,
      ...(unit !== undefined && { unit }),
      wastagePercent: waste,
      netRequiredQty,
      ...(vendorId !== undefined && { vendorId: vendorId || null }),
      estimatedRate: rate,
      estimatedAmount: rate ? netRequiredQty * rate : null,
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json({ bomItem: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:bom")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.bomItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
