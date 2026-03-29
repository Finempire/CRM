import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Receipt, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Invoices" };

type SearchParams = { status?: string };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "CEO", "ACCOUNTANT_ADMIN", "ACCOUNTANT"].includes(role)) redirect("/dashboard");

  const sp = await searchParams;
  const statusFilter = sp.status as any;

  const invoices = await prisma.invoice.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      order: { include: { buyer: { select: { name: true, currency: true } } } },
      payments: { select: { amount: true } }
    },
    orderBy: { invoiceDate: "desc" },
    take: 100,
  });

  const [totalDue, overdue, paid] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: { notIn: ["PAID", "CANCELLED"] } } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: "PAID" } }),
  ]);

  const statusTabs = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track order invoices and payment status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Clock size={12} /> Outstanding</p><p className="text-2xl font-bold mt-1">{formatCurrency(Number(totalDue._sum.totalAmount || 0))}</p></div>
        <div className="stat-card border-red-200"><p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={12} /> Overdue Invoices</p><p className="text-2xl font-bold mt-1 text-red-600">{overdue}</p></div>
        <div className="stat-card border-green-200"><p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Collected</p><p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(Number(paid._sum.totalAmount || 0))}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/invoices" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All</Link>
        {statusTabs.map(s => (
          <Link key={s} href={`/invoices?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
            {STATUS_CONFIG[s].label}
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Invoice Date</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  <Receipt size={40} className="mx-auto mb-3 opacity-40" /><p>No invoices found</p>
                </td></tr>
              ) : (
                invoices.map(inv => {
                  const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
                  const balance = Number(inv.totalAmount) - totalPaid;
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                  const isOverdue = inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "PAID");
                  return (
                    <tr key={inv.id} className={`hover:bg-muted/30 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3"><Link href={`/orders/${inv.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">{inv.order.orderNumber} <ExternalLink size={11} /></Link></td>
                      <td className="px-4 py-3 font-medium">{inv.order.buyer.name}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(inv.invoiceDate)}</td>
                      <td className={`px-4 py-3 text-sm ${isOverdue ? "text-red-600 font-semibold" : ""}`}>{inv.dueDate ? formatDate(inv.dueDate) : "—"}{isOverdue && <span className="ml-1 text-[10px] text-red-500">OVERDUE</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(inv.totalAmount))}</td>
                      <td className="px-4 py-3 text-right text-green-600">{totalPaid > 0 ? formatCurrency(totalPaid) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${balance > 0 ? "text-orange-600" : "text-green-600"}`}>{formatCurrency(balance)}</td>
                      <td className="px-4 py-3"><span className={`status-chip ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="px-4 py-3"><Link href={`/orders/${inv.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"><ExternalLink size={14} /></Link></td>
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
