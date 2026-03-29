"use client";

import { useState, useEffect } from "react";
import { saveCosting, approveCosting } from "@/app/actions/costing";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Save, Plus, Trash2, AlertCircle, Loader2, TrendingUp, TrendingDown, Package, Scissors, Truck, Settings } from "lucide-react";

type CostingLine = {
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  notes: string;
};

type Props = {
  orderId: string;
  totalQuantity: number;
  userRole: string;
  initialCosting: any;
};

const COST_FIELDS = {
  materials: [
    { key: "fabricCost", label: "Fabric Cost" },
    { key: "trimmingsCost", label: "Trimmings & Buttons" },
    { key: "accessoriesCost", label: "Accessories" },
    { key: "packagingCost", label: "Packaging & Cartons" },
  ],
  labour: [
    { key: "cuttingCost", label: "Cutting" },
    { key: "stitchingCost", label: "Stitching" },
    { key: "finishingCost", label: "Finishing & QC" },
  ],
  jobWork: [
    { key: "printingCost", label: "Printing / Screen Print" },
    { key: "embroideryCost", label: "Embroidery" },
    { key: "washingCost", label: "Washing / Dyeing" },
    { key: "otherJobWorkCost", label: "Other Job Work" },
  ],
  overheads: [
    { key: "overheadCost", label: "Factory Overheads" },
    { key: "shippingCost", label: "Logistics & Shipping" },
  ],
};

