import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Warehouse, AlertTriangle, Package, TrendingDown } from "lucide-react";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const query = sp.q || "";
  const category = sp.category || "";

  const stockItems = await prisma.stockItem.findMany({
    where: {
      AND: [
        query ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ]
        } : {},
        category ? { category } : {},
      ]
    },
    include: {
      vendor: { select: { name: true } },
      _count: { select: { transactions: true } }
    },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.stockItem.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  const totalValue = stockItems.reduce((s, item) => s + (Number(item.currentStock) * Number(item.lastRate || 0)), 0);
  const lowStock = stockItems.filter(item => item.reorderLevel && Number(item.currentStock) <= Number(item.reorderLevel)).length;
  const outOfStock = stockItems.filter(item => Number(item.currentStock) <= 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor stock levels, movements, and valuations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Total SKUs</p>
          <p className="text-2xl font-bold mt-1">{stockItems.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium">Stock Value</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className={`stat-card ${lowStock > 0 ? "border-yellow-200 bg-yellow-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <TrendingDown size={12} className="text-yellow-600" /> Low Stock
          </p>
          <p className={`text-2xl font-bold mt-1 ${lowStock > 0 ? "text-yellow-600" : ""}`}>{lowStock}</p>
        </div>
        <div className={`stat-card ${outOfStock > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-500" /> Out of Stock
          </p>
          <p className={`text-2xl font-bold mt-1 ${outOfStock > 0 ? "text-red-600" : ""}`}>{outOfStock}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <form className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name or code..."
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/inventory"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!category ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
            All
          </Link>
          {categories.map(c => (
            <Link key={c.category} href={`/dashboard/inventory?category=${c.category}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === c.category ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
              {c.category} ({c._count.id})
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Item Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold text-right">Min. Stock</th>
                <th className="px-4 py-3 font-semibold text-right">Unit Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Stock Value</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <Warehouse size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No inventory items found</p>
                    <p className="text-xs mt-1">Stock items are added through the Store settings</p>
                  </td>
                </tr>
              ) : (
                stockItems.map(item => {
                  const currentStock = Number(item.currentStock);
                  const minStock = item.reorderLevel ? Number(item.reorderLevel) : null;
                  const unitCost = item.lastRate ? Number(item.lastRate) : 0;
                  const stockValue = currentStock * unitCost;
                  const isOutOfStock = currentStock <= 0;
                  const isLow = minStock !== null && currentStock <= minStock && !isOutOfStock;

                  let statusLabel = "Normal";
                  let statusColor = "bg-green-100 text-green-700";
                  if (isOutOfStock) { statusLabel = "Out of Stock"; statusColor = "bg-red-100 text-red-700"; }
                  else if (isLow) { statusLabel = "Low Stock"; statusColor = "bg-yellow-100 text-yellow-700"; }

                  return (
                    <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${isOutOfStock ? "bg-red-50/20" : isLow ? "bg-yellow-50/20" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded bg-muted font-medium">{item.category}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.location || "—"}</td>
                      <td className="px-4 py-3 text-xs">{item.vendor?.name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${isOutOfStock ? "text-red-600" : isLow ? "text-yellow-600" : ""}`}>
                          {currentStock.toLocaleString()} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {minStock ? `${minStock.toLocaleString()} ${item.unit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">{unitCost > 0 ? formatCurrency(unitCost) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{stockValue > 0 ? formatCurrency(stockValue) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${statusColor}`}>{statusLabel}</span>
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
