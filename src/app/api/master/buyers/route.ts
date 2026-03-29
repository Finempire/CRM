import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buyers = await prisma.buyer.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, code: true, currency: true, paymentTerms: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(buyers);
}
