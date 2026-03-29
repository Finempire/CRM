import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor, isDueSoon, isOverdue } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, Clock, FileText, MessageSquare, AlertCircle, CheckSquare, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Merchandiser Dashboard" };

export default async function MerchandiserDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "MERCHANDISER", "ADMIN_OPERATIONS"].includes(role)) redirect("/dashboard");

  const userId = session.user.id!;

  const [assignedOrders, tnaDue, pendingTechPacks, totalInProgress] = await Promise.all([
    prisma.order.findMany({
      where: { merchandiserId: userId, status: { notIn: ["CLOSED", "CANCELLED", "PAID"] }, deletedAt: null },
      include: { buyer: true, tnaMilestones: { orderBy: { plannedDate: "asc" }, take: 3 } },
      orderBy: { shipmentDate: "asc" },
    }),
    prisma.tnaMilestone.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        order: { merchandiserId: userId, deletedAt: null },
        plannedDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // due in 7 days
      },
      include: { order: { include: { buyer: true } } },
      orderBy: { plannedDate: "asc" },
      take: 10,
    }),
    prisma.techPack.count({
      where: { order: { merchandiserId: userId }, approvalStatus: "PENDING" },
    }),
    prisma.order.count({
      where: { merchandiserId: userId, status: { in: ["MERCHANDISING", "PRODUCTION"] }, deletedAt: null },
    }),
  ]);

  const stats = [
    { label: "Assigned Orders", value: assignedOrders.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active", value: totalInProgress, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
    { label: "TNA Due (7d)", value: tnaDue.length, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Tech Pack Review", value: pendingTechPacks, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Merchandiser Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {session.user.name}</p>
        </div>
        <Link href="/tna" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Calendar size={16} /> TNA Calendar
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className={`p-2.5 rounded-lg ${stat.bg} w-fit`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Orders */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">My Orders</h2>
            <Link href="/orders" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {assignedOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No assigned orders</div>
            ) : (
              assignedOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="flex items-start justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{order.orderNumber}</span>
                      <span className={`status-chip text-[10px] ${getStatusColor(order.status)}`}>{order.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.buyer.name}</p>
                    {order.tnaMilestones[0] && (
                      <p className={cn("text-xs mt-1", isOverdue(order.tnaMilestones[0].plannedDate) ? "text-red-500 font-medium" : isDueSoon(order.tnaMilestones[0].plannedDate) ? "text-amber-500" : "text-muted-foreground")}>
                        Next: {order.tnaMilestones[0].name} — {formatDate(order.tnaMilestones[0].plannedDate)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs text-muted-foreground">{formatDate(order.shipmentDate)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* TNA Deadlines */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">TNA Deadlines (7 days)</h2>
            <Link href="/tna" className="text-sm text-primary hover:underline">Calendar</Link>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {tnaDue.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No upcoming TNA deadlines</div>
            ) : (
              tnaDue.map((milestone) => {
                const overdue = isOverdue(milestone.plannedDate);
                const dueSoon = isDueSoon(milestone.plannedDate, 2);
                return (
                  <Link key={milestone.id} href={`/orders/${milestone.orderId}?tab=tna`} className="flex items-start justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", overdue ? "bg-red-500" : dueSoon ? "bg-amber-500" : "bg-blue-500")} />
                      <div>
                        <p className="text-sm font-medium">{milestone.name}</p>
                        <p className="text-xs text-muted-foreground">{milestone.order.buyer.name} · {milestone.order.orderNumber}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <p className={cn("text-xs font-semibold", overdue ? "text-red-500" : dueSoon ? "text-amber-500" : "text-foreground")}>
                        {formatDate(milestone.plannedDate)}
                      </p>
                      {overdue && <span className="text-[10px] text-red-500">OVERDUE</span>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
