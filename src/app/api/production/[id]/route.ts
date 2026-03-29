import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

// GET /api/production/[id] — fetch a single production stage tracker by ID
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Try to find as stage tracker first (used by update page)
  const tracker = await prisma.productionStageTracker.findUnique({
    where: { id },
    include: {
      productionPlan: {
        include: {
          order: { include: { buyer: { select: { name: true } } } },
        },
      },
      updates: { orderBy: { date: "desc" }, take: 10 },
    },
  });

  if (tracker) return NextResponse.json({ tracker });

  // Fall back to production plan
  const plan = await prisma.productionPlan.findUnique({
    where: { id },
    include: {
      order: { include: { buyer: true } },
      stages: { include: { updates: { take: 5, orderBy: { date: "desc" } } } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "approve:production_plan")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Check if this is a plan or stage tracker
  const plan = await prisma.productionPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { isApproved, approvedById, plannedStartDate, plannedFinishDate, productionLine, supervisor, actualFinishDate } = body;

  const updated = await prisma.productionPlan.update({
    where: { id },
    data: {
      ...(isApproved !== undefined && {
        isApproved,
        ...(isApproved && { approvedById: approvedById || session.user.id }),
      }),
      ...(plannedStartDate !== undefined && { plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null }),
      ...(plannedFinishDate !== undefined && { plannedFinishDate: plannedFinishDate ? new Date(plannedFinishDate) : null }),
      ...(productionLine !== undefined && { productionLine }),
      ...(supervisor !== undefined && { supervisor }),
      ...(actualFinishDate !== undefined && { actualFinishDate: actualFinishDate ? new Date(actualFinishDate) : null }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: isApproved ? "APPROVED" : "UPDATED",
    entityType: "production_plan",
    entityId: id,
    orderId: plan.orderId,
    description: isApproved ? "Production plan approved" : "Production plan updated",
  });

  return NextResponse.json({ plan: updated });
}
