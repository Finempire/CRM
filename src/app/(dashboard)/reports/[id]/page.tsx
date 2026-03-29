import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; buyer?: string; merchandiser?: string; status?: string; orderType?: string }>;
}

const REPORT_META: Record<string, { title: string; description: string; financeOnly: boolean }> = {
  "costing": { title: "Costing Report", description: "Full costing breakdown per order", financeOnly: true },
  "order-profitability": { title: "Order Profitability", description: "Revenue, cost, and margin analysis", financeOnly: true },
  "production-progress": { title: "Production Progress", description: "Stage-wise progress per order", financeOnly: false },
  "tna-delay": { title: "TNA Delay Report", description: "Overdue and at-risk TNA milestones", financeOnly: false },
  "buyer-order-summary": { title: "Buyer-wise Order Summary", description: "Orders grouped by buyer", financeOnly: false },
  "vendor-purchase": { title: "Vendor Purchase Report", description: "All POs by vendor", financeOnly: false },
  "material-consumption": { title: "Material Consumption", description: "Material issued vs received vs wastage", financeOnly: false },
  "job-work": { title: "Job Work Report", description: "Job work requirements and status", financeOnly: false },
  "shipment-performance": { title: "Shipment Performance", description: "On-time vs delayed shipments", financeOnly: false },
  "invoice-payment-aging": { title: "Invoice & Payment Aging", description: "Outstanding invoices by aging bucket", financeOnly: true },
  "user-activity-audit": { title: "User Activity Audit", description: "All user actions by type", financeOnly: false },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = REPORT_META[id];
  return { title: meta ? meta.title : "Report" };
}

