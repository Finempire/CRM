import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { TrendingUp, Package, DollarSign, CheckCircle, AlertTriangle, BarChart3, Target, Activity } from "lucide-react";

export const metadata: Metadata = { title: "Management Dashboard" };

export default async function ManagementDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "CEO"].includes(role)) redirect("/dashboard");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    orderFunnel,
    orderValue,
    buyerStats,
    activeOrders,
    onTimeDeliveries,
    totalDeliveries,
    revenueByMonth,
    delayedOrders,
  ] = await Promise.all([
    // Order funnel by status
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { deletedAt: null },
    }),
    // Total order value
    prisma.costing.aggregate({
      _sum: { totalRevenue: true, totalCost: true, grossMargin: true },
    }),
    // Buyer wise order count
    prisma.order.groupBy({
      by: ["buyerId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
      where: { deletedAt: null },
    }),
    // Active orders count
    prisma.order.count({
      where: { status: { notIn: ["CLOSED", "CANCELLED", "PAID", "INQUIRY"] }, deletedAt: null },
    }),
    // On-time deliveries in last 30 days
    prisma.shipment.count({
      where: {
        status: "DELIVERED",
        actualDeliveryDate: { gte: thirtyDaysAgo },
        // on time = actualDeliveryDate <= expectedDeliveryDate
      },
    }),
    prisma.shipment.count({
      where: { status: "DELIVERED", actualDeliveryDate: { gte: thirtyDaysAgo } },
    }),
    // Revenue by month (last 6) - MySQL syntax
    prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT DATE_FORMAT(createdAt, '%b %Y') as month,
             CAST(COALESCE(SUM(totalRevenue), 0) AS DECIMAL(15,2)) as revenue
      FROM costings
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%b %Y')
      ORDER BY MIN(createdAt)
    `.catch(() => [] as { month: string; revenue: number }[]),
    // Delayed orders
    prisma.order.count({
      where: {
        shipmentDate: { lt: new Date() },
        status: { notIn: ["CLOSED", "DELIVERY", "PAID", "INVOICED", "CANCELLED"] },
        deletedAt: null,
      },
    }),
  ]);

  const totalRevenue = Number(orderValue._sum.totalRevenue ?? 0);
  const totalCost = Number(orderValue._sum.totalCost ?? 0);
  const totalMargin = Number(orderValue._sum.grossMargin ?? 0);
  const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const onTimePct = totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 0;

  const summaryCards = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "from-blue-600 to-indigo-600", sub: "All time" },
    { label: "Gross Margin", value: `${marginPct.toFixed(1)}%`, icon: TrendingUp, color: "from-emerald-500 to-teal-600", sub: formatCurrency(totalMargin) },
    { label: "Active Orders", value: activeOrders, icon: Package, color: "from-orange-500 to-amber-500", sub: "In pipeline" },
    { label: "On-Time Delivery", value: `${onTimePct}%`, icon: Target, color: "from-purple-600 to-violet-600", sub: `${totalDeliveries} delivered (30d)` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Management Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Company-wide performance overview</p>
        </div>
        <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
          <BarChart3 size={16} /> View Reports
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl bg-gradient-to-br ${card.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={22} className="opacity-80" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-80 mt-0.5">{card.label}</p>
              <p className="text-xs opacity-60 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Funnel */}
        <div className="bg-card rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Order Pipeline</h2>
          </div>
          <div className="p-6 space-y-3">
            {orderFunnel.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`status-chip text-xs ${getStatusColor(item.status)}`}>{item.status.replace(/_/g, " ")}</span>
                </div>
                <span className="font-semibold text-sm">{item._count.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="lg:col-span-2 bg-card rounded-xl border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Revenue Trend (6 months)</h2>
            <span className="text-xs text-muted-foreground">Monthly</span>
          </div>
          <div className="p-6">
            {revenueByMonth.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No revenue data yet
              </div>
            ) : (
              <div className="space-y-2">
                {revenueByMonth.map((item) => {
                  const maxRevenue = Math.max(...revenueByMonth.map((r) => r.revenue), 1);
                  const pct = Math.round((item.revenue / maxRevenue) * 100);
                  return (
                    <div key={item.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{item.month}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">{formatCurrency(item.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {delayedOrders > 0 && (
            <div className="mx-6 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">{delayedOrders} orders past shipment date</p>
                <Link href="/orders?filter=delayed" className="text-xs text-red-600 hover:underline">View delayed orders →</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
