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
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    deletedAt: null,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
    ...(type ? { type } : {}),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: {
        _count: { select: { purchaseOrders: true, bomItems: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  return NextResponse.json({ vendors, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory") && !hasPermission(role, "create:purchase_order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { code, name, type, email, phone, address, country, taxNumber, paymentTerms, bankDetails, rating, notes } = body;

  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }

  const existing = await prisma.vendor.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Vendor code already exists" }, { status: 409 });

  const vendor = await prisma.vendor.create({
    data: {
      code: code.toUpperCase(),
      name,
      type: type || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      country: country || null,
      taxNumber: taxNumber || null,
      paymentTerms: paymentTerms || null,
      bankDetails: bankDetails || null,
      rating: rating ? parseInt(rating) : 3,
      notes: notes || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "vendor",
    entityId: vendor.id,
    description: `Vendor "${name}" created`,
  });

  return NextResponse.json({ vendor }, { status: 201 });
}