export default async function ReportDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const meta = REPORT_META[id];
  if (!meta) notFound();

  const role = (session.user as any).role as UserRole;
  const canViewFinancial = hasPermission(role, "view:financial_data");
  if (meta.financeOnly && !canViewFinancial) redirect("/reports");

  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = sp.to ? new Date(sp.to) : new Date();

  // ─── Costing Report ────────────────────────────────────────────────
  if (id === "costing") {
    const rows = await prisma.costing.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { order: { include: { buyer: true } } },
      orderBy: { createdAt: "desc" },
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3 text-right">Fabric</th><th className="px-4 py-3 text-right">Labour</th>
              <th className="px-4 py-3 text-right">Job Work</th><th className="px-4 py-3 text-right">Total Cost</th>
              <th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Margin</th>
              <th className="px-4 py-3 text-right">Margin%</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No costing records found for this period</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3"><Link href={`/orders/${row.orderId}`} className="text-primary hover:underline font-medium">{row.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{row.order.buyer.name}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(row.fabricCost) + Number(row.trimmingsCost) + Number(row.accessoriesCost))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(row.cuttingCost) + Number(row.stitchingCost) + Number(row.finishingCost))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(row.printingCost) + Number(row.embroideryCost) + Number(row.washingCost) + Number(row.otherJobWorkCost))}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(row.totalCost))}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(row.totalRevenue))}</td>
                <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(Number(row.grossMargin))}</td>
                <td className="px-4 py-3 text-right"><span className={`font-bold ${Number(row.marginPercent) >= 20 ? "text-green-600" : Number(row.marginPercent) >= 10 ? "text-amber-600" : "text-red-600"}`}>{Number(row.marginPercent).toFixed(1)}%</span></td>
                <td className="px-4 py-3"><span className="status-chip bg-gray-100 text-gray-700">{row.approvalStatus}</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-muted/30 font-semibold text-sm">
              <tr>
                <td colSpan={5} className="px-4 py-3">Totals ({rows.length} orders)</td>
                <td className="px-4 py-3 text-right">{formatCurrency(rows.reduce((s, r) => s + Number(r.totalCost), 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(rows.reduce((s, r) => s + Number(r.totalRevenue), 0))}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatCurrency(rows.reduce((s, r) => s + Number(r.grossMargin), 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </ReportShell>
    );
  }

  // ─── Order Profitability ───────────────────────────────────────────
  if (id === "order-profitability") {
    const rows = await prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      include: { buyer: true, costing: true, invoices: { select: { totalAmount: true, paidAmount: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Shipment</th><th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Margin</th>
              <th className="px-4 py-3 text-right">Margin%</th><th className="px-4 py-3 text-right">Invoiced</th>
              <th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">No orders found for this period</td></tr>
            ) : rows.map(row => {
              const totalInvoiced = row.invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
              const totalCollected = row.invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><Link href={`/orders/${row.id}`} className="text-primary hover:underline font-medium">{row.orderNumber}</Link></td>
                  <td className="px-4 py-3">{row.buyer.name}</td>
                  <td className="px-4 py-3"><span className="status-chip bg-blue-50 text-blue-700">{row.type}</span></td>
                  <td className="px-4 py-3">{row.shipmentDate ? formatDate(row.shipmentDate) : "—"}</td>
                  <td className="px-4 py-3 text-right">{row.costing ? formatCurrency(Number(row.costing.totalRevenue)) : "—"}</td>
                  <td className="px-4 py-3 text-right">{row.costing ? formatCurrency(Number(row.costing.totalCost)) : "—"}</td>
                  <td className="px-4 py-3 text-right text-green-600">{row.costing ? formatCurrency(Number(row.costing.grossMargin)) : "—"}</td>
                  <td className="px-4 py-3 text-right">{row.costing ? <span className={Number(row.costing.marginPercent) >= 20 ? "text-green-600 font-bold" : "text-amber-600"}>{Number(row.costing.marginPercent).toFixed(1)}%</span> : "—"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalInvoiced)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalCollected)}</td>
                  <td className="px-4 py-3"><span className="status-chip bg-gray-100 text-gray-700 text-[10px]">{row.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Production Progress ───────────────────────────────────────────
  if (id === "production-progress") {
    const rows = await prisma.productionPlan.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        order: { include: { buyer: true } },
        stages: { include: { updates: { take: 1, orderBy: { date: "desc" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const STAGES = ["CUTTING", "STITCHING", "FINISHING", "PACKING"] as const;
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Plan Start</th><th className="px-4 py-3">Plan End</th>
              {STAGES.map(s => <th key={s} className="px-4 py-3 text-center">{s}</th>)}
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No production plans found</td></tr>
            ) : rows.map(plan => (
              <tr key={plan.id} className="hover:bg-muted/20">
                <td className="px-4 py-3"><Link href={`/orders/${plan.orderId}?tab=production`} className="text-primary hover:underline font-medium">{plan.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{plan.order.buyer.name}</td>
                <td className="px-4 py-3">{plan.plannedStartDate ? formatDate(plan.plannedStartDate) : "—"}</td>
                <td className="px-4 py-3">{plan.plannedFinishDate ? formatDate(plan.plannedFinishDate) : "—"}</td>
                {STAGES.map(stage => {
                  const s = plan.stages.find(x => x.stage === stage);
                  const pct = s && s.plannedQty > 0 ? Math.round((s.actualQty / s.plannedQty) * 100) : 0;
                  return (
                    <td key={stage} className="px-4 py-3 text-center">
                      {s ? <div><div className="text-xs font-semibold">{pct}%</div><div className="text-[10px] text-muted-foreground">{s.actualQty}/{s.plannedQty}</div></div> : "—"}
                    </td>
                  );
                })}
                <td className="px-4 py-3"><span className={`status-chip text-[10px] ${plan.actualFinishDate ? "bg-green-100 text-green-700" : plan.isApproved ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{plan.actualFinishDate ? "DONE" : plan.isApproved ? "ACTIVE" : "PLANNED"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── TNA Delay Report ─────────────────────────────────────────────
  if (id === "tna-delay") {
    const rows = await prisma.tnaMilestone.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS", "DELAYED"] },
        plannedDate: { lte: new Date() },
      },
      include: { order: { include: { buyer: true, merchandiser: { select: { name: true } } } } },
      orderBy: { plannedDate: "asc" },
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Milestone</th><th className="px-4 py-3">Planned</th>
              <th className="px-4 py-3">Actual</th><th className="px-4 py-3">Delay (days)</th>
              <th className="px-4 py-3">Merchandiser</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No delayed TNA milestones — great performance!</td></tr>
            ) : rows.map(row => {
              const delayDays = Math.floor((Date.now() - new Date(row.plannedDate).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><Link href={`/orders/${row.orderId}?tab=merchandising`} className="text-primary hover:underline font-medium">{row.order.orderNumber}</Link></td>
                  <td className="px-4 py-3">{row.order.buyer.name}</td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-red-600">{formatDate(row.plannedDate)}</td>
                  <td className="px-4 py-3">{row.actualDate ? formatDate(row.actualDate) : "—"}</td>
                  <td className="px-4 py-3"><span className={`font-bold ${delayDays > 14 ? "text-red-600" : delayDays > 7 ? "text-amber-600" : "text-orange-500"}`}>{delayDays}d</span></td>
                  <td className="px-4 py-3">{row.order.merchandiser?.name || "—"}</td>
                  <td className="px-4 py-3"><span className="status-chip bg-red-100 text-red-700 text-[10px]">{row.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Buyer-wise Order Summary ─────────────────────────────────────
  if (id === "buyer-order-summary") {
    const orders = await prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      include: { buyer: true, costing: { select: { totalRevenue: true, grossMargin: true } } },
    });
    const grouped: Record<string, { buyer: string; count: number; revenue: number; statuses: Record<string, number> }> = {};
    for (const o of orders) {
      if (!grouped[o.buyerId]) grouped[o.buyerId] = { buyer: o.buyer.name, count: 0, revenue: 0, statuses: {} };
      grouped[o.buyerId].count++;
      if (o.costing) grouped[o.buyerId].revenue += Number(o.costing.totalRevenue);
      grouped[o.buyerId].statuses[o.status] = (grouped[o.buyerId].statuses[o.status] || 0) + 1;
    }
    const rows = Object.values(grouped).sort((a, b) => b.count - a.count);
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Buyer</th><th className="px-4 py-3 text-center">Total Orders</th>
              <th className="px-4 py-3 text-center">Active</th><th className="px-4 py-3 text-center">Closed</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No orders found</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{row.buyer}</td>
                <td className="px-4 py-3 text-center font-bold text-lg">{row.count}</td>
                <td className="px-4 py-3 text-center text-blue-600">{(row.statuses.PRODUCTION || 0) + (row.statuses.MERCHANDISING || 0) + (row.statuses.LOGISTICS || 0)}</td>
                <td className="px-4 py-3 text-center text-green-600">{(row.statuses.CLOSED || 0) + (row.statuses.PAID || 0)}</td>
                <td className="px-4 py-3 text-right font-semibold">{row.revenue > 0 ? formatCurrency(row.revenue) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Vendor Purchase Report ───────────────────────────────────────
  if (id === "vendor-purchase") {
    const rows = await prisma.purchaseOrder.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      include: { vendor: true, order: { include: { buyer: true } }, lines: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">PO Number</th><th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Created</th><th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No purchase orders found</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs font-medium">{row.poNumber}</td>
                <td className="px-4 py-3 font-medium">{row.vendor.name}</td>
                <td className="px-4 py-3"><Link href={`/orders/${row.orderId}`} className="text-primary hover:underline">{row.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{row.order.buyer.name}</td>
                <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3">{row.deliveryDate ? formatDate(row.deliveryDate) : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(row.grandTotal))}</td>
                <td className="px-4 py-3"><span className="status-chip bg-gray-100 text-gray-700 text-[10px]">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-muted/30 font-semibold text-sm">
              <tr>
                <td colSpan={6} className="px-4 py-3">Total ({rows.length} POs)</td>
                <td className="px-4 py-3 text-right">{formatCurrency(rows.reduce((s, r) => s + Number(r.grandTotal), 0))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </ReportShell>
    );
  }

  // ─── Material Consumption ─────────────────────────────────────────
  if (id === "material-consumption") {
    const rows = await prisma.bomItem.findMany({
      where: { order: { deletedAt: null, createdAt: { gte: from, lte: to } } },
      include: { order: { include: { buyer: true } }, vendor: { select: { name: true } } },
      orderBy: [{ order: { orderNumber: "asc" } }, { category: "asc" }],
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Category</th><th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Required</th><th className="px-4 py-3 text-right">Wastage%</th>
              <th className="px-4 py-3 text-right">Net Required</th><th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Est. Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No BOM items found</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3"><Link href={`/orders/${row.orderId}?tab=material`} className="text-primary hover:underline font-medium">{row.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{row.order.buyer.name}</td>
                <td className="px-4 py-3"><span className="status-chip bg-blue-50 text-blue-700 text-[10px]">{row.category}</span></td>
                <td className="px-4 py-3 font-medium">{row.itemName}</td>
                <td className="px-4 py-3 text-right">{Number(row.requiredQty).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{Number(row.wastagePercent).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-semibold">{Number(row.netRequiredQty).toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.unit}</td>
                <td className="px-4 py-3">{row.vendor?.name || "—"}</td>
                <td className="px-4 py-3 text-right">{row.estimatedAmount ? formatCurrency(Number(row.estimatedAmount)) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Job Work Report ──────────────────────────────────────────────
  if (id === "job-work") {
    const rows = await prisma.jobWorkRequirement.findMany({
      where: { order: { deletedAt: null, createdAt: { gte: from, lte: to } } },
      include: { order: { include: { buyer: true } }, vendor: { select: { name: true } } },
      orderBy: [{ order: { orderNumber: "asc" } }, { type: "asc" }],
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No job work requirements found</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3"><Link href={`/orders/${row.orderId}?tab=merchandising`} className="text-primary hover:underline font-medium">{row.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{row.order.buyer.name}</td>
                <td className="px-4 py-3"><span className="status-chip bg-purple-50 text-purple-700 text-[10px]">{row.type}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
                <td className="px-4 py-3 text-center">{row.quantity || "—"}{row.unit ? ` ${row.unit}` : ""}</td>
                <td className="px-4 py-3">{row.vendor?.name || "—"}</td>
                <td className="px-4 py-3 text-right">{row.rate ? formatCurrency(Number(row.rate)) : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{row.amount ? formatCurrency(Number(row.amount)) : "—"}</td>
                <td className="px-4 py-3">{row.dueDate ? formatDate(row.dueDate) : "—"}</td>
                <td className="px-4 py-3"><span className={`status-chip text-[10px] ${row.status === "COMPLETED" ? "bg-green-100 text-green-700" : row.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Shipment Performance ─────────────────────────────────────────
  if (id === "shipment-performance") {
    const rows = await prisma.shipment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { order: { include: { buyer: true } } },
      orderBy: { createdAt: "desc" },
    });
    const delivered = rows.filter(r => r.status === "DELIVERED");
    const onTime = delivered.filter(r => r.actualDeliveryDate && r.expectedDeliveryDate && new Date(r.actualDeliveryDate) <= new Date(r.expectedDeliveryDate));
    const delayed = rows.filter(r => r.status === "DELAYED");
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <div className="grid grid-cols-4 gap-4 p-4 border-b">
          {[
            { label: "Total Shipments", value: rows.length, color: "text-foreground" },
            { label: "Delivered", value: delivered.length, color: "text-green-600" },
            { label: "On-time", value: onTime.length, color: "text-blue-600" },
            { label: "Delayed", value: delayed.length, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Shipment #</th><th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Transporter</th>
              <th className="px-4 py-3">Dispatch</th><th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Actual</th><th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No shipments found</td></tr>
            ) : rows.map(row => {
              const isOnTime = row.actualDeliveryDate && row.expectedDeliveryDate && new Date(row.actualDeliveryDate) <= new Date(row.expectedDeliveryDate);
              const isLate = row.actualDeliveryDate && row.expectedDeliveryDate && new Date(row.actualDeliveryDate) > new Date(row.expectedDeliveryDate);
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{row.shipmentNumber}</td>
                  <td className="px-4 py-3"><Link href={`/orders/${row.orderId}`} className="text-primary hover:underline">{row.order.orderNumber}</Link></td>
                  <td className="px-4 py-3">{row.order.buyer.name}</td>
                  <td className="px-4 py-3">{row.transporter || row.courierName || "—"}</td>
                  <td className="px-4 py-3">{row.dispatchDate ? formatDate(row.dispatchDate) : "—"}</td>
                  <td className="px-4 py-3">{row.expectedDeliveryDate ? formatDate(row.expectedDeliveryDate) : "—"}</td>
                  <td className="px-4 py-3">{row.actualDeliveryDate ? formatDate(row.actualDeliveryDate) : "—"}</td>
                  <td className="px-4 py-3 text-right">{row.shippingCost ? formatCurrency(Number(row.shippingCost)) : "—"}</td>
                  <td className="px-4 py-3">
                    {row.status === "DELIVERED" ? (
                      isOnTime ? <span className="status-chip bg-green-100 text-green-700 text-[10px]">ON-TIME</span> :
                      isLate ? <span className="status-chip bg-red-100 text-red-700 text-[10px]">LATE</span> : null
                    ) : <span className="status-chip bg-gray-100 text-gray-600 text-[10px]">{row.status}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── Invoice & Payment Aging ──────────────────────────────────────
  if (id === "invoice-payment-aging") {
    const now = new Date();
    const rows = await prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ["PAID", "CANCELLED"] } },
      include: { order: { include: { buyer: true } }, payments: { select: { amount: true } } },
      orderBy: { invoiceDate: "asc" },
    });
    const bucket = (dueDate: Date | null) => {
      if (!dueDate) return "No Due Date";
      const days = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) return "Not Due";
      if (days <= 30) return "0-30 days";
      if (days <= 60) return "31-60 days";
      if (days <= 90) return "61-90 days";
      return "90+ days";
    };
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Invoice #</th><th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Invoice Date</th>
              <th className="px-4 py-3">Due Date</th><th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Aging Bucket</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No outstanding invoices — all paid!</td></tr>
            ) : rows.map(row => {
              const paid = row.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Number(row.totalAmount) - paid;
              const b = bucket(row.dueDate);
              const bucketColor = b === "90+ days" ? "bg-red-100 text-red-700" : b === "61-90 days" ? "bg-orange-100 text-orange-700" : b === "31-60 days" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{row.invoiceNumber}</td>
                  <td className="px-4 py-3"><Link href={`/orders/${row.orderId}`} className="text-primary hover:underline">{row.order.orderNumber}</Link></td>
                  <td className="px-4 py-3">{row.order.buyer.name}</td>
                  <td className="px-4 py-3">{formatDate(row.invoiceDate)}</td>
                  <td className="px-4 py-3">{row.dueDate ? formatDate(row.dueDate) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(row.totalAmount))}</td>
                  <td className="px-4 py-3 text-right text-green-600">{paid > 0 ? formatCurrency(paid) : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{formatCurrency(balance)}</td>
                  <td className="px-4 py-3"><span className={`status-chip text-[10px] ${bucketColor}`}>{b}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  // ─── User Activity Audit ──────────────────────────────────────────
  if (id === "user-activity-audit") {
    const rows = await prisma.activityLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return (
      <ReportShell title={meta.title} description={meta.description} from={from} to={to}>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th><th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th><th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No activity records found</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-medium">{row.user?.name || row.userEmail || "—"}</td>
                <td className="px-4 py-3 text-xs">{row.user?.role || "—"}</td>
                <td className="px-4 py-3"><span className={`status-chip text-[10px] ${row.action === "CREATED" ? "bg-green-100 text-green-700" : row.action === "DELETED" ? "bg-red-100 text-red-700" : row.action === "APPROVED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{row.action}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.entityType}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>
    );
  }

  return notFound();
}

// ─── Shared Report Shell ──────────────────────────────────────────────────────

function ReportShell({
  title,
  description,
  from,
  to,
  children,
}: {
  title: string;
  description: string;
  from: Date;
  to: Date;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Reports
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title">{title}</h1>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <span>{description}</span>
        <span className="ml-auto">Period: {from.toLocaleDateString("en-IN")} – {to.toLocaleDateString("en-IN")}</span>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}
