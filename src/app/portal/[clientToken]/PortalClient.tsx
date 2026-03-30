"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";

interface CurrentItem {
  itemName: string;
  quantity: number | null;
}

interface Props {
  clientToken: string;
  inquiryId: string;
  buyerName: string;
  currentItems: CurrentItem[];
  shipmentDate: Date | null;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm";

export default function PortalClient({
  clientToken,
  buyerName,
  currentItems,
  shipmentDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [newShipmentDate, setNewShipmentDate] = useState(
    shipmentDate ? new Date(shipmentDate).toISOString().split("T")[0] : ""
  );
  const [itemChanges, setItemChanges] = useState<{ itemName: string; quantity: string; notes: string }[]>(
    currentItems.map((i) => ({ itemName: i.itemName, quantity: String(i.quantity ?? ""), notes: "" }))
  );

  function updateItemChange(idx: number, field: "itemName" | "quantity" | "notes", val: string) {
    setItemChanges((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe the changes you need.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${clientToken}/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          newShipmentDate: newShipmentDate || null,
          requestedItems: itemChanges.filter((i) => i.itemName.trim()),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Submission failed");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-green-800 text-sm">Change Request Submitted</p>
        <p className="text-xs text-green-600 mt-1">Our team will review your request and get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <MessageSquarePlus className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">Request Changes</p>
            <p className="text-xs text-slate-500">Need to update items, quantities, or dates?</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Describe the changes needed <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please increase Item 1 quantity to 800 pcs and change the shipment date to July 30..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Updated shipment date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              New Shipment Date (if changing)
            </label>
            <input
              type="date"
              value={newShipmentDate}
              onChange={(e) => setNewShipmentDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Item-level changes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Updated Item Quantities / Notes
            </label>
            <div className="space-y-2">
              {itemChanges.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    {idx + 1}. {item.itemName}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">New Qty (pcs)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemChange(idx, "quantity", e.target.value)}
                        placeholder="Leave blank if unchanged"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                      <input
                        value={item.notes}
                        onChange={(e) => updateItemChange(idx, "notes", e.target.value)}
                        placeholder="e.g. change color to navy"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Submitted by <span className="font-medium">{buyerName}</span>
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit Change Request
          </button>
        </form>
      )}
    </div>
  );
}
