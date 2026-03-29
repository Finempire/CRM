import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ListChecks, ExternalLink, Package } from "lucide-react";

export const metadata = { title: "Bill of Materials" };

const CATEGORY_COLORS: Record<string, string> = {
  FABRIC: "bg-blue-100 text-blue-700",
  TRIMS: "bg-purple-100 text-purple-700",
  ACCESSORIES: "bg-teal-100 text-teal-700",
  PACKAGING: "bg-orange-100 text-orange-700",
  LABELS: "bg-pink-100 text-pink-700",
  TAGS: "bg-yellow-100 text-yellow-700",
};

export default async function BomPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;

  const orders = await prisma.order.findMany({
    where: { deletedAt: null, status: { notIn: ["CLOSED", "CANCELLED"] } },
    select: { id: true, orderNumber: true, buyer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let selectedOrder = null;
  if (sp.orderId) {
    selectedOrder = await prisma.order.findUnique({
      where: { id: sp.orderId },
      include: {
        buyer: true,
        orderLines: true,
        bomItems: {
          include: { vendor: { select: { name: true } } },
          orderBy: [{ category: "asc" }, { itemName: "asc" }],
        },
      },
    });
  }

  const bomByCategory: Record<string, any[]> = {};
  if (selectedOrder?.bomItems) {
    for (const item of selectedOrder.bomItems) {
      if (!bomByCategory[item.category]) bomByCategory[item.category] = [];
      bomByCategory[item.category].push(item);
    }
  }

  const totalEstimatedCost = selectedOrder?.bomItems.reduce((s, i) => s + (i.estimatedAmount ? Number(i.estimatedAmount) : 0), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bill of Materials</h1>
          <p className="text-muted-foreground text-sm mt-1">Material requirements and specifications per order</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground flex-shrink-0">Select Order</label>
        <form className="flex-1 flex items-center gap-3">
          <select
            name="orderId"
            defaultValue={sp.orderId || ""}
            onChange={e => {
              if (e.target.value) window.location.href = `/dashboard/bom?orderId=${e.target.value}`;
            }}
            className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Choose an order to view BOM —</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.orderNumber} · {o.buyer.name}</option>
            ))}
          </select>
          {selectedOrder && (
            <Link href={`/orders/${selectedOrder.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
              <ExternalLink size={14} /> View Order
            </Link>
          )}
        </form>
      </div>

      {!selectedOrder && (
        <div className="bg-card rounded-xl border p-16 text-center text-muted-foreground">
          <ListChecks size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium text-lg">Select an order to view its Bill of Materials</p>
          <p className="text-sm mt-1">BOM items are managed from the Order detail page → BOM tab</p>
        </div>
      )}

      {selectedOrder && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="text-xs text-muted-foreground font-medium">Total Items</p>
              <p className="text-2xl font-bold mt-1">{selectedOrder.bomItems.length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-muted-foreground font-medium">Categories</p>
              <p className="text-2xl font-bold mt-1">{Object.keys(bomByCategory).length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-muted-foreground font-medium">Estimated Cost</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalEstimatedCost)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-muted-foreground font-medium">Order Qty</p>
              <p className="text-2xl font-bold mt-1">{selectedOrder.orderLines.reduce((s, l) => s + l.quantity, 0).toLocaleString()}</p>
            </div>
          </div>

          {selectedOrder.bomItems.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No BOM items found for this order</p>
              <p className="text-sm mt-1">Go to the Order detail → BOM tab to add materials</p>
            </div>
          ) : (
            Object.entries(bomByCategory).map(([category, items]) => (
              <div key={category} className="bg-card rounded-xl border overflow-hidden">
                <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600"}`}>{category}</span>
                  <span className="text-sm font-semibold">{formatCurrency(items.reduce((s, i) => s + (i.estimatedAmount ? Number(i.estimatedAmount) : 0), 0))}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Item</th>
                        <th className="px-4 py-2 text-left font-semibold">Specification</th>
                        <th className="px-4 py-2 text-left font-semibold">Color</th>
                        <th className="px-4 py-2 text-right font-semibold">Req. Qty</th>
                        <th className="px-4 py-2 text-right font-semibold">Net Qty (+waste)</th>
                        <th className="px-4 py-2 text-left font-semibold">Vendor</th>
                        <th className="px-4 py-2 text-right font-semibold">Rate</th>
                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{item.itemName}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.specification || "—"}</td>
                          <td className="px-4 py-2.5 text-xs">{item.color || "—"}</td>
                          <td className="px-4 py-2.5 text-right">{Number(item.requiredQty).toFixed(3)} {item.unit}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{Number(item.netRequiredQty).toFixed(3)} {item.unit}</td>
                          <td className="px-4 py-2.5 text-xs">{item.vendor?.name || "—"}</td>
                          <td className="px-4 py-2.5 text-right text-xs">{item.estimatedRate ? formatCurrency(Number(item.estimatedRate)) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{item.estimatedAmount ? formatCurrency(Number(item.estimatedAmount)) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
