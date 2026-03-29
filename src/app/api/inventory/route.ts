import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const lowStock = searchParams.get("lowStock") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    isActive: true,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
    ...(category ? { category } : {}),
  };

  let items = await prisma.stockItem.findMany({
    where,
    include: { vendor: { select: { name: true } } },
    orderBy: { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  if (lowStock) {
    items = items.filter(i => Number(i.currentStock) <= Number(i.reorderLevel));
  }

  const total = await prisma.stockItem.count({ where });
  const categories = await prisma.stockItem.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ items, total, categories: categories.map(c => c.category) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { code, name, category, unit, description, vendorId, reorderLevel, location, notes } = body;

  if (!code || !name || !category || !unit) {
    return NextResponse.json({ error: "code, name, category, and unit are required" }, { status: 400 });
  }

  const existing = await prisma.stockItem.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Stock item code already exists" }, { status: 409 });

  const item = await prisma.stockItem.create({
    data: {
      code: code.toUpperCase(),
      name,
      category,
      unit,
      description: description || null,
      vendorId: vendorId || null,
      reorderLevel: parseFloat(reorderLevel || "0"),
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      location: location || null,
      notes: notes || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "stock_item",
    entityId: item.id,
    description: `Stock item "${name}" (${code}) created`,
  });

  return NextResponse.json({ item }, { status: 201 });
}