export function CostingForm({ orderId, totalQuantity, userRole, initialCosting }: Props) {
  const canApprove = ["SUPER_ADMIN", "CEO", "ACCOUNTANT_ADMIN"].includes(userRole);
  const isApproved = initialCosting?.approvalStatus === "APPROVED";

  const [form, setForm] = useState({
    fabricCost: initialCosting?.fabricCost ? String(Number(initialCosting.fabricCost)) : "0",
    trimmingsCost: initialCosting?.trimmingsCost ? String(Number(initialCosting.trimmingsCost)) : "0",
    accessoriesCost: initialCosting?.accessoriesCost ? String(Number(initialCosting.accessoriesCost)) : "0",
    packagingCost: initialCosting?.packagingCost ? String(Number(initialCosting.packagingCost)) : "0",
    cuttingCost: initialCosting?.cuttingCost ? String(Number(initialCosting.cuttingCost)) : "0",
    stitchingCost: initialCosting?.stitchingCost ? String(Number(initialCosting.stitchingCost)) : "0",
    finishingCost: initialCosting?.finishingCost ? String(Number(initialCosting.finishingCost)) : "0",
    printingCost: initialCosting?.printingCost ? String(Number(initialCosting.printingCost)) : "0",
    embroideryCost: initialCosting?.embroideryCost ? String(Number(initialCosting.embroideryCost)) : "0",
    washingCost: initialCosting?.washingCost ? String(Number(initialCosting.washingCost)) : "0",
    otherJobWorkCost: initialCosting?.otherJobWorkCost ? String(Number(initialCosting.otherJobWorkCost)) : "0",
    overheadCost: initialCosting?.overheadCost ? String(Number(initialCosting.overheadCost)) : "0",
    shippingCost: initialCosting?.shippingCost ? String(Number(initialCosting.shippingCost)) : "0",
    sellingRate: initialCosting?.sellingRate ? String(Number(initialCosting.sellingRate)) : "0",
    notes: initialCosting?.notes || "",
  });

  const [lineItems, setLineItems] = useState<CostingLine[]>(
    initialCosting?.lineItems?.map((li: any) => ({
      id: li.id,
      category: li.category,
      description: li.description,
      quantity: Number(li.quantity),
      unit: li.unit,
      rate: Number(li.rate),
      amount: Number(li.amount),
      notes: li.notes || "",
    })) || []
  );

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Computed totals
  const totalCost = Object.values(COST_FIELDS).flat().reduce((sum, field) => {
    return sum + (parseFloat(form[field.key as keyof typeof form] as string) || 0);
  }, 0);

  const lineItemTotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.rate), 0);
  const grandTotalCost = totalCost + lineItemTotal;
  const sellingRate = parseFloat(form.sellingRate) || 0;
  const totalRevenue = sellingRate * (totalQuantity > 0 ? totalQuantity : 1);
  const grossMargin = totalRevenue - grandTotalCost;
  const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  const handleField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { category: "MISC", description: "", quantity: 1, unit: "PCS", rate: 0, amount: 0, notes: "" }]);
  };

  const updateLineItem = (idx: number, key: string, value: string | number) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [key]: value };
      updated.amount = updated.quantity * updated.rate;
      return updated;
    }));
  };

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveCosting(orderId, form, lineItems);
      if (result.success) {
        setMessage({ type: "success", text: "Costing saved successfully!" });
      } else {
        setMessage({ type: "error", text: result.error || "Save failed" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!initialCosting?.id) {
      setMessage({ type: "error", text: "Save the costing first before approving." });
      return;
    }
    setApproving(true);
    setMessage(null);
    try {
      const result = await approveCosting(initialCosting.id, orderId, status as any);
      if (result.success) {
        setMessage({ type: "success", text: `Costing ${status.toLowerCase()} successfully.` });
      } else {
        setMessage({ type: "error", text: result.error || "Action failed" });
      }
    } finally {
      setApproving(false);
    }
  };

  const CostSection = ({ title, icon: Icon, fields, color }: { title: string; icon: any; fields: typeof COST_FIELDS.materials; color: string }) => {
    const sectionTotal = fields.reduce((sum, f) => sum + (parseFloat(form[f.key as keyof typeof form] as string) || 0), 0);
    return (
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className={`px-6 py-4 border-b bg-gradient-to-r ${color} bg-opacity-10 flex items-center justify-between`}>
          <div className="flex items-center gap-2 font-semibold">
            <Icon size={18} className="text-primary" />
            <span>{title}</span>
          </div>
          <span className="text-sm font-bold text-primary">{formatCurrency(sectionTotal)}</span>
        </div>
        <div className="p-6 space-y-4">
          {fields.map(field => (
            <div key={field.key} className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground w-48 flex-shrink-0">{field.label}</label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form[field.key as keyof typeof form] as string}
                  onChange={e => handleField(field.key, e.target.value)}
                  disabled={isApproved}
                  className="w-full pl-7 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-right"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Cost</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalCost)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-[10px] text-muted-foreground">{formatCurrency(sellingRate)}/pc × {totalQuantity} pcs</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium">Gross Margin</p>
          <p className={`text-xl font-bold mt-1 ${grossMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(grossMargin)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${marginPct >= 15 ? "bg-green-50 border-green-200" : marginPct >= 0 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-muted-foreground font-medium">Margin %</p>
          <div className="flex items-center gap-2 mt-1">
            {marginPct >= 0 ? <TrendingUp size={20} className="text-green-600" /> : <TrendingDown size={20} className="text-red-600" />}
            <p className={`text-xl font-bold ${marginPct >= 15 ? "text-green-700" : marginPct >= 0 ? "text-yellow-700" : "text-red-700"}`}>{marginPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Cost Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CostSection title="Material Costs" icon={Package} fields={COST_FIELDS.materials} color="from-blue-50" />
        <CostSection title="Labour Costs" icon={Scissors} fields={COST_FIELDS.labour} color="from-orange-50" />
        <CostSection title="Job Work" icon={Settings} fields={COST_FIELDS.jobWork} color="from-purple-50" />
        <CostSection title="Overheads & Logistics" icon={Truck} fields={COST_FIELDS.overheads} color="from-teal-50" />
      </div>

      {/* Selling Rate */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Commercial</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium w-48 flex-shrink-0">Selling Rate (per piece)</label>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.sellingRate}
              onChange={e => handleField("sellingRate", e.target.value)}
              disabled={isApproved}
              className="w-full pl-7 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 text-right font-semibold"
            />
          </div>
          <span className="text-sm text-muted-foreground">× {totalQuantity} pcs = <strong>{formatCurrency(totalRevenue)}</strong></span>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium block mb-1.5">Internal Notes</label>
          <textarea
            value={form.notes}
            onChange={e => handleField("notes", e.target.value)}
            disabled={isApproved}
            rows={3}
            placeholder="Add costing notes or assumptions..."
            className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Ad-hoc Line Items */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Additional Line Items</h3>
          {!isApproved && (
            <button onClick={addLineItem} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary hover:text-white transition-colors">
              <Plus size={16} /> Add Line
            </button>
          )}
        </div>
        <div className="p-6">
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No additional line items. Click &quot;Add Line&quot; to add specific cost breakdowns.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-semibold uppercase px-1">
                <span className="col-span-2">Category</span>
                <span className="col-span-3">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-1">Unit</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-1 text-right">Amount</span>
                <span className="col-span-1" />
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select value={item.category} onChange={e => updateLineItem(idx, "category", e.target.value)} disabled={isApproved}
                    className="col-span-2 px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                    {["FABRIC","TRIMS","ACCESSORIES","PACKAGING","PRINTING","EMBROIDERY","WASHING","LABOUR","OVERHEAD","MISC"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} disabled={isApproved}
                    placeholder="Description"
                    className="col-span-3 px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="number" value={item.quantity} onChange={e => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} disabled={isApproved}
                    className="col-span-2 px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary text-right" />
                  <input value={item.unit} onChange={e => updateLineItem(idx, "unit", e.target.value)} disabled={isApproved}
                    className="col-span-1 px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="number" value={item.rate} onChange={e => updateLineItem(idx, "rate", parseFloat(e.target.value) || 0)} disabled={isApproved}
                    className="col-span-2 px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary text-right" />
                  <span className="col-span-1 text-xs font-medium text-right">{formatCurrency(item.quantity * item.rate)}</span>
                  {!isApproved && (
                    <button onClick={() => removeLineItem(idx)} className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <div className="pt-3 border-t flex justify-end">
                <span className="text-sm font-semibold">Line Total: {formatCurrency(lineItemTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between py-4 border-t">
        <div className="text-sm text-muted-foreground">
          Grand Total Cost: <strong className="text-foreground">{formatCurrency(grandTotalCost)}</strong>
        </div>
        <div className="flex items-center gap-3">
          {canApprove && initialCosting && !isApproved && (
            <>
              <button
                onClick={() => handleApproval("REJECTED")}
                disabled={approving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle size={16} /> Reject
              </button>
              <button
                onClick={() => handleApproval("APPROVED")}
                disabled={approving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Approve Costing
              </button>
            </>
          )}
          {!isApproved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Costing
            </button>
          )}
          {isApproved && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-semibold">
              <CheckCircle size={16} /> Approved — Locked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
