import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

// POST /api/production/[stageTrackerId]/update — add a production progress update
export async function POST(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "update:production_wip")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params; // stage tracker id
  const body = await request.json();
  const { actualQty, rejectionQty, reworkQty, delayReason, note, date } = body;

  if (actualQty === undefined) {
    return NextResponse.json({ error: "actualQty is required" }, { status: 400 });
  }

  const tracker = await prisma.productionStageTracker.findUnique({
    where: { id },
    include: { productionPlan: true },
  });
  if (!tracker) return NextResponse.json({ error: "Stage tracker not found" }, { status: 404 });

  const newActual = tracker.actualQty + parseInt(actualQty);
  const newRejection = tracker.rejectionQty + parseInt(rejectionQty || "0");
  const newRework = tracker.reworkQty + parseInt(reworkQty || "0");
  const newBalance = Math.max(0, tracker.plannedQty - newActual);
  const isDone = newBalance === 0;

  const [update] = await prisma.$transaction([
    prisma.productionUpdate.create({
      data: {
        stageTrackerId: id,
        date: date ? new Date(date) : new Date(),
        actualQty: parseInt(actualQty),
        rejectionQty: parseInt(rejectionQty || "0"),
        reworkQty: parseInt(reworkQty || "0"),
        delayReason: delayReason || null,
        note: note || null,
        updatedById: session.user.id,
        plannedQty: tracker.plannedQty,
      },
    }),
    prisma.productionStageTracker.update({
      where: { id },
      data: {
        actualQty: newActual,
        rejectionQty: newRejection,
        reworkQty: newRework,
        balanceQty: newBalance,
        status: isDone ? "DONE" : "IN_PROGRESS",
        ...(tracker.status === "PENDING" && { startedAt: new Date() }),
        ...(isDone && { completedAt: new Date() }),
      },
    }),
  ]);

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "UPDATED",
    entityType: "production_stage",
    entityId: id,
    orderId: tracker.productionPlan.orderId,
    description: `${tracker.stage} updated: +${actualQty} pcs${delayReason ? ` (delay: ${delayReason})` : ""}`,
  });

  return NextResponse.json({ update, tracker: { isDone, balanceQty: newBalance } }, { status: 201 });
}
