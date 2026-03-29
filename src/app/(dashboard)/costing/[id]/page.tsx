import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { FINANCE_ROLES } from "@/lib/permissions";
import Link from "next/link";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { CostingForm } from "./CostingForm";

export const metadata: Metadata = { title: "Costing Detail" };

export default async function CostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  if (!FINANCE_ROLES.includes(role)) redirect("/dashboard");

  const { id } = await params;

  const costing = await prisma.costing.findUnique({
    where: { id },
    include: {
      order: {
        include: { buyer: { select: { name: true, code: true, currency: true } } },
      },
      lineItems: true,
    },
  });

  if (!costing) notFound();

  const canApprove = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(role);

  const costGroups = [
    { label: "Materials", items: [
      { key: "fabricCost", label: "Fabric" },
      { key: "trimmingsCost", label: "Trimmings" },
      { key: "accessoriesCost", label: "Accessories" },
      { key: "packagingCost", label: "Packaging" },
    ]},
    { label: "Labour", items: [
      { key: "cuttingCost", label: "Cutting" },
      { key: "stitchingCost", label: "Stitching" },
      { key: "finishingCost", label: "Finishing" },
    ]},
    { label: "Job Work", items: [
      { key: "printingCost", label: "Printing" },
      { key: "embroideryCost", label: "Embroidery" },
      { key: "washingCost", label: "Washing" },
      { key: "otherJobWorkCost", label: "Other Job Work" },
    ]},
    { label: "Overhead & Transport", items: [
      { key: "overheadCost", label: "Overhead" },
      { key: "shippingCost", label: "Shipping" },
    ]},
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/costing" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Costing — {costing.order.orderNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(costing.approvalStatus)}`}>
              {costing.approvalStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{costing.order.buyer.name} · Updated {formatDate(costing.updatedAt)}</p>
        </div>
        <Link href={`/orders/${costing.orderId}`} className="px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-accent">
          View Order
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {costGroups.map((group) => (
            <div key={group.label} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">{group.label}</h3>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const val = Number((costing as any)[item.key]);
                  return (
                    <div key={item.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={val > 0 ? "font-medium" : "text-muted-foreground"}>
                        {val > 0 ? formatCurrency(val, costing.order.buyer.currency) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {costing.notes && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{costing.notes}</p>
            </div>
          )}

          {/* Edit form */}
          {costing.approvalStatus === "PENDING" || costing.approvalStatus === "CHANGES_REQUESTED" ? (
            <CostingForm costingId={costing.id} initialValues={costing as any} currency={costing.order.buyer.currency} />
          ) : null}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-base">Financial Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-semibold">{formatCurrency(Number(costing.totalCost), costing.order.buyer.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selling Rate (per pc)</span>
                <span className="font-semibold">{formatCurrency(Number(costing.sellingRate), costing.order.buyer.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-semibold">{formatCurrency(Number(costing.totalRevenue), costing.order.buyer.currency)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-muted-foreground">Gross Margin</span>
                <span className="font-semibold">{formatCurrency(Number(costing.grossMargin), costing.order.buyer.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin %</span>
                <span className={`font-bold text-base ${Number(costing.marginPercent) >= 20 ? "text-green-600" : Number(costing.marginPercent) >= 10 ? "text-amber-600" : "text-red-600"}`}>
                  {Number(costing.marginPercent).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Approval */}
          {canApprove && costing.approvalStatus === "PENDING" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-base">Approval</h3>
              <form action={`/api/costing/${costing.id}/approve`} method="POST" className="space-y-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Costing
                </button>
              </form>
              <form action={`/api/costing/${costing.id}/reject`} method="POST" className="space-y-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive/30 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4" /> Request Changes
                </button>
              </form>
            </div>
          )}

          {costing.approvedAt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p className="font-medium">Approved</p>
              <p className="text-xs mt-0.5">{formatDate(costing.approvedAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
