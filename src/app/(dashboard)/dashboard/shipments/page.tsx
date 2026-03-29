import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Truck, ExternalLink } from "lucide-react";

export const metadata = { title: "Shipments" };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  READY_TO_SHIP: { label: "Ready", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Shipped", color: "bg-purple-100 text-purple-700" },
  IN_TRANSIT: { label: "In Transit", color: "bg-yellow-100 text-yellow-700" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700" },
  ON_HOLD: { label: "On Hold", color: "bg-red-100 text-red-700" },
};

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status;

  const shipments = await prisma.shipment.findMany({
    where: statusFilter ? { status: statusFilter as any } : undefined,
    include: {
      order: {
        include: { buyer: { select: { name: true } } }
      },
      updates: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const inTransit = shipments.filter(s => s.status === "SHIPPED" || s.status === "IN_TRANSIT").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments & Logistics</h1>
          <p className="text-muted-foreground text-sm mt-1">Track outbound shipments and dispatch documents</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Total Shipments</p>
          <p className="text-2xl font-bold mt-1">{shipments.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">In Transit</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{inTransit}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/shipments"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
          All
        </Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/dashboard/shipments?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Shipment #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Courier</th>
                <th className="px-4 py-3 font-semibold">Transporter / AWB</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Actual</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Truck size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No shipments found</p>
                    <p className="text-xs mt-1">Shipments are created from the Order detail → Logistics tab</p>
                  </td>
                </tr>
              ) : (
                shipments.map(shipment => {
                  const cfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={shipment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{shipment.shipmentNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${shipment.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">
                          {shipment.order.orderNumber} <ExternalLink size={11} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs">{shipment.order.buyer.name}</td>
                      <td className="px-4 py-3">
                        {shipment.courierName ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">{shipment.courierName}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium">{shipment.transporter || "—"}</p>
                        <p className="text-muted-foreground">{shipment.trackingNumber || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{shipment.expectedDeliveryDate ? formatDate(shipment.expectedDeliveryDate) : "—"}</td>
                      <td className="px-4 py-3 text-sm">{shipment.actualDeliveryDate ? formatDate(shipment.actualDeliveryDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${cfg.color}`}>{cfg.label}</span>
                        {shipment.updates.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[120px]" title={shipment.updates[0].location || ""}>
                            {shipment.updates[0].location || shipment.updates[0].status}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${shipment.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
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
