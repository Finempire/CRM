import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const styles = await prisma.style.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, category: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(styles);
}
