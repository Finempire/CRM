import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, Package, Clock, AlertCircle, CheckCircle, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "Operations Dashboard" };

export default async function OperationsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "ADMIN_OPERATIONS"].includes(role)) redirect("/dashboard");

  const [
    openInquiries,
    ordersInReview,
    ordersInMerchandising,
    overdueOrders,
    recentOrders,
    pendingApprovals,
  ] = await Promise.all([
    prisma.inquiry.count({ where: { status: { in: ["NEW", "REVIEWING"] } } }),
    prisma.order.count({ where: { status: "REVIEW", deletedAt: null } }),
    prisma.order.count({ where: { status: "MERCHANDISING", deletedAt: null } }),
    prisma.order.count({
      where: {
        shipmentDate: { lt: new Date() },
        status: { notIn: ["CLOSED", "DELIVERY", "PAID", "INVOICED", "CANCELLED"] },
        deletedAt: null,
      },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: { deletedAt: null },
      include: { buyer: true },
    }),
    prisma.approval.count({ where: { status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Open Inquiries", value: openInquiries, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", href: "/inquiries" },
    { label: "Orders in Review", value: ordersInReview, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", href: "/orders?status=REVIEW" },
    { label: "Merchandising", value: ordersInMerchandising, icon: Package, color: "text-purple-600", bg: "bg-purple-50", href: "/orders?status=MERCHANDISING" },
    { label: "Overdue Orders", value: overdueOrders, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", href: "/orders?filter=delayed" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Package size={16} /> New Order
        </Link>
      </div>

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
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <p className="text-xs text-muted-foreground flex-shrink-0">{formatDate(order.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-foreground">Quick Links</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              { href: "/inquiries", label: "Inquiries", desc: "Review & convert" },
              { href: "/orders", label: "All Orders", desc: "Full order list" },
              { href: "/tna", label: "TNA Calendar", desc: "Milestone tracking" },
              { href: "/tech-pack", label: "Tech Packs", desc: "Upload & approve" },
              { href: "/bom", label: "BOM", desc: "Bill of materials" },
              { href: "/documents", label: "Documents", desc: "File workspace" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                <div>
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
                <ArrowUpRight size={14} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </Link>
            ))}
          </div>
          {pendingApprovals > 0 && (
            <div className="mx-4 mb-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700 font-medium">{pendingApprovals} pending approvals</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
