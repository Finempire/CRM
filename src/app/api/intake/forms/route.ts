import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role as string;
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { buyerName, description, expiresAt } = await req.json();

    const token = randomBytes(24).toString("hex");

    const form = await prisma.intakeForm.create({
      data: {
        token,
        buyerName: buyerName || null,
        description: description || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdById: session.user.id!,
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (err) {
    console.error("POST /api/intake/forms:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
