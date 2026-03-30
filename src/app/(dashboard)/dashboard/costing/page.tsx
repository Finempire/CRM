import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import { Calculator, FileEdit, Plus, Search } from "lucide-react";

export const metadata = { title: "Costing Management" };

export default async function CostingListPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "CEO", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"];
  if (!allowedRoles.includes((session.user as any).role)) redirect("/dashboard");

  const sp = await searchParams;
  const query = sp.q || "";

  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      OR: [
        { orderNumber: { contains: query } },
        { buyer: { name: { contains: query } } }
      ]
    },
    include: {
      buyer: true,
      costing: true,
      _count: { select: { orderLines: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Costing Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage costing sheets and profit margins for all orders</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search by Order # or Buyer..." 
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">Order #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold text-right">Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                <th className="px-4 py-3 font-semibold text-right">Margin (%)</th>
                <th className="px-4 py-3 font-semibold">Approval</th>
                <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    <Calculator className="mx-auto mb-3 opacity-50" size={32} />
                    <p>No orders found ready for costing.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const hasCosting = Boolean(order.costing);
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{order.orderNumber}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(order.status).split(' ')[0]}`} />
                          {order.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3 font-medium">{order.buyer.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{hasCosting ? formatCurrency(Number(order.costing?.totalCost)) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{hasCosting ? formatCurrency(Number(order.costing?.totalRevenue)) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {hasCosting ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${Number(order.costing?.marginPercent) > 15 ? 'bg-green-100 text-green-700' : Number(order.costing?.marginPercent) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(order.costing?.marginPercent).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {hasCosting ? <span className="status-chip bg-gray-100">{order.costing?.approvalStatus}</span> : <span className="text-xs text-muted-foreground italic">Not created</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/costing/${order.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                          {hasCosting ? <FileEdit size={16} /> : <Plus size={16} />}
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
