import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, ExternalLink, TrendingUp, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "Payments" };

type SearchParams = { status?: string };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-600" },
  PARTIAL: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
  WRITTEN_OFF: { label: "Written Off", color: "bg-gray-200 text-gray-500" },
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "CEO", "ACCOUNTANT_ADMIN", "ACCOUNTANT"].includes(role)) redirect("/dashboard");

  const sp = await searchParams;
  const statusFilter = sp.status as any;

  const payments = await prisma.payment.findMany({
    where: statusFilter ? { invoice: { status: statusFilter } } : undefined,
    include: {
      invoice: { include: { order: { include: { buyer: { select: { name: true } } } } } }
    },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });

  const [totalReceived, thisMonth] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }
    }),
  ]);

  const overdueInvoices = await prisma.invoice.count({ where: { status: "OVERDUE" } });
  const statusTabs = ["PENDING", "PARTIAL", "PAID", "OVERDUE"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all inbound payments against invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80">Total Received</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(Number(totalReceived._sum.amount || 0))}</p>
          <p className="text-xs opacity-60 mt-1">All time</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80 flex items-center gap-1"><TrendingUp size={14} /> This Month</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(Number(thisMonth._sum.amount || 0))}</p>
          <p className="text-xs opacity-60 mt-1">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80 flex items-center gap-1"><AlertCircle size={14} /> Overdue Invoices</p>
          <p className="text-2xl font-bold mt-1">{overdueInvoices}</p>
          <Link href="/invoices?status=OVERDUE" className="text-xs opacity-80 hover:opacity-100 underline">View all →</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/payments" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All Payments</Link>
        {statusTabs.map(s => (
          <Link key={s} href={`/payments?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Payment #</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Order / Buyer</th>
                <th className="px-4 py-3 font-semibold">Payment Date</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold text-right">Invoice Total</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold">Invoice Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground"><CreditCard size={40} className="mx-auto mb-3 opacity-40" /><p>No payment records found</p></td></tr>
              ) : (
                payments.map(payment => {
                  const invStatus = STATUS_CONFIG[payment.invoice.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{payment.paymentNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{payment.invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${payment.invoice.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs mb-0.5">{payment.invoice.order.orderNumber} <ExternalLink size={11} /></Link>
                        <p className="text-xs text-muted-foreground">{payment.invoice.order.buyer.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3">{payment.paymentMode ? <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">{payment.paymentMode}</span> : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payment.referenceNumber || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(payment.invoice.totalAmount))}</td>
                      <td className="px-4 py-3 text-right"><span className="font-semibold text-green-600">{formatCurrency(Number(payment.amount))}</span></td>
                      <td className="px-4 py-3"><span className={`status-chip ${invStatus.color}`}>{invStatus.label}</span></td>
                      <td className="px-4 py-3"><Link href={`/orders/${payment.invoice.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"><ExternalLink size={14} /></Link></td>
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
