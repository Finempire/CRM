import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Globe, Mail, Phone, MapPin, CreditCard, Package } from "lucide-react";

export const metadata: Metadata = { title: "Buyer Detail" };

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const buyer = await prisma.buyer.findUnique({
    where: { id },
    include: {
      contacts: true,
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          type: true,
          shipmentDate: true,
          createdAt: true,
        },
      },
      _count: { select: { orders: true, inquiries: true } },
    },
  });

  if (!buyer) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/buyers" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{buyer.name}</h1>
          <p className="text-sm text-muted-foreground">{buyer.code}{buyer.shortName ? ` · ${buyer.shortName}` : ""}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/buyers/${buyer.id}/edit`}
            className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent transition-colors"
          >
            Edit Buyer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buyer Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Buyer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Country</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  {buyer.country ?? "—"}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Currency</p>
                <span className="px-2 py-0.5 bg-muted rounded text-sm font-medium">{buyer.currency}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {buyer.email ?? "—"}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {buyer.phone ?? "—"}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payment Terms</p>
                <p className="text-sm">{buyer.paymentTerms ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tax Number</p>
                <p className="text-sm">{buyer.taxNumber ?? "—"}</p>
              </div>
              {buyer.billingAddress && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Billing Address</p>
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    {buyer.billingAddress}
                  </div>
                </div>
              )}
              {buyer.shippingAddress && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Shipping Address</p>
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    {buyer.shippingAddress}
                  </div>
                </div>
              )}
              {buyer.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{buyer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Orders */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Orders ({buyer._count.orders})</h2>
              <Link href={`/orders/new?buyerId=${buyer.id}`} className="text-xs text-primary hover:underline">
                + New Order
              </Link>
            </div>
            {buyer.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Order #</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Shipment</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {buyer.orders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="py-2">
                        <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">{order.type}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{formatDate(order.shipmentDate)}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-semibold">{buyer._count.orders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Inquiries</span>
                <span className="font-semibold">{buyer._count.inquiries}</span>
              </div>
              {buyer.creditLimit && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span className="font-semibold">{buyer.currency} {Number(buyer.creditLimit).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${buyer.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {buyer.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Since</span>
                <span>{formatDate(buyer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Contacts ({buyer.contacts.length})</h2>
            {buyer.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts added</p>
            ) : (
              <div className="space-y-4">
                {buyer.contacts.map((contact) => (
                  <div key={contact.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">Primary</span>
                      )}
                    </div>
                    {contact.role && <p className="text-xs text-muted-foreground mb-1">{contact.role}</p>}
                    {contact.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />{contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />{contact.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
