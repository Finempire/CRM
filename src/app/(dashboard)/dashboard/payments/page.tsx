import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { CreditCard, ExternalLink, Link as LinkIcon, AlertTriangle } from "lucide-react";

export const metadata = { title: "Payment History" };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
  PARTIAL: { label: "Partial", color: "bg-blue-100 text-blue-700" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
  WRITTEN_OFF: { label: "Written Off", color: "bg-purple-100 text-purple-700" },
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "CEO", "ACCOUNTANT", "ACCOUNTANT_ADMIN"].includes(role)) redirect("/dashboard");

  const sp = await searchParams;
  const statusFilter = sp.status;

  const payments = await prisma.payment.findMany({
    where: statusFilter ? { status: statusFilter as any } : undefined,
    include: {
      invoice: {
        include: {
          order: { include: { buyer: { select: { name: true } } } }
        }
      },
    },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });

  const totalCollected = payments.filter(p => p.status === "PAID" || p.status === "PARTIAL").reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingCollection = payments.filter(p => p.status === "PENDING").reduce((s, p) => s + Number(p.amount || 0), 0);
  const failedPayments = payments.filter(p => p.status === "OVERDUE").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Collections</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all incoming client payments and bank receipts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Total Collected (Verified)</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Clearance Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{formatCurrency(pendingCollection)}</p>
        </div>
        <div className={`stat-card ${failedPayments > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-500" /> Failed / Rejected
          </p>
          <p className={`text-2xl font-bold mt-1 ${failedPayments > 0 ? "text-red-600" : ""}`}>{failedPayments}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/payments"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
          All
        </Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/dashboard/payments?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Payment #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Invoice Ref</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Mode / Ref</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No payment records found</p>
                    <p className="text-xs mt-1">Record payments globally from the Order detail → Finance tab</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => {
                  const cfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{payment.paymentNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${payment.invoice.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">
                          {payment.invoice.order.buyer.name} <ExternalLink size={11} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{payment.invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(Number(payment.amount))}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{payment.paymentMode || "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{payment.referenceNumber || payment.bankName || "No ref"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {payment.proofUrl ? (
                          <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs hover:bg-secondary font-medium transition-colors">
                            <LinkIcon size={12} /> View
                          </a>
                        ) : "—"}
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
