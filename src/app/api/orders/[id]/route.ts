import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import type { UserRole, OrderStatus } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role as UserRole;
  const isFinance = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "CEO"].includes(role);

  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      buyer: { include: { contacts: true } },
      merchandiser: { select: { id: true, name: true, email: true } },
      productionManager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      orderLines: { include: { style: true } },
      ...(isFinance ? { costing: { include: { lineItems: true } } } : {}),
      tnaMilestones: { orderBy: { plannedDate: "asc" } },
      techPacks: { include: { files: true } },
      patterns: { include: { files: true } },
      bomItems: { include: { vendor: { select: { id: true, name: true } } } },
      jobWorkRequirements: { include: { vendor: { select: { id: true, name: true } } } },
      materialRequests: { include: { lines: true } },
      purchaseOrders: { include: { vendor: true, lines: true } },
      productionPlan: { include: { stages: { include: { updates: { take: 5, orderBy: { date: "desc" } } } } } },
      shipments: { include: { updates: true } },
      ...(isFinance ? { invoices: { include: { lines: true, payments: true } } } : {}),
      documents: { include: { uploadedBy: { select: { name: true } }, versions: true }, orderBy: { uploadedAt: "desc" } },
      comments: { include: { author: true, replies: { include: { author: true } } }, where: { parentId: null }, orderBy: { createdAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      activityLogs: { take: 50, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, role: true } } } },
      statusHistory: { orderBy: { changedAt: "desc" } },
      _count: { select: { documents: true, comments: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // CLIENT role: only own orders
  if (role === "CLIENT") {
    const buyer = await prisma.buyer.findFirst({ where: { email: session.user.email! } });
    if (!buyer || order.buyerId !== buyer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ order });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "edit:order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const order = await prisma.order.findUnique({ where: { id, deletedAt: null } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const {
    status, merchandiserId, productionManagerId, shipmentDate,
    paymentTerms, taxMode, currency, notes, reopenReason,
  } = body;

  const updateData: any = {};
  if (merchandiserId !== undefined) updateData.merchandiserId = merchandiserId || null;
  if (productionManagerId !== undefined) updateData.productionManagerId = productionManagerId || null;
  if (shipmentDate !== undefined) updateData.shipmentDate = shipmentDate ? new Date(shipmentDate) : null;
  if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
  if (taxMode !== undefined) updateData.taxMode = taxMode;
  if (currency !== undefined) updateData.currency = currency;
  if (notes !== undefined) updateData.notes = notes;

  // Status transition
  if (status && status !== order.status) {
    // Reopen handling
    if (status === "REVIEW" && order.status === "CLOSED") {
      if (!hasPermission(role, "reopen:order")) {
        return NextResponse.json({ error: "Cannot reopen order — insufficient permission" }, { status: 403 });
      }
      updateData.reopenReason = reopenReason || null;
      updateData.isLocked = false;
    }
    updateData.status = status as OrderStatus;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  // Log status change
  if (status && status !== order.status) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: status as OrderStatus,
        changedById: session.user.id,
        note: body.statusNote || null,
      },
    });

    await logActivityServer({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userRole: role,
      action: "STATUS_CHANGED",
      entityType: "order",
      entityId: id,
      orderId: id,
      description: `Order status changed from ${order.status} to ${status}`,
    });

    // Notify assigned users
    const notifyUsers = [order.merchandiserId, order.productionManagerId].filter(Boolean) as string[];
    for (const uid of notifyUsers) {
      await sendNotification({
        userId: uid,
        type: "GENERAL",
        title: "Order Status Updated",
        message: `Order ${order.orderNumber} moved to ${status}`,
        orderId: id,
        actionUrl: `/orders/${id}`,
        priority: "MEDIUM",
      });
    }
  } else if (Object.keys(updateData).length > 0) {
    await logActivityServer({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userRole: role,
      action: "UPDATED",
      entityType: "order",
      entityId: id,
      orderId: id,
      description: `Order ${order.orderNumber} updated`,
    });
  }

  return NextResponse.json({ order: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "delete:order")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id, deletedAt: null } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.order.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: "DELETED",
    entityType: "order",
    entityId: id,
    orderId: id,
    description: `Order ${order.orderNumber} deleted`,
  });

  return NextResponse.json({ success: true });
}
