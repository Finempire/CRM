"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

interface CostingValues {
  fabricCost: any; trimmingsCost: any; accessoriesCost: any; packagingCost: any;
  cuttingCost: any; stitchingCost: any; finishingCost: any;
  printingCost: any; embroideryCost: any; washingCost: any; otherJobWorkCost: any;
  overheadCost: any; shippingCost: any;
  sellingRate: any; notes: string | null;
}

interface Props { costingId: string; initialValues: CostingValues; currency: string; }

const FIELDS: { key: keyof CostingValues; label: string; group: string }[] = [
  { key: "fabricCost", label: "Fabric", group: "Materials" },
  { key: "trimmingsCost", label: "Trimmings", group: "Materials" },
  { key: "accessoriesCost", label: "Accessories", group: "Materials" },
  { key: "packagingCost", label: "Packaging", group: "Materials" },
  { key: "cuttingCost", label: "Cutting", group: "Labour" },
  { key: "stitchingCost", label: "Stitching", group: "Labour" },
  { key: "finishingCost", label: "Finishing", group: "Labour" },
  { key: "printingCost", label: "Printing", group: "Job Work" },
  { key: "embroideryCost", label: "Embroidery", group: "Job Work" },
  { key: "washingCost", label: "Washing", group: "Job Work" },
  { key: "otherJobWorkCost", label: "Other Job Work", group: "Job Work" },
  { key: "overheadCost", label: "Overhead", group: "Overhead" },
  { key: "shippingCost", label: "Shipping", group: "Overhead" },
];

export function CostingForm({ costingId, initialValues, currency }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = { notes: initialValues.notes ?? "" };
    FIELDS.forEach((f) => { v[f.key] = String(Number(initialValues[f.key]) || 0); });
    v.sellingRate = String(Number(initialValues.sellingRate) || 0);
    return v;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, any> = { notes: values.notes, sellingRate: parseFloat(values.sellingRate) || 0 };
      FIELDS.forEach((f) => { payload[f.key] = parseFloat(values[f.key]) || 0; });

      const res = await fetch(`/api/costing/${costingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const groups = ["Materials", "Labour", "Job Work", "Overhead"];

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-5">
      <h3 className="font-semibold text-base mb-4">Edit Costing</h3>
      {error && <div className="mb-3 bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">{error}</div>}
      <form onSubmit={handleSave} className="space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group}</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.filter((f) => f.group === group).map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{f.label} ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Selling</p>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Selling Rate per Piece ({currency})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.sellingRate}
              onChange={(e) => setValues((v) => ({ ...v, sellingRate: e.target.value }))}
              className="w-full max-w-[180px] px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Notes</label>
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Costing
          </button>
        </div>
      </form>
    </div>
  );
}
