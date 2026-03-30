import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import PortalClient from "./PortalClient";

export const metadata: Metadata = { title: "Order Status" };

const ORDER_STATUS_STEPS = [
  { status: "INQUIRY",       label: "Inquiry Received",   desc: "Your inquiry has been received." },
  { status: "REVIEW",        label: "Under Review",       desc: "Our team is reviewing your order." },
  { status: "COSTING",       label: "Costing",            desc: "Costing and pricing in progress." },
  { status: "MERCHANDISING", label: "Merchandising",      desc: "Style and tech pack preparation." },
  { status: "PRE_PRODUCTION",label: "Pre-Production",     desc: "Samples and approvals." },
  { status: "PROCUREMENT",   label: "Procurement",        desc: "Materials being sourced." },
  { status: "PRODUCTION",    label: "In Production",      desc: "Your order is being manufactured." },
  { status: "LOGISTICS",     label: "Logistics",          desc: "Packing and shipment preparation." },
  { status: "DELIVERY",      label: "Delivered",          desc: "Order delivered." },
  { status: "INVOICED",      label: "Invoiced",           desc: "Invoice raised." },
];

export default async function PortalPage({
  params,
}: {
  params: Promise<{ clientToken: string }>;
}) {
  const { clientToken } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { clientToken },
    include: {
      items: { orderBy: { id: "asc" } },
      changeRequests: {
        orderBy: { createdAt: "desc" },
        include: { resolvedBy: { select: { name: true } } },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          shipmentDate: true,
          updatedAt: true,
          orderLines: {
            select: { styleName: true, quantity: true, description: true },
          },
        },
      },
    },
  });

  if (!inquiry) notFound();

  // Build timeline entries
  const timelineEntries = [
    {
      label: "Inquiry Submitted",
      date: inquiry.createdAt,
      done: true,
      desc: `${inquiry.items.length} item${inquiry.items.length !== 1 ? "s" : ""} · ${inquiry.quantity?.toLocaleString() ?? "—"} pcs total`,
    },
    ...(inquiry.order
      ? ORDER_STATUS_STEPS.filter((s) => s.status !== "INQUIRY").map((step) => {
          const currentIdx = ORDER_STATUS_STEPS.findIndex(
            (s) => s.status === inquiry.order!.status
          );
          const stepIdx = ORDER_STATUS_STEPS.findIndex(
            (s) => s.status === step.status
          );
          return {
            label: step.label,
            desc: step.desc,
            done: stepIdx <= currentIdx,
            active: step.status === inquiry.order!.status,
            date: step.status === inquiry.order!.status ? inquiry.order!.updatedAt : null,
          };
        })
      : [
          {
            label: "Reviewing Inquiry",
            desc: "Our team is reviewing your request.",
            done: inquiry.status === "REVIEWING" || inquiry.status === "CONVERTED",
            active: inquiry.status === "REVIEWING",
            date: null,
          },
          {
            label: "Order Confirmation",
            desc: "Order will be confirmed after review.",
            done: inquiry.status === "CONVERTED",
            active: false,
            date: null,
          },
        ]),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Order Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">
            {inquiry.inquiryNumber} · {inquiry.buyerName}
          </p>
        </div>

        {/* Status banner */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
          inquiry.order ? "bg-blue-600 text-white" :
          inquiry.status === "REJECTED" ? "bg-red-50 border border-red-200" :
          "bg-amber-50 border border-amber-200"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            inquiry.order ? "bg-white/20" :
            inquiry.status === "REJECTED" ? "bg-red-100" : "bg-amber-100"
          }`}>
            {inquiry.order ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : inquiry.status === "REJECTED" ? (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`font-semibold text-sm ${inquiry.order ? "text-white" : inquiry.status === "REJECTED" ? "text-red-800" : "text-amber-800"}`}>
              {inquiry.order
                ? `Order ${inquiry.order.orderNumber} · ${inquiry.order.status.replace(/_/g, " ")}`
                : inquiry.status === "REJECTED"
                ? "Inquiry Rejected"
                : "Inquiry Under Review"}
            </p>
            <p className={`text-xs mt-0.5 ${inquiry.order ? "text-blue-100" : inquiry.status === "REJECTED" ? "text-red-600" : "text-amber-600"}`}>
              {inquiry.order?.shipmentDate
                ? `Expected shipment: ${formatDate(inquiry.order.shipmentDate)}`
                : "Our team will contact you shortly."}
            </p>
          </div>
        </div>

        {/* Items summary */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Your Items ({inquiry.items.length})
          </h2>
          <div className="space-y-3">
            {inquiry.items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{item.itemName}</p>
                  {item.styleDescription && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.styleDescription}</p>
                  )}
                </div>
                {item.quantity && (
                  <span className="text-xs font-semibold text-slate-600 shrink-0">
                    {item.quantity.toLocaleString()} pcs
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order timeline */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Order Timeline
          </h2>
          <ol className="relative border-l border-slate-200 space-y-5 ml-3">
            {timelineEntries.map((entry, idx) => (
              <li key={idx} className="ml-5">
                <span className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-white ${
                  entry.done ? "bg-blue-600" : "bg-slate-200"
                } ${"active" in entry && entry.active ? "ring-blue-100 animate-pulse" : ""}`}>
                  {entry.done ? (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${entry.done ? "text-slate-900" : "text-slate-400"}`}>
                    {entry.label}
                  </p>
                  <p className={`text-xs ${entry.done ? "text-slate-500" : "text-slate-300"}`}>{entry.desc}</p>
                  {entry.date && (
                    <p className="text-xs text-blue-500 mt-0.5">{formatDate(entry.date)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Change requests history */}
        {inquiry.changeRequests.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide text-muted-foreground">
              Change Requests
            </h2>
            <div className="space-y-3">
              {inquiry.changeRequests.map((cr) => (
                <div key={cr.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">{formatDate(cr.createdAt)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cr.status === "APPLIED"   ? "bg-green-100 text-green-700" :
                      cr.status === "REJECTED"  ? "bg-red-100 text-red-700" :
                      cr.status === "IN_REVIEW" ? "bg-blue-100 text-blue-700" :
                                                  "bg-amber-100 text-amber-700"
                    }`}>
                      {cr.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{cr.message}</p>
                  {cr.resolutionNote && (
                    <p className="text-xs text-slate-500 mt-1.5 border-t pt-1.5">
                      <span className="font-medium">Team response:</span> {cr.resolutionNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Changes panel — client component */}
        {inquiry.status !== "REJECTED" && (
          <PortalClient
            clientToken={clientToken}
            inquiryId={inquiry.id}
            buyerName={inquiry.buyerName}
            currentItems={inquiry.items.map((i) => ({
              itemName: i.itemName,
              quantity: i.quantity,
            }))}
            shipmentDate={inquiry.order?.shipmentDate ?? inquiry.shipmentDate ?? null}
          />
        )}
      </div>
    </div>
  );
}
