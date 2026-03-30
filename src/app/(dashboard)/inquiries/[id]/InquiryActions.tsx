"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";

interface Buyer { id: string; name: string; code: string; }

interface InquiryItemData {
  id: string;
  itemName: string;
  styleDescription: string | null;
  quantity: number | null;
}

interface InquiryData {
  id: string;
  buyerName: string;
  shipmentDate: Date | null;
  quantity: number | null;
  itemDetails: string | null;
  items: InquiryItemData[];
}

interface Props {
  inquiryId: string;
  buyers: Buyer[];
  inquiry: InquiryData;
}

export function InquiryActions({ inquiryId, buyers, inquiry }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "convert" | "reject">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [convertForm, setConvertForm] = useState({
    buyerId: "",
    type: "PRODUCTION",
    paymentTerms: "",
    currency: "INR",
    taxMode: "GST",
  });
  const [rejectReason, setRejectReason] = useState("");

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Build orderLines from inquiry items (one line per item)
      const hasItems = inquiry.items && inquiry.items.length > 0;

      const orderLines = hasItems
        ? inquiry.items.map((item) => ({
            styleName: item.itemName,
            description: item.styleDescription ?? undefined,
            quantity: item.quantity ?? 1,
          }))
        : [
            {
              styleName: inquiry.itemDetails ?? inquiry.buyerName,
              quantity: inquiry.quantity ?? 1,
            },
          ];

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...convertForm,
          inquiryId,
          // Use first item name as the order's style name
          styleName: orderLines[0].styleName,
          quantity: orderLines.reduce((s, l) => s + l.quantity, 0),
          shipmentDate: inquiry.shipmentDate
            ? new Date(inquiry.shipmentDate).toISOString().split("T")[0]
            : "",
          // Pass all lines so the orders API can create OrderLine records
          orderLines,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      router.push(`/orders/${data.order.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const itemCount = inquiry.items?.length ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-base">Actions</h2>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {mode === "idle" && (
        <div className="space-y-2">
          <button
            onClick={() => setMode("convert")}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Convert to Order
            {itemCount > 1 && (
              <span className="ml-auto text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
                {itemCount} lines
              </span>
            )}
          </button>
          <button
            onClick={() => setMode("reject")}
            className="w-full flex items-center gap-2 px-4 py-2.5 border border-destructive/30 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject Inquiry
          </button>
        </div>
      )}

      {mode === "convert" && (
        <form onSubmit={handleConvert} className="space-y-3">
          {itemCount > 1 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2">
              {itemCount} items will become {itemCount} order lines automatically.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Buyer <span className="text-destructive">*</span></label>
            <select
              required
              value={convertForm.buyerId}
              onChange={(e) => setConvertForm((f) => ({ ...f, buyerId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Order Type</label>
            <select
              value={convertForm.type}
              onChange={(e) => setConvertForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="PRODUCTION">Production</option>
              <option value="SAMPLE">Sample</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Payment Terms</label>
            <input
              placeholder="e.g. Net 30"
              value={convertForm.paymentTerms}
              onChange={(e) => setConvertForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Convert
            </button>
            <button type="button" onClick={() => setMode("idle")}
              className="px-3 py-2 border border-border text-sm rounded-lg hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form onSubmit={handleReject} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Rejection Reason</label>
            <textarea
              rows={3}
              required
              placeholder="Why is this inquiry being rejected?"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Reject
            </button>
            <button type="button" onClick={() => setMode("idle")}
              className="px-3 py-2 border border-border text-sm rounded-lg hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
