import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FINANCE_ROLES } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import type { Metadata } from "next";
import { OrderDetailHeader } from "@/components/orders/OrderDetailHeader";
import { OrderDetailTabs } from "@/components/orders/OrderDetailTabs";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNumber: true },
  });
  return { title: order ? `Order ${order.orderNumber}` : "Order Not Found" };
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const role = (session.user as any).role as UserRole;
  const isFinance = FINANCE_ROLES.includes(role);

  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      buyer: { include: { contacts: true } },
      merchandiser: { select: { id: true, name: true, email: true } },
      productionManager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      orderLines: { include: { style: true } },
      costing: { include: { lineItems: true } },
      tnaMilestones: { orderBy: { plannedDate: "asc" }, include: { updates: { take: 3, orderBy: { updatedAt: "desc" } } } },
      techPacks: { include: { files: true } },
      patterns: { include: { files: true } },
      bomItems: { include: { vendor: true } },
      jobWorkRequirements: { include: { vendor: true } },
      materialRequests: { include: { lines: true } },
      purchaseOrders: { include: { vendor: true, lines: true } },
      productionPlan: { include: { stages: { include: { updates: { take: 5, orderBy: { date: "desc" } } } } } },
      shipments: { include: { updates: true } },
      invoices: { include: { lines: true, payments: true } },
      documents: { include: { uploadedBy: true, versions: true }, orderBy: { uploadedAt: "desc" } },
      comments: { include: { author: true, replies: { include: { author: true } } }, where: { parentId: null }, orderBy: { createdAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      activityLogs: { take: 50, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, role: true } } } },
      statusHistory: { orderBy: { changedAt: "desc" } },
      _count: { select: { documents: true, comments: true } },
    },
  });

  if (!order) notFound();

  const activeTab = sp.tab ?? "timeline";

  return (
    <div className="space-y-4 max-w-full">
      <OrderDetailHeader
        order={order}
        isFinance={isFinance}
        role={role}
        userId={session.user.id!}
      />
      <OrderDetailTabs
        order={order}
        isFinance={isFinance}
        role={role}
        userId={session.user.id!}
        activeTab={activeTab}
      />
    </div>
  );
}
