import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import { ArrowLeft, Package, User, Calendar, FileText, MapPin, Phone, Mail, AlertTriangle } from "lucide-react";
import { InquiryActions } from "./InquiryActions";

export const metadata: Metadata = { title: "Inquiry Detail" };

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  const { id } = await params;

  const canConvert = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"].includes(role);

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      buyer: true,
      attachments: true,
      items: { orderBy: { id: "asc" } },
      createdBy: { select: { name: true, email: true } },
      order: { select: { id: true, orderNumber: true, status: true } },
    },
  });

  if (!inquiry) notFound();

  const buyers = canConvert
    ? await prisma.buyer.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inquiries" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{inquiry.inquiryNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(inquiry.status)}`}>
              {inquiry.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Received {formatDate(inquiry.createdAt)}
            {inquiry.intakeSource && ` · via ${inquiry.intakeSource.replace(/_/g, " ")}`}
          </p>
        </div>
      </div>

      {/* Converted to order banner */}
      {inquiry.order && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Package className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Converted to Order</p>
            <p className="text-xs text-green-700">
              This inquiry was converted to{" "}
              <Link href={`/orders/${inquiry.order.id}`} className="font-semibold underline">
                {inquiry.order.orderNumber}
              </Link>{" "}
              · Status:{" "}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(inquiry.order.status)}`}>
                {inquiry.order.status}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {inquiry.status === "DUPLICATE" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">This inquiry was marked as a duplicate</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Inquiry Info */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-base">Inquiry Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer Name</p>
                <p className="font-medium">{inquiry.buyerName}</p>
              </div>
              {inquiry.contactEmail && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {inquiry.contactEmail}
                  </div>
                </div>
              )}
              {inquiry.contactNumber && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {inquiry.contactNumber}
                  </div>
                </div>
              )}
              {inquiry.shipmentDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Required Shipment Date</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatDate(inquiry.shipmentDate)}
                  </div>
                </div>
              )}
              {inquiry.quantity && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                  <p>{inquiry.quantity.toLocaleString()} pcs</p>
                </div>
              )}
              {inquiry.billingAddress && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Billing Address</p>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    {inquiry.billingAddress}
                  </div>
                </div>
              )}
              {inquiry.shippingAddress && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Shipping Address</p>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    {inquiry.shippingAddress}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items / Styles */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Items / Styles</h2>
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                {inquiry.items.length} item{inquiry.items.length !== 1 ? "s" : ""}
                {inquiry.quantity ? ` · ${inquiry.quantity.toLocaleString()} pcs total` : ""}
              </span>
            </div>

            {inquiry.items.length > 0 ? (
              <div className="space-y-4">
                {inquiry.items.map((item, idx) => (
                  <div key={item.id} className="border border-border rounded-xl p-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-foreground">{idx + 1}</span>
                      </div>
                      <p className="font-medium text-sm">{item.itemName}</p>
                      {item.quantity && (
                        <span className="ml-auto text-xs font-medium bg-background border border-border px-2 py-0.5 rounded-full">
                          {item.quantity.toLocaleString()} pcs
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      {item.styleDescription && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Style Description</p>
                          <p className="bg-background rounded-lg px-3 py-2 border border-border/50">{item.styleDescription}</p>
                        </div>
                      )}
                      {item.fabricNotes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Fabric Notes</p>
                          <p className="bg-background rounded-lg px-3 py-2 border border-border/50">{item.fabricNotes}</p>
                        </div>
                      )}
                      {item.trimsNotes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Trims & Labels</p>
                          <p className="bg-background rounded-lg px-3 py-2 border border-border/50">{item.trimsNotes}</p>
                        </div>
                      )}
                      {item.printingNotes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Printing / Embroidery</p>
                          <p className="bg-background rounded-lg px-3 py-2 border border-border/50">{item.printingNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Legacy single-item fallback */
              <div className="space-y-3 text-sm">
                {inquiry.itemDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Style / Item Description</p>
                    <p className="bg-muted/30 rounded-lg px-3 py-2">{inquiry.itemDetails}</p>
                  </div>
                )}
                {inquiry.fabricNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fabric Notes</p>
                    <p className="bg-muted/30 rounded-lg px-3 py-2">{inquiry.fabricNotes}</p>
                  </div>
                )}
                {inquiry.trimsNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Trims / Labels Notes</p>
                    <p className="bg-muted/30 rounded-lg px-3 py-2">{inquiry.trimsNotes}</p>
                  </div>
                )}
                {inquiry.printingNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Printing / Embroidery</p>
                    <p className="bg-muted/30 rounded-lg px-3 py-2">{inquiry.printingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {inquiry.otherComments && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Other Comments</p>
                <p className="bg-muted/30 rounded-lg px-3 py-2 text-sm">{inquiry.otherComments}</p>
              </div>
            )}
          </div>

          {/* Attachments */}
          {inquiry.attachments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-base mb-4">Attachments ({inquiry.attachments.length})</h2>
              <div className="space-y-2">
                {inquiry.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.fileName}</p>
                      {att.fileSize && (
                        <p className="text-xs text-muted-foreground">{(att.fileSize / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                    <a href={att.fileUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-primary hover:underline shrink-0">
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-base">Details</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                  {inquiry.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span>{inquiry.intakeSource?.replace(/_/g, " ") ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(inquiry.createdAt)}</span>
              </div>
              {inquiry.createdBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span>{inquiry.createdBy.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions for convert/reject */}
          {canConvert && inquiry.status !== "CONVERTED" && inquiry.status !== "REJECTED" && (
            <InquiryActions
              inquiryId={inquiry.id}
              buyers={buyers}
              inquiry={{
                id: inquiry.id,
                buyerName: inquiry.buyerName,
                shipmentDate: inquiry.shipmentDate,
                quantity: inquiry.quantity,
                itemDetails: inquiry.itemDetails,
                items: inquiry.items,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
