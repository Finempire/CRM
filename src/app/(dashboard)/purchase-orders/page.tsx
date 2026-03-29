import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingCart, ExternalLink, Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Purchase Orders" };

type SearchParams = { status?: string };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "bg-indigo-100 text-indigo-700" },
  PARTIAL_RECEIVED: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  FULLY_RECEIVED: { label: "Received", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-200 text-gray-500" },
};

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status as any;

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      vendor: { select: { name: true, type: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalPOValue = purchaseOrders.reduce((s, po) => s + Number(po.totalAmount || 0), 0);
  const pending = purchaseOrders.filter(po => po.status === "SENT" || po.status === "ACKNOWLEDGED").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage vendor purchase orders for materials and job work</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground font-medium">Total POs</p><p className="text-2xl font-bold mt-1">{purchaseOrders.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground font-medium">Total Value</p><p className="text-2xl font-bold mt-1">{formatCurrency(totalPOValue)}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground font-medium">Pending Delivery</p><p className="text-2xl font-bold mt-1 text-orange-600">{pending}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/purchase-orders" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All</Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/purchase-orders?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
            {cfg.label}
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">PO #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchaseOrders.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground"><ShoppingCart size={40} className="mx-auto mb-3 opacity-40" /><p>No purchase orders found</p></td></tr>
              ) : (
                purchaseOrders.map(po => {
                  const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{po.poNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${po.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">{po.order.orderNumber} <ExternalLink size={11} /></Link>
                        <p className="text-xs text-muted-foreground">{po.order.buyer.name}</p>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Building2 size={13} className="text-muted-foreground" /><span className="font-medium text-xs">{po.vendor?.name || "—"}</span></div></td>
                      <td className="px-4 py-3">{po.vendor?.type && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{po.vendor.type}</span>}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{po.lines.length} items</span></td>
                      <td className="px-4 py-3 text-sm">{po.deliveryDate ? formatDate(po.deliveryDate) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{po.totalAmount ? formatCurrency(Number(po.totalAmount)) : "—"}</td>
                      <td className="px-4 py-3"><span className={`status-chip ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="px-4 py-3"><Link href={`/orders/${po.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"><ExternalLink size={14} /></Link></td>
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
