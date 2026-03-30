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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    deletedAt: null,
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
        { email: { contains: search } },
      ],
    } : {}),
  };

  const [buyers, total] = await Promise.all([
    prisma.buyer.findMany({
      where,
      include: {
        contacts: { take: 1, where: { isPrimary: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.buyer.count({ where }),
  ]);

  return NextResponse.json({ buyers, total, page, limit });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "create:order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, shortName, country, currency, email, phone, billingAddress, shippingAddress, taxNumber, paymentTerms, creditLimit, notes } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const existing = await prisma.buyer.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Buyer code already exists" }, { status: 409 });

  const buyer = await prisma.buyer.create({
    data: {
      name, code: code.toUpperCase(),
      shortName: shortName || null,
      country: country || null,
      currency: currency || "INR",
      email: email || null,
      phone: phone || null,
      billingAddress: billingAddress || null,
      shippingAddress: shippingAddress || null,
      taxNumber: taxNumber || null,
      paymentTerms: paymentTerms || null,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      notes: notes || null,
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "buyer",
    entityId: buyer.id,
    description: `Buyer "${name}" created`,
  });

  return NextResponse.json({ buyer }, { status: 201 });
}
