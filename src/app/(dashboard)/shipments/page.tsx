import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Truck, Package, Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export const metadata: Metadata = { title: "Shipments" };

type SearchParams = { status?: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Package },
  READY_TO_SHIP: { label: "Ready to Ship", color: "bg-blue-100 text-blue-700", icon: Package },
  SHIPPED: { label: "Shipped", color: "bg-indigo-100 text-indigo-700", icon: Truck },
  IN_TRANSIT: { label: "In Transit", color: "bg-purple-100 text-purple-700", icon: Truck },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  RETURNED: { label: "Returned", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status as any;

  const shipments = await prisma.shipment.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: { order: { include: { buyer: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const allShipments = await prisma.shipment.groupBy({ by: ["status"], _count: { id: true } });
  const countByStatus = Object.fromEntries(allShipments.map(s => [s.status, s._count.id]));
  const statuses = ["DRAFT", "READY_TO_SHIP", "SHIPPED", "IN_TRANSIT", "DELAYED", "DELIVERED", "RETURNED"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage all order shipments and deliveries</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/shipments" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
          All ({shipments.length})
        </Link>
        {statuses.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Link key={s} href={`/shipments?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
              {cfg.label} {countByStatus[s] ? `(${countByStatus[s]})` : ""}
            </Link>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Shipment #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Transporter / Tracking</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Actual</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shipments.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  <Truck size={40} className="mx-auto mb-3 opacity-40" />
                  <p>No shipments found</p>
                  <p className="text-xs mt-1">Shipments are created from the Order detail page → Shipments tab</p>
                </td></tr>
              ) : (
                shipments.map(shipment => {
                  const cfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.DRAFT;
                  const Icon = cfg.icon;
                  const isOverdue = shipment.status === "IN_TRANSIT" && shipment.expectedDeliveryDate && new Date(shipment.expectedDeliveryDate) < new Date();
                  return (
                    <tr key={shipment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{shipment.shipmentNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${shipment.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          {shipment.order.orderNumber} <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{shipment.order.buyer.name}</td>
                      <td className="px-4 py-3 text-xs"><p className="font-medium">{shipment.transporter || shipment.courierName || "—"}</p><p className="text-muted-foreground">{shipment.trackingNumber || ""}</p></td>
                      <td className="px-4 py-3 text-sm">{shipment.expectedDeliveryDate ? formatDate(shipment.expectedDeliveryDate) : "—"}</td>
                      <td className="px-4 py-3 text-sm">{shipment.actualDeliveryDate ? formatDate(shipment.actualDeliveryDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${cfg.color} ${isOverdue ? "border border-red-300" : ""}`}>
                          <Icon size={12} />{isOverdue ? "Overdue" : cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${shipment.orderId}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                          <ExternalLink size={14} />
                        </Link>
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
