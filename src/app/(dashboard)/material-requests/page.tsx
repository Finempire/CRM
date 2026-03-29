import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText, ExternalLink, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Material Requests" };

type SearchParams = { status?: string };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-600" },
  ORDERED: { label: "Ordered", color: "bg-blue-100 text-blue-700" },
  PARTIAL_RECEIVED: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  FULLY_RECEIVED: { label: "Received", color: "bg-green-100 text-green-700" },
  READY: { label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  SHORTAGE: { label: "Shortage", color: "bg-red-100 text-red-700" },
};

export default async function MaterialRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status as any;

  const requests = await prisma.materialRequest.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: { order: { include: { buyer: { select: { name: true } } } }, lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const shortages = requests.filter(r => r.status === "SHORTAGE").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Material Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Track material procurement requests across all orders</p>
        </div>
      </div>

      {shortages > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <p className="text-sm font-semibold">{shortages} material request{shortages !== 1 ? "s" : ""} with shortages</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/material-requests" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All</Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/material-requests?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Request #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground"><FileText size={40} className="mx-auto mb-3 opacity-40" /><p>No material requests found</p></td></tr>
              ) : (
                requests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{req.requestNumber}</td>
                      <td className="px-4 py-3"><Link href={`/orders/${req.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">{req.order.orderNumber} <ExternalLink size={11} /></Link></td>
                      <td className="px-4 py-3 font-medium">{req.order.buyer.name}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{req.lines.length} items</span></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3"><span className={`status-chip ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="px-4 py-3"><Link href={`/orders/${req.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"><ExternalLink size={14} /></Link></td>
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
