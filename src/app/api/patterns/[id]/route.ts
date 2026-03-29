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
  const pattern = await prisma.pattern.findUnique({
    where: { id },
    include: { order: { include: { buyer: true } }, files: true },
  });

  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ pattern });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  const { id } = await params;
  const body = await request.json();

  const pattern = await prisma.pattern.findUnique({ where: { id } });
  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, version, size, grainLine, notes, approvalStatus } = body;

  if (approvalStatus && !hasPermission(role, "approve:tech_pack")) {
    return NextResponse.json({ error: "Not authorised to approve patterns" }, { status: 403 });
  }

  const updated = await prisma.pattern.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(version !== undefined && { version }),
      ...(size !== undefined && { size }),
      ...(grainLine !== undefined && { grainLine }),
      ...(notes !== undefined && { notes }),
      ...(approvalStatus !== undefined && {
        approvalStatus,
        ...(approvalStatus === "APPROVED" && { approvedById: session.user.id, approvedAt: new Date() }),
      }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: approvalStatus ? "APPROVED" : "UPDATED",
    entityType: "pattern",
    entityId: id,
    orderId: pattern.orderId,
    description: `Pattern "${pattern.name}" ${approvalStatus ? approvalStatus.toLowerCase() : "updated"}`,
  });

  return NextResponse.json({ pattern: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.pattern.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
