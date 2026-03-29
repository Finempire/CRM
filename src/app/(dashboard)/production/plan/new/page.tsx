"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Factory, Save } from "lucide-react";

export default function NewProductionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preOrderId = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState<{ id: string; orderNumber: string; buyer: { name: string } }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    orderId: preOrderId,
    plannedStartDate: "",
    plannedFinishDate: "",
    productionLine: "",
    supervisor: "",
    targetOutputPerDay: "",
    totalPlannedQty: "",
    cuttingQty: "",
    stitchingQty: "",
    finishingQty: "",
    packingQty: "",
  });

  useEffect(() => {
    fetch("/api/orders?status=PRE_PRODUCTION&limit=100")
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.orderId) { setError("Please select an order"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: form.orderId,
          plannedStartDate: form.plannedStartDate || null,
          plannedFinishDate: form.plannedFinishDate || null,
          productionLine: form.productionLine || null,
          supervisor: form.supervisor || null,
          targetOutputPerDay: form.targetOutputPerDay ? parseInt(form.targetOutputPerDay) : null,
          totalPlannedQty: form.totalPlannedQty ? parseInt(form.totalPlannedQty) : null,
          stageQtys: {
            CUTTING: form.cuttingQty ? parseInt(form.cuttingQty) : 0,
            STITCHING: form.stitchingQty ? parseInt(form.stitchingQty) : 0,
            FINISHING: form.finishingQty ? parseInt(form.finishingQty) : 0,
            PACKING: form.packingQty ? parseInt(form.packingQty) : 0,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create production plan");
      router.push(`/orders/${form.orderId}?tab=production`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/production" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Production
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title flex items-center gap-2"><Factory size={22} /> New Production Plan</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Order Selection */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Order Assignment</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Order <span className="text-red-500">*</span></label>
            <select
              value={form.orderId}
              onChange={e => set("orderId", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select an order in Pre-Production stage...</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.orderNumber} — {o.buyer.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Only orders in PRE_PRODUCTION status are shown</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Production Schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Planned Start Date</label>
              <input type="date" value={form.plannedStartDate} onChange={e => set("plannedStartDate", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Planned Finish Date</label>
              <input type="date" value={form.plannedFinishDate} onChange={e => set("plannedFinishDate", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Production Line / Unit</label>
              <input type="text" value={form.productionLine} onChange={e => set("productionLine", e.target.value)}
                placeholder="e.g. Line A, Unit 2"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Line Supervisor</label>
              <input type="text" value={form.supervisor} onChange={e => set("supervisor", e.target.value)}
                placeholder="Supervisor name"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Target Output / Day (pcs)</label>
              <input type="number" min="0" value={form.targetOutputPerDay} onChange={e => set("targetOutputPerDay", e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Total Planned Qty (pcs)</label>
              <input type="number" min="0" value={form.totalPlannedQty} onChange={e => set("totalPlannedQty", e.target.value)}
                placeholder="Total production quantity"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
        </div>

        {/* Stage Quantities */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Stage Planned Quantities</h2>
          <p className="text-sm text-muted-foreground">Set the planned quantity for each production stage</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "cuttingQty", label: "Cutting", color: "bg-blue-50 border-blue-200" },
              { key: "stitchingQty", label: "Stitching", color: "bg-purple-50 border-purple-200" },
              { key: "finishingQty", label: "Finishing", color: "bg-amber-50 border-amber-200" },
              { key: "packingQty", label: "Packing", color: "bg-green-50 border-green-200" },
            ].map(s => (
              <div key={s.key} className={`border rounded-xl p-4 ${s.color}`}>
                <label className="block text-sm font-semibold mb-2">{s.label} (pcs)</label>
                <input
                  type="number" min="0"
                  value={form[s.key as keyof typeof form]}
                  onChange={e => set(s.key, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between bg-card border rounded-xl px-6 py-4">
          <Link href="/production" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Creating..." : "Create Production Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
