import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole, TnaStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:tna")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const milestone = await prisma.tnaMilestone.findUnique({ where: { id } });
  if (!milestone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, description, plannedDate, actualDate, status, delayReason, note } = body;

  const updated = await prisma.tnaMilestone.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(plannedDate !== undefined && { plannedDate: new Date(plannedDate) }),
      ...(actualDate !== undefined && { actualDate: actualDate ? new Date(actualDate) : null }),
      ...(status !== undefined && { status: status as TnaStatus }),
      ...(delayReason !== undefined && { delayReason }),
    },
  });

  // Add update note if provided
  if (note) {
    await prisma.tnaUpdate.create({
      data: {
        milestoneId: id,
        note,
        updatedById: session.user.id,
      },
    });
  }

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "tna_milestone",
    entityId: id,
    orderId: milestone.orderId,
    description: `TNA milestone "${milestone.name}" updated${status ? ` → ${status}` : ""}`,
  });

  return NextResponse.json({ milestone: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:tna")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.tnaMilestone.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
