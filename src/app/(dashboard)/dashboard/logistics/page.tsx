import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor, formatCurrency, isOverdue } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Truck, AlertTriangle, Navigation, CheckCircle, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Logistics Dashboard" };

export default async function LogisticsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "LOGISTICS_USER", "ADMIN_OPERATIONS"].includes(role)) redirect("/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [dispatchToday, inTransit, delayed, delivered, recentShipments, shippingCostSum] = await Promise.all([
    prisma.shipment.count({ where: { status: "READY_TO_SHIP", dispatchDate: { gte: today, lt: tomorrow } } }),
    prisma.shipment.count({ where: { status: "IN_TRANSIT" } }),
    prisma.shipment.count({ where: { status: "DELAYED" } }),
    prisma.shipment.count({ where: { status: "DELIVERED", actualDeliveryDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.shipment.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      where: { status: { notIn: ["DELIVERED", "RETURNED"] } },
      include: { order: { include: { buyer: true } } },
    }),
    prisma.shipment.aggregate({
      _sum: { shippingCost: true },
      where: { status: { in: ["SHIPPED", "IN_TRANSIT", "DELIVERED"] } },
    }),
  ]);

  const stats = [
    { label: "Dispatch Today", value: dispatchToday, icon: Truck, color: "text-blue-600", bg: "bg-blue-50", href: "/shipments?filter=today" },
    { label: "In Transit", value: inTransit, icon: Navigation, color: "text-purple-600", bg: "bg-purple-50", href: "/shipments?status=IN_TRANSIT" },
    { label: "Delayed", value: delayed, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/shipments?status=DELAYED" },
    { label: "Delivered (7d)", value: delivered, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", href: "/shipments?status=DELIVERED" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Logistics Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Shipping cost this month: {formatCurrency(Number(shippingCostSum._sum.shippingCost ?? 0))}</p>
        </div>
        <Link href="/shipments/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Truck size={16} /> New Shipment
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="stat-card cursor-pointer group">
              <div className={`p-2.5 rounded-lg ${stat.bg} w-fit`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Active Shipments */}
      <div className="bg-card rounded-xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Active Shipments</h2>
          <Link href="/shipments" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Shipment #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Transporter</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Expected Delivery</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentShipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">No active shipments</td>
                </tr>
              ) : (
                recentShipments.map((shipment) => {
                  const overdue = shipment.status !== "DELIVERED" && isOverdue(shipment.expectedDeliveryDate);
                  return (
                    <tr key={shipment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link href={`/shipments/${shipment.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {shipment.shipmentNumber}
                        </Link>
                        {shipment.trackingNumber && (
                          <p className="text-xs text-muted-foreground mt-0.5">{shipment.trackingNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{shipment.order.buyer.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{shipment.transporter ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn(overdue ? "text-red-600 font-semibold" : "text-foreground")}>
                          {formatDate(shipment.expectedDeliveryDate)}
                        </span>
                        {overdue && <span className="ml-2 text-[10px] text-red-500 font-bold">DELAYED</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`status-chip ${getStatusColor(shipment.status)}`}>
                          {shipment.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
