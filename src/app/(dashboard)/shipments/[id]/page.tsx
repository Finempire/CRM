import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Truck, Package, CheckCircle2, AlertTriangle, Clock,
  MapPin, ArrowLeft, ExternalLink, Navigation, Box
} from "lucide-react";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = await prisma.shipment.findUnique({ where: { id }, select: { shipmentNumber: true } });
  return { title: s ? `Shipment ${s.shipmentNumber}` : "Shipment" };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Package },
  READY_TO_SHIP: { label: "Ready to Ship", color: "bg-blue-100 text-blue-700", icon: Package },
  SHIPPED: { label: "Shipped", color: "bg-indigo-100 text-indigo-700", icon: Truck },
  IN_TRANSIT: { label: "In Transit", color: "bg-purple-100 text-purple-700", icon: Navigation },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  RETURNED: { label: "Returned", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

export default async function ShipmentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          buyer: true,
          orderLines: true,
        },
      },
      updates: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!shipment) notFound();

  const cfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const isOverdue = shipment.status === "IN_TRANSIT" && shipment.expectedDeliveryDate && new Date(shipment.expectedDeliveryDate) < new Date();

  const totalQty = shipment.order.orderLines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/shipments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Shipments
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title">{shipment.shipmentNumber}</h1>
        </div>
        <span className={`status-chip ${cfg.color} ${isOverdue ? "border border-red-400" : ""}`}>
          <Icon size={14} />
          {isOverdue ? "OVERDUE" : cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Summary */}
          <div className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Box size={18} /> Order Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Order Number</p>
                <Link href={`/orders/${shipment.orderId}`} className="font-semibold text-primary hover:underline flex items-center gap-1 mt-0.5">
                  {shipment.order.orderNumber} <ExternalLink size={12} />
                </Link>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Buyer</p>
                <p className="font-semibold mt-0.5">{shipment.order.buyer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                <p className="font-semibold mt-0.5">{totalQty.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cartons</p>
                <p className="font-semibold mt-0.5">{shipment.cartonCount || "—"}</p>
              </div>
              {shipment.grossWeight && (
                <div>
                  <p className="text-xs text-muted-foreground">Gross Weight</p>
                  <p className="font-semibold mt-0.5">{Number(shipment.grossWeight).toFixed(2)} kg</p>
                </div>
              )}
              {shipment.netWeight && (
                <div>
                  <p className="text-xs text-muted-foreground">Net Weight</p>
                  <p className="font-semibold mt-0.5">{Number(shipment.netWeight).toFixed(2)} kg</p>
                </div>
              )}
              {shipment.cbm && (
                <div>
                  <p className="text-xs text-muted-foreground">Volume (CBM)</p>
                  <p className="font-semibold mt-0.5">{Number(shipment.cbm).toFixed(3)} m³</p>
                </div>
              )}
            </div>
          </div>

          {/* Transport Details */}
          <div className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Truck size={18} /> Transport Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Transporter / Courier</p>
                <p className="font-semibold mt-0.5">{shipment.transporter || shipment.courierName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tracking Number</p>
                <p className="font-semibold font-mono mt-0.5">{shipment.trackingNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dispatch Date</p>
                <p className="font-semibold mt-0.5">{shipment.dispatchDate ? formatDate(shipment.dispatchDate) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Delivery</p>
                <p className={`font-semibold mt-0.5 ${isOverdue ? "text-red-600" : ""}`}>
                  {shipment.expectedDeliveryDate ? formatDate(shipment.expectedDeliveryDate) : "—"}
                  {isOverdue && <span className="ml-2 text-xs text-red-500">OVERDUE</span>}
                </p>
              </div>
              {shipment.actualDeliveryDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Actual Delivery</p>
                  <p className="font-semibold mt-0.5 text-green-600">{formatDate(shipment.actualDeliveryDate)}</p>
                </div>
              )}
            </div>

            {(shipment.fromAddress || shipment.toAddress) && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                {shipment.fromAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={11} /> From</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{shipment.fromAddress}</p>
                  </div>
                )}
                {shipment.toAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={11} /> To</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{shipment.toAddress}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* POD */}
          {shipment.podUrl && (
            <div className="bg-card border rounded-xl p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-600" /> Proof of Delivery</h2>
              <a href={shipment.podUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm hover:bg-green-100 transition-colors">
                <ExternalLink size={14} /> View POD Document
              </a>
            </div>
          )}

          {/* Tracking Timeline */}
          <div className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Clock size={18} /> Tracking History</h2>
            {shipment.updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tracking updates yet</p>
            ) : (
              <div className="space-y-0">
                {shipment.updates.map((update, i) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                      {i < shipment.updates.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`status-chip text-[10px] ${update.status === "DELIVERED" ? "bg-green-100 text-green-700" : update.status === "DELAYED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {update.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(update.updatedAt).toLocaleString("en-IN")}</span>
                      </div>
                      {update.location && <p className="text-sm font-medium mt-1 flex items-center gap-1"><MapPin size={12} className="text-muted-foreground" />{update.location}</p>}
                      {update.note && <p className="text-sm text-muted-foreground mt-0.5">{update.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Cost Summary */}
          <div className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold mb-4">Cost Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Cost</span>
                <span className="font-semibold">{shipment.shippingCost ? formatCurrency(Number(shipment.shippingCost)) : "—"}</span>
              </div>
              {shipment.insuranceCost && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-semibold">{formatCurrency(Number(shipment.insuranceCost))}</span>
                </div>
              )}
              {(shipment.shippingCost || shipment.insuranceCost) && (
                <div className="flex justify-between text-sm font-bold border-t pt-3 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency((Number(shipment.shippingCost) || 0) + (Number(shipment.insuranceCost) || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {shipment.notes && (
            <div className="bg-card border rounded-xl p-6">
              <h2 className="font-semibold mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold mb-3">Actions</h2>
            <div className="space-y-2">
              <Link href={`/orders/${shipment.orderId}?tab=logistics`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <ExternalLink size={15} /> View Full Order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
