"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, Save } from "lucide-react";

export default function ProductionUpdatePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [tracker, setTracker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    actualQty: "",
    rejectionQty: "0",
    reworkQty: "0",
    delayReason: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetch(`/api/production/${id}`)
      .then(r => r.json())
      .then(d => {
        setTracker(d.tracker);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.actualQty) { setError("Actual quantity is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/production/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualQty: parseInt(form.actualQty),
          rejectionQty: parseInt(form.rejectionQty) || 0,
          reworkQty: parseInt(form.reworkQty) || 0,
          delayReason: form.delayReason || null,
          note: form.note || null,
          date: form.date,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save update");
      router.push("/production");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
    </div>
  );

  if (!tracker) return (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">Stage tracker not found</p>
      <Link href="/production" className="text-primary hover:underline text-sm mt-2 inline-block">Back to Production</Link>
    </div>
  );

  const pct = tracker.plannedQty > 0 ? Math.min(100, Math.round((tracker.actualQty / tracker.plannedQty) * 100)) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/production" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Production
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title flex items-center gap-2"><Activity size={20} /> Update Progress</h1>
        </div>
      </div>

      {/* Stage Summary */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{tracker.stage} Stage</p>
            <p className="font-semibold text-lg mt-0.5">{tracker.productionPlan?.order?.orderNumber}</p>
            <p className="text-sm text-muted-foreground">{tracker.productionPlan?.order?.buyer?.name}</p>
          </div>
          <span className={`status-chip ${tracker.status === "DONE" ? "bg-green-100 text-green-700" : tracker.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
            {tracker.status}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center mb-4">
          {[
            { label: "Planned", value: tracker.plannedQty, color: "text-foreground" },
            { label: "Actual", value: tracker.actualQty, color: "text-blue-600" },
            { label: "Rejected", value: tracker.rejectionQty, color: "text-red-600" },
            { label: "Balance", value: tracker.balanceQty, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-2">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Update Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Daily Progress Update</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">Update Date</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Actual Qty (pcs) <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={form.actualQty} onChange={e => set("actualQty", e.target.value)}
                placeholder="0" required
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Rejection Qty</label>
              <input type="number" min="0" value={form.rejectionQty} onChange={e => set("rejectionQty", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Rework Qty</label>
              <input type="number" min="0" value={form.reworkQty} onChange={e => set("reworkQty", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Delay Reason (if any)</label>
            <input type="text" value={form.delayReason} onChange={e => set("delayReason", e.target.value)}
              placeholder="e.g. Power cut, material shortage, machine breakdown"
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Note</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-card border rounded-xl px-6 py-4">
          <Link href="/production" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
