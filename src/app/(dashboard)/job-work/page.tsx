import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import { Wrench, ExternalLink } from "lucide-react";

export const metadata: Metadata = { title: "Job Work" };

type SearchParams = { type?: string; status?: string; orderId?: string };

const JOB_TYPES = ["PRINTING", "EMBROIDERY", "WASHING", "DYEING", "FINISHING", "STITCHING_SUB"];

const TYPE_COLORS: Record<string, string> = {
  PRINTING:      "bg-blue-100 text-blue-700",
  EMBROIDERY:    "bg-purple-100 text-purple-700",
  WASHING:       "bg-cyan-100 text-cyan-700",
  DYEING:        "bg-pink-100 text-pink-700",
  FINISHING:     "bg-amber-100 text-amber-700",
  STITCHING_SUB: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

export default async function JobWorkPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  const sp = await searchParams;

  const canEdit = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "MERCHANDISER", "ADMIN_OPERATIONS"].includes(role);

  const where: any = {
    order: { deletedAt: null },
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.orderId ? { orderId: sp.orderId } : {}),
    ...(role === "MERCHANDISER" ? { order: { merchandiserId: session.user.id } } : {}),
  };

  const jobWorks = await prisma.jobWorkRequirement.findMany({
    where,
    include: {
      order: { include: { buyer: { select: { name: true } } } },
      vendor: { select: { id: true, name: true } },
    },
    orderBy: [{ order: { orderNumber: "asc" } }, { type: "asc" }],
    take: 200,
  });

  const summary = JOB_TYPES.map(type => ({
    type,
    total: jobWorks.filter(j => j.type === type).length,
    amount: jobWorks.filter(j => j.type === type).reduce((s, j) => s + Number(j.amount || 0), 0),
  })).filter(s => s.total > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Wrench size={22} /> Job Work</h1>
          <p className="text-muted-foreground text-sm mt-1">Subcontracting requirements across all orders</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summary.map(s => (
            <Link key={s.type} href={`/job-work?type=${s.type}`}
              className={`rounded-xl p-3 text-center hover:shadow-md transition-all cursor-pointer ${sp.type === s.type ? "ring-2 ring-primary" : ""}`}
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <span className={`status-chip text-[10px] mb-1 ${TYPE_COLORS[s.type] || "bg-gray-100 text-gray-600"}`}>{s.type.replace("_", " ")}</span>
              <p className="text-xl font-bold mt-1">{s.total}</p>
              <p className="text-xs text-muted-foreground">{s.amount > 0 ? formatCurrency(s.amount) : "No rates"}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/job-work" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!sp.type && !sp.status ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All</Link>
        {JOB_TYPES.map(t => (
          <Link key={t} href={`/job-work?type=${t}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sp.type === t ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
            {t.replace("_", " ")}
          </Link>
        ))}
        <div className="border-l mx-1" />
        {["PENDING", "IN_PROGRESS", "COMPLETED"].map(s => (
          <Link key={s} href={`/job-work?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sp.status === s ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-center">Qty</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobWorks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Wrench size={40} className="mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-muted-foreground font-medium">No job work requirements found</p>
                    <p className="text-xs text-muted-foreground mt-1">Job work items are added from the Order → Merchandising tab</p>
                  </td>
                </tr>
              ) : (
                jobWorks.map(jw => (
                  <tr key={jw.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${jw.orderId}?tab=merchandising`}
                        className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">
                        {jw.order.orderNumber} <ExternalLink size={11} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{jw.order.buyer.name}</td>
                    <td className="px-4 py-3">
                      <span className={`status-chip text-[10px] ${TYPE_COLORS[jw.type] || "bg-gray-100 text-gray-600"}`}>
                        {jw.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{jw.description || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {jw.quantity ? `${jw.quantity}${jw.unit ? ` ${jw.unit}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {jw.vendor ? (
                        <Link href={`/vendors/${jw.vendor.id}`} className="text-primary hover:underline text-xs">
                          {jw.vendor.name}
                        </Link>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {jw.rate ? formatCurrency(Number(jw.rate)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {jw.amount ? formatCurrency(Number(jw.amount)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {jw.dueDate ? (
                        <span className={new Date(jw.dueDate) < new Date() && jw.status !== "COMPLETED" ? "text-red-600 font-semibold" : ""}>
                          {formatDate(jw.dueDate)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-chip text-[10px] ${STATUS_COLORS[jw.status] || "bg-gray-100 text-gray-600"}`}>
                        {jw.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {jobWorks.length > 0 && (
              <tfoot className="bg-muted/30 text-sm font-semibold">
                <tr>
                  <td colSpan={7} className="px-4 py-3">Total ({jobWorks.length} items)</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(jobWorks.reduce((s, j) => s + Number(j.amount || 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
