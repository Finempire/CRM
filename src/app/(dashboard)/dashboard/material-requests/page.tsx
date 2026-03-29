import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList, ExternalLink, AlertTriangle } from "lucide-react";

export const metadata = { title: "Material Requests" };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-600" },
  ORDERED: { label: "Ordered", color: "bg-blue-100 text-blue-700" },
  PARTIAL_RECEIVED: { label: "Partial Received", color: "bg-yellow-100 text-yellow-700" },
  FULLY_RECEIVED: { label: "Fully Received", color: "bg-emerald-100 text-emerald-800" },
  READY: { label: "Ready", color: "bg-green-100 text-green-700" },
};

export default async function MaterialRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status;

  const requests = await prisma.materialRequest.findMany({
    where: statusFilter ? { status: statusFilter as any } : undefined,
    include: {
      order: {
        include: { buyer: { select: { name: true } } }
      },
      lines: true
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pending = requests.filter(r => r.status === "PENDING" || r.status === "ORDERED").length;
  const shortages = requests.filter(r => r.status === "PARTIAL_RECEIVED").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Material Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Track internal requisitions for materials from store/inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Total Requests</p>
          <p className="text-2xl font-bold mt-1">{requests.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Pending Action</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{pending}</p>
        </div>
        <div className={`stat-card ${shortages > 0 ? "border-amber-200 bg-amber-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            {shortages > 0 && <AlertTriangle size={12} className="text-amber-500" />} Partial Fulfillments
          </p>
          <p className={`text-2xl font-bold mt-1 ${shortages > 0 ? "text-amber-600" : ""}`}>{shortages}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/material-requests" 
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
          All
        </Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/dashboard/material-requests?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Req #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No material requests found</p>
                    <p className="text-xs mt-1">Requisitions are generated automatically from the Production WIP</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{req.requestNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${req.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">
                          {req.order.orderNumber} <ExternalLink size={11} />
                        </Link>
                        <p className="text-xs text-muted-foreground">{req.order.buyer.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">{req.lines.length} items</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/material-requests/${req.id}`} 
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
