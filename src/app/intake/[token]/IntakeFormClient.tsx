"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Package } from "lucide-react";

interface ItemRow {
  id: string;
  itemName: string;
  styleDescription: string;
  quantity: string;
  fabricNotes: string;
  trimsNotes: string;
  printingNotes: string;
}

function emptyItem(): ItemRow {
  return {
    id: Math.random().toString(36).slice(2),
    itemName: "",
    styleDescription: "",
    quantity: "",
    fabricNotes: "",
    trimsNotes: "",
    printingNotes: "",
  };
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

export default function IntakeFormClient({
  token,
  buyerName: defaultBuyerName,
}: {
  token: string;
  buyerName: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Shared fields ────────────────────────────────────────────────────────────
  const [buyerName, setBuyerName] = useState(defaultBuyerName);
  const [contactNumber, setContactNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [otherComments, setOtherComments] = useState("");

  // ── Items ────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  function updateItem(id: string, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length === 1) return; // always keep at least one
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate at least one item has a name
    if (items.every((i) => !i.itemName.trim())) {
      setError("Please fill in at least one item name.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("buyerName", buyerName);
      fd.append("contactNumber", contactNumber);
      fd.append("contactEmail", contactEmail);
      fd.append("billingAddress", billingAddress);
      fd.append("shippingAddress", shippingAddress);
      fd.append("shipmentDate", shipmentDate);
      fd.append("otherComments", otherComments);

      // Serialize items array as JSON
      fd.append(
        "items",
        JSON.stringify(
          items
            .filter((i) => i.itemName.trim())
            .map(({ id: _id, ...rest }) => rest)
        )
      );

      // Attach files
      const files = fileRef.current?.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          fd.append("artwork", files[i]);
        }
      }

      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }

      // API returns JSON on success (we handle redirect here)
      const data = await res.json();
      router.push(`/intake/${token}/success?id=${data.inquiryId}&ct=${data.clientToken}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Submit Inquiry</h1>
          <p className="text-slate-500 text-sm mt-1">
            Fill in your order details below.{defaultBuyerName && ` Welcome, ${defaultBuyerName}!`}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Contact Info ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Company / Buyer Name <span className="text-red-500">*</span></label>
                <input required value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. Trendy Fashion Ltd" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Number <span className="text-red-500">*</span></label>
                <input required type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="buyer@example.com" className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Billing Address</label>
                <textarea rows={2} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Full billing address" className={`${inputCls} resize-none`} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Shipping Address</label>
                <textarea rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Full shipping address (if different from billing)" className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* ── Order Details ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Order Details</h2>
            <div>
              <label className={labelCls}>Required Shipment Date <span className="text-red-500">*</span></label>
              <input required type="date" min={today} value={shipmentDate}
                onChange={(e) => setShipmentDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* ── Items / Styles ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">Items / Styles</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add one row per style or item type</p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-5">
              {items.map((item, index) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative">
                  {/* Item header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {item.itemName || `Item ${index + 1}`}
                      </span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Item / Style Name <span className="text-red-500">*</span></label>
                      <input
                        value={item.itemName}
                        onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                        placeholder="e.g. Men's Polo Shirt, Women's Jacket"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Quantity (pcs)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        placeholder="e.g. 500"
                        className={inputCls}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Style Description</label>
                      <textarea
                        rows={2}
                        value={item.styleDescription}
                        onChange={(e) => updateItem(item.id, "styleDescription", e.target.value)}
                        placeholder="Describe the style, cut, construction details..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Fabric Notes</label>
                      <textarea
                        rows={2}
                        value={item.fabricNotes}
                        onChange={(e) => updateItem(item.id, "fabricNotes", e.target.value)}
                        placeholder="Fabric composition, weight, finish..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Trims & Labels</label>
                      <textarea
                        rows={2}
                        value={item.trimsNotes}
                        onChange={(e) => updateItem(item.id, "trimsNotes", e.target.value)}
                        placeholder="Buttons, zippers, labels, tags..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Printing / Embroidery Notes</label>
                      <textarea
                        rows={2}
                        value={item.printingNotes}
                        onChange={(e) => updateItem(item.id, "printingNotes", e.target.value)}
                        placeholder="Printing technique, placement, colors..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add another item button at the bottom */}
            <button
              type="button"
              onClick={addItem}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-500 text-sm font-medium rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Another Item / Style
            </button>
          </div>

          {/* ── Other Comments ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Additional Notes</h2>
            <label className={labelCls}>Other Comments / Special Instructions</label>
            <textarea
              rows={3}
              value={otherComments}
              onChange={(e) => setOtherComments(e.target.value)}
              placeholder="Any other requirements or special instructions..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Attachments ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Attachments</h2>
            <label className={labelCls}>Artwork / Reference Images / Tech Sketch</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.ai,.eps,.psd,.dwg"
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1.5">Accepts images, PDF, AI, EPS, PSD files. Max 10MB per file.</p>
          </div>

          {/* ── Total Summary ─────────────────────────────────────────────── */}
          {items.filter((i) => i.itemName.trim()).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-sm text-blue-800">
                <span className="font-semibold">{items.filter((i) => i.itemName.trim()).length} item{items.filter((i) => i.itemName.trim()).length > 1 ? "s" : ""}</span>
                {" · "}
                {(() => {
                  const total = items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
                  return total > 0 ? <span>Total <span className="font-semibold">{total.toLocaleString()} pcs</span></span> : "Quantities not specified";
                })()}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Inquiry"
            )}
          </button>
          <p className="text-center text-xs text-slate-400">
            Your inquiry will be reviewed by our team and you will be contacted within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
