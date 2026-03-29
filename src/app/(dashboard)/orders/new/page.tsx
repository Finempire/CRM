"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Buyer { id: string; name: string; code: string; currency: string; paymentTerms: string | null; }
interface Style { id: string; name: string; code: string; }
interface User { id: string; name: string; role: string; }

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillBuyerId = searchParams.get("buyerId") ?? "";
  const prefillInquiryId = searchParams.get("inquiryId") ?? "";

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [merchandisers, setMerchandisers] = useState<User[]>([]);
  const [productionManagers, setProductionManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    buyerId: prefillBuyerId,
    type: "PRODUCTION",
    shipmentDate: "",
    paymentTerms: "",
    taxMode: "GST",
    currency: "INR",
    merchandiserId: "",
    productionManagerId: "",
    notes: "",
    inquiryId: prefillInquiryId,
    // Order line
    styleName: "",
    quantity: "",
    color: "",
    unit: "PCS",
  });

  useEffect(() => {
    async function fetchData() {
      const [buyersRes, stylesRes, usersRes] = await Promise.all([
        fetch("/api/master/buyers"),
        fetch("/api/master/styles"),
        fetch("/api/master/users"),
      ]);
      if (buyersRes.ok) setBuyers(await buyersRes.json());
      if (stylesRes.ok) setStyles(await stylesRes.json());
      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        setMerchandisers(users.filter((u) => u.role === "MERCHANDISER" || u.role === "ADMIN_OPERATIONS"));
        setProductionManagers(users.filter((u) => u.role === "PRODUCTION_MANAGER"));
      }
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create order");
      }
      const data = await res.json();
      router.push(`/orders/${data.order.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedBuyer = buyers.find((b) => b.id === form.buyerId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Order</h1>
          <p className="text-sm text-muted-foreground">Create a production or sample order</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Buyer & Order Type */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Order Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Buyer <span className="text-destructive">*</span></label>
              <select
                required
                value={form.buyerId}
                onChange={(e) => {
                  const b = buyers.find((x) => x.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    buyerId: e.target.value,
                    currency: b?.currency ?? f.currency,
                    paymentTerms: b?.paymentTerms ?? f.paymentTerms,
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select buyer...</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Order Type <span className="text-destructive">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="PRODUCTION">Production</option>
                <option value="SAMPLE">Sample</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Shipment Date</label>
              <input
                type="date"
                value={form.shipmentDate}
                onChange={(e) => setForm((f) => ({ ...f, shipmentDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Currency</label>
              <input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Payment Terms</label>
              <input
                placeholder="e.g. Net 30, LC at sight"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Tax Mode</label>
              <select
                value={form.taxMode}
                onChange={(e) => setForm((f) => ({ ...f, taxMode: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="NONE">None</option>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Assignments</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Merchandiser</label>
              <select
                value={form.merchandiserId}
                onChange={(e) => setForm((f) => ({ ...f, merchandiserId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Assign later...</option>
                {merchandisers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Production Manager</label>
              <select
                value={form.productionManagerId}
                onChange={(e) => setForm((f) => ({ ...f, productionManagerId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Assign later...</option>
                {productionManagers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* First Order Line */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Order Line (Initial Style)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Style / Item Name <span className="text-destructive">*</span></label>
              <input
                required
                placeholder="e.g. Classic Polo T-Shirt"
                value={form.styleName}
                onChange={(e) => setForm((f) => ({ ...f, styleName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantity <span className="text-destructive">*</span></label>
              <input
                required
                type="number"
                min="1"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Color</label>
              <input
                placeholder="e.g. Navy Blue"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Internal Notes</h2>
          <textarea
            rows={3}
            placeholder="Any internal notes..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/orders" className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Order
          </button>
        </div>
      </form>
    </div>
  );
}
