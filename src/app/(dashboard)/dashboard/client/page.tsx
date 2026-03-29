import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Package, FileText, Truck, DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "My Orders" };

export default async function ClientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "CLIENT" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const userId = session.user.id!;

  // Find buyer linked to this user via email match
  const buyer = await prisma.buyer.findFirst({
    where: { email: session.user.email ?? "" },
  });

  const orders = buyer
    ? await prisma.order.findMany({
        where: { buyerId: buyer.id, deletedAt: null },
        include: {
          costing: { select: { totalRevenue: true, grossMargin: true } },
          shipments: { select: { status: true, expectedDeliveryDate: true }, orderBy: { createdAt: "desc" }, take: 1 },
          invoices: { select: { status: true, totalAmount: true, balanceAmount: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const stats = [
    { label: "Total Orders", value: orders.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Production", value: orders.filter((o) => ["PRODUCTION", "MERCHANDISING"].includes(o.status)).length, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Shipped", value: orders.filter((o) => o.status === "DELIVERY").length, icon: Truck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Invoiced", value: orders.filter((o) => ["INVOICED", "PARTIAL_PAID", "PAID"].includes(o.status)).length, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome, {session.user.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className={`p-2.5 rounded-lg ${stat.bg} w-fit`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-foreground">Order Status</h2>
        </div>
        {orders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No orders found for your account.
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => {
              const shipment = order.shipments[0];
              const invoice = order.invoices[0];
              return (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{order.orderNumber}</span>
                        <span className={`status-chip text-[10px] ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Ship by: {formatDate(order.shipmentDate) ?? "—"}</span>
                        {shipment && (
                          <span className={`${getStatusColor(shipment.status)} px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                            {shipment.status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {invoice && (
                        <>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(Number(invoice.totalAmount))}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Balance: {formatCurrency(Number(invoice.balanceAmount))}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
