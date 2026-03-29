import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Receipt, AlertTriangle, ExternalLink, Calendar } from "lucide-react";

export const metadata = { title: "Invoices" };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", color: "bg-indigo-100 text-indigo-700" },
  PARTIAL: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
  VOID: { label: "Void", color: "bg-gray-200 text-gray-500" },
};

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Finance lock!
  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "CEO", "ACCOUNTANT", "ACCOUNTANT_ADMIN"].includes(role)) redirect("/dashboard");

  const sp = await searchParams;
  const statusFilter = sp.status;

  const invoices = await prisma.invoice.findMany({
    where: statusFilter ? { status: statusFilter as any } : undefined,
    include: {
      order: {
        include: { buyer: { select: { name: true } } }
      },
    },
    orderBy: { invoiceDate: "desc" },
    take: 100,
  });

  const totalOutstanding = invoices.reduce((s, inv) => s + Number(inv.balanceAmount || 0), 0);
  const overdueInvoices = invoices.filter(inv => inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < new Date() && Number(inv.balanceAmount) > 0));
  const overdueValue = overdueInvoices.reduce((s, inv) => s + Number(inv.balanceAmount || 0), 0);
  const paidThisMonth = invoices.filter(inv => inv.status === "PAID" && new Date(inv.invoiceDate).getMonth() === new Date().getMonth())
                                .reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts Receivable</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage client invoices and track outstanding payments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Total Receivables</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className={`stat-card ${overdueInvoices.length > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-500" /> Overdue Value
          </p>
          <p className={`text-2xl font-bold mt-1 ${overdueInvoices.length > 0 ? "text-red-600" : ""}`}>{formatCurrency(overdueValue)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium text-red-600 font-bold">Overdue Invoices</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{overdueInvoices.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Paid This Month</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(paidThisMonth)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/invoices"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
          All
        </Link>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link key={s} href={`/dashboard/invoices?status=${s}`}
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
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Receipt size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No invoices found</p>
                    <p className="text-xs mt-1">Invoices are generated from the Order detail → Finance tab</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => {
                  let statusLabel = inv.status;
                  let statusColor = "bg-gray-100 text-gray-600";
                  const isPastDue = inv.status !== "PAID" && inv.status !== "VOID" && inv.dueDate && new Date(inv.dueDate) < new Date();
                  
                  if (isPastDue) { statusLabel = "OVERDUE"; statusColor = "bg-red-100 text-red-700"; }
                  else if (STATUS_CONFIG[inv.status]) {
                    statusLabel = STATUS_CONFIG[inv.status].label;
                    statusColor = STATUS_CONFIG[inv.status].color;
                  }

                  return (
                    <tr key={inv.id} className={`hover:bg-muted/30 transition-colors ${isPastDue ? "bg-red-50/20" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${inv.orderId}`} className="font-medium text-primary hover:underline flex items-center gap-1 text-xs">
                          {inv.order.orderNumber} <ExternalLink size={11} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{inv.order.buyer.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 ${isPastDue ? "text-red-600 font-semibold" : ""}`}>
                          {isPastDue && <Calendar size={12} />}
                          {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(inv.totalAmount))}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{Number(inv.balanceAmount) > 0 ? formatCurrency(Number(inv.balanceAmount)) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${statusColor}`}>{statusLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${inv.orderId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
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
