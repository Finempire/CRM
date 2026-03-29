import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = {
    ...(orderId ? { orderId } : {}),
    ...(activeOnly ? { isApproved: true, actualFinishDate: null } : {}),
  };

  const plans = await prisma.productionPlan.findMany({
    where,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      stages: { include: { updates: { take: 1, orderBy: { date: "desc" } } } },
    },
    orderBy: { plannedFinishDate: "asc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "approve:production_plan")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    orderId, plannedStartDate, plannedFinishDate,
    productionLine, supervisor, targetOutputPerDay, totalPlannedQty, stageQtys,
  } = body;

  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const existing = await prisma.productionPlan.findUnique({ where: { orderId } });
  if (existing) return NextResponse.json({ error: "Production plan already exists for this order" }, { status: 409 });

  const STAGES = ["CUTTING", "STITCHING", "FINISHING", "PACKING"] as const;

  const plan = await prisma.productionPlan.create({
    data: {
      orderId,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedFinishDate: plannedFinishDate ? new Date(plannedFinishDate) : null,
      productionLine: productionLine || null,
      supervisor: supervisor || null,
      targetOutputPerDay: targetOutputPerDay ? parseInt(targetOutputPerDay) : null,
      totalPlannedQty: totalPlannedQty ? parseInt(totalPlannedQty) : null,
      isApproved: false,
      stages: {
        create: STAGES.map(stage => ({
          stage,
          plannedQty: stageQtys?.[stage] || 0,
          actualQty: 0,
          rejectionQty: 0,
          reworkQty: 0,
          balanceQty: stageQtys?.[stage] || 0,
          status: "PENDING",
        })),
      },
    },
    include: { stages: true },
  });

  // Update order status to PRODUCTION
  await prisma.order.update({ where: { id: orderId }, data: { status: "PRODUCTION" } });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "CREATED",
    entityType: "production_plan",
    entityId: plan.id,
    orderId,
    description: `Production plan created for order`,
  });

  return NextResponse.json({ plan }, { status: 201 });
}
