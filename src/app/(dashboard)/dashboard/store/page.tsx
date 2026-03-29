import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Warehouse, AlertTriangle, ShoppingCart, Package, TrendingDown } from "lucide-react";

export const metadata: Metadata = { title: "Store Dashboard" };

export default async function StoreDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "STORE_MANAGER", "PROCUREMENT_USER", "ADMIN_OPERATIONS"].includes(role)) redirect("/dashboard");

  const [
    shortageCount,
    pendingPOs,
    partialPOs,
    stockSummary,
    lowStockItems,
    recentPOs,
  ] = await Promise.all([
    prisma.materialRequestLine.count({ where: { status: "SHORTAGE" } }),
    prisma.purchaseOrder.count({ where: { status: { in: ["DRAFT", "SENT"] }, deletedAt: null } }),
    prisma.purchaseOrder.count({ where: { status: "PARTIAL_RECEIVED", deletedAt: null } }),
    prisma.stockItem.aggregate({
      _count: { id: true },
      _sum: { currentStock: true },
      where: { isActive: true },
    }),
    prisma.stockItem.findMany({
      where: { isActive: true },
      orderBy: { currentStock: "asc" },
      take: 8,
    }),
    prisma.purchaseOrder.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: { deletedAt: null },
      include: { vendor: true, order: true },
    }),
  ]);

  const totalSKUs = stockSummary._count.id;
  const lowStockCount = lowStockItems.filter((i) => Number(i.currentStock) <= Number(i.reorderLevel)).length;

  const stats = [
    { label: "Material Shortages", value: shortageCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/material-requests?status=SHORTAGE" },
    { label: "Pending POs", value: pendingPOs, icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-50", href: "/purchase-orders?status=PENDING" },
    { label: "Partial Received", value: partialPOs, icon: Package, color: "text-blue-600", bg: "bg-blue-50", href: "/purchase-orders?status=PARTIAL" },
    { label: "Low Stock Items", value: lowStockCount, icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-50", href: "/inventory?filter=low" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{totalSKUs} total SKUs in inventory</p>
        </div>
        <Link href="/purchase-orders/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <ShoppingCart size={16} /> New PO
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">Low Stock Alerts</h2>
            <Link href="/inventory" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">All stock levels OK</div>
            ) : (
              lowStockItems.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
                return (
                  <div key={item.id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category} · {item.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isLow ? "text-red-600" : "text-foreground"}`}>
                        {Number(item.currentStock).toLocaleString()} {item.unit}
                      </p>
                      {isLow && <span className="text-[10px] text-red-500 font-medium">REORDER NEEDED</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">Recent Purchase Orders</h2>
            <Link href="/purchase-orders" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {recentPOs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No purchase orders</div>
            ) : (
              recentPOs.map((po) => (
                <Link key={po.id} href={`/purchase-orders/${po.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{po.vendor.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(Number(po.grandTotal))}</p>
                    <span className={`status-chip text-[10px] ${getStatusColor(po.status)}`}>{po.status.replace(/_/g, " ")}</span>
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
