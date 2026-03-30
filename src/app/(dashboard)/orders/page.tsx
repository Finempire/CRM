import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { FINANCE_ROLES } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Plus, Filter, Download, Search } from "lucide-react";

export const metadata: Metadata = { title: "Orders" };

interface SearchParams {
  status?: string;
  type?: string;
  buyerId?: string;
  search?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  const userId = session.user.id!;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    ...(sp.status && { status: sp.status as OrderStatus }),
    ...(sp.type && { type: sp.type as OrderType }),
    ...(sp.buyerId && { buyerId: sp.buyerId }),
    ...(sp.search && {
      OR: [
        { orderNumber: { contains: sp.search } },
        { buyer: { name: { contains: sp.search } } },
      ],
    }),
    // Restrict CLIENT users to their own orders only
    ...(role === "CLIENT" && { buyer: { contacts: { some: { email: session.user.email! } } } }),
    // Merchandisers see their own orders + show all for others
    ...(role === "MERCHANDISER" && { merchandiserId: userId }),
  };

  const [orders, totalCount, buyers] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: true,
        merchandiser: { select: { name: true } },
        productionManager: { select: { name: true } },
        costing: { select: { totalRevenue: true, marginPercent: true } },
        _count: { select: { shipments: true, invoices: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.buyer.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isFinance = FINANCE_ROLES.includes(role);

  const statusOptions: OrderStatus[] = [
    "INQUIRY", "REVIEW", "COSTING", "MERCHANDISING", "PRE_PRODUCTION",
    "PROCUREMENT", "PRODUCTION", "LOGISTICS", "DELIVERY", "INVOICED", "PAID", "CLOSED", "CANCELLED",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{totalCount} orders total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/orders/export" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition-colors">
            <Download size={15} /> Export
          </Link>
          {["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"].includes(role) && (
            <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
              <Plus size={16} /> New Order
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4">
        <form className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Search order #, buyer..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-36"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            <option value="SAMPLE">Sample</option>
            <option value="PRODUCTION">Production</option>
          </select>

          {/* Buyer filter */}
          <select
            name="buyerId"
            defaultValue={sp.buyerId ?? ""}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-44"
          >
            <option value="">All Buyers</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Filter
          </button>
          <Link href="/orders" className="px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted">
            Clear
          </Link>
        </form>
      </div>

      {/* Orders Table */}
      <div className="data-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Merchandiser</th>
                {isFinance && (
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Revenue</th>
                )}
                {isFinance && (
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Margin</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ship Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={isFinance ? 9 : 7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Search size={20} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">No orders found</p>
                        {!sp.status && !sp.search && (
                          <Link href="/orders/new" className="text-sm text-primary hover:underline mt-1 block">
                            Create the first order
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/orders/${order.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {order.orderNumber}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        {order._count.documents > 0 && (
                          <span className="text-[10px] text-muted-foreground">{order._count.documents} docs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-foreground font-medium">{order.buyer.name}</span>
                      <p className="text-xs text-muted-foreground">{order.buyer.country}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-chip ${order.type === "SAMPLE" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-chip ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{order.merchandiser?.name ?? "—"}</td>
                    {isFinance && (
                      <td className="px-4 py-3.5 text-right font-semibold">
                        {order.costing ? `₹${Number(order.costing.totalRevenue).toLocaleString("en-IN")}` : "—"}
                      </td>
                    )}
                    {isFinance && (
                      <td className="px-4 py-3.5 text-right">
                        {order.costing ? (
                          <span className={`font-semibold ${Number(order.costing.marginPercent) > 20 ? "text-green-600" : Number(order.costing.marginPercent) > 10 ? "text-amber-600" : "text-red-600"}`}>
                            {Number(order.costing.marginPercent).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDate(order.shipmentDate)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                const p = i + 1;
                return (
                  <Link
                    key={p}
                    href={`/orders?page=${p}&status=${sp.status ?? ""}&type=${sp.type ?? ""}`}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
