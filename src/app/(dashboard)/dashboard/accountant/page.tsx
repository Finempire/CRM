import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp, FileText, Package, AlertTriangle,
  Clock, ArrowUpRight, DollarSign, ShoppingBag, CheckCircle
} from "lucide-react";

export const metadata: Metadata = { title: "Finance Dashboard" };

export default async function AccountantDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "CEO"].includes(role)) redirect("/dashboard");

  // Fetch dashboard data
  const [
    newInquiries,
    ordersReview,
    ordersPendingCosting,
    overdueInvoices,
    recentOrders,
    upcomingShipments,
    paymentStats,
  ] = await Promise.all([
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { status: "REVIEW" } }),
    prisma.order.count({ where: { status: "COSTING" } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { buyer: true, costing: true },
      where: { deletedAt: null },
    }),
    prisma.shipment.findMany({
      take: 5,
      where: { status: { notIn: ["DELIVERED", "RETURNED"] }, expectedDeliveryDate: { gte: new Date() } },
      orderBy: { expectedDeliveryDate: "asc" },
      include: { order: { include: { buyer: true } } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      where: { deletedAt: null },
    }),
  ]);

  const totalRevenue = Number(paymentStats._sum.totalAmount ?? 0);
  const totalCollected = Number(paymentStats._sum.paidAmount ?? 0);
  const totalPending = Number(paymentStats._sum.balanceAmount ?? 0);

  const stats = [
    { label: "New Inquiries", value: newInquiries, icon: FileText, color: "text-blue-600", bg: "bg-blue-50", href: "/inquiries?status=NEW", change: "+3 today" },
    { label: "Pending Review", value: ordersReview, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", href: "/orders?status=REVIEW", change: "Needs action" },
    { label: "Awaiting Costing", value: ordersPendingCosting, icon: Package, color: "text-purple-600", bg: "bg-purple-50", href: "/orders?status=COSTING", change: "Needs pricing" },
    { label: "Overdue Invoices", value: overdueInvoices, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/invoices?status=OVERDUE", change: "Urgent" },
  ];

  const financialCards = [
    { label: "Total Invoiced", value: formatCurrency(totalRevenue), icon: DollarSign, color: "from-blue-600 to-indigo-600" },
    { label: "Amount Collected", value: formatCurrency(totalCollected), icon: CheckCircle, color: "from-emerald-500 to-teal-600" },
    { label: "Outstanding", value: formatCurrency(totalPending), icon: TrendingUp, color: "from-orange-500 to-amber-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <ShoppingBag size={16} />
          New Order
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="stat-card group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-xs mt-1 ${stat.value > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{stat.change}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl bg-gradient-to-br ${card.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={24} className="opacity-80" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-80 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-foreground">Recent Orders</h2>
            <Link href="/orders" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No orders yet. <Link href="/orders/new" className="text-primary hover:underline">Create the first order</Link>
              </div>
            ) : (
              recentOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{order.orderNumber}</span>
                      <span className={`status-chip text-[10px] ${getStatusColor(order.status)}`}>{order.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.buyer.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {order.costing ? (
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(order.costing.totalRevenue))}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No costing</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(order.shipmentDate)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Shipments */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-foreground">Shipment Due</h2>
            <Link href="/shipments" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {upcomingShipments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No upcoming shipments</div>
            ) : (
              upcomingShipments.map((shipment) => (
                <Link key={shipment.id} href={`/shipments/${shipment.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{shipment.order.buyer.name}</p>
                    <p className="text-xs text-muted-foreground">{shipment.shipmentNumber}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs font-semibold text-foreground">{formatDate(shipment.expectedDeliveryDate)}</p>
                    <span className={`status-chip text-[10px] ${getStatusColor(shipment.status)}`}>{shipment.status.replace(/_/g, " ")}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
