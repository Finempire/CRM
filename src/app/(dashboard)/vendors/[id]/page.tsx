"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Save, Star, Phone, Mail, MapPin, ExternalLink } from "lucide-react";

const VENDOR_TYPES = ["FABRIC", "TRIMS", "JOB_WORK", "LOGISTICS", "MISC"];

export default function VendorDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: "", type: "", email: "", phone: "", address: "",
    country: "", taxNumber: "", paymentTerms: "", rating: "3", notes: "",
  });

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then(r => r.json())
      .then(d => {
        setVendor(d.vendor);
        if (d.vendor) {
          setForm({
            name: d.vendor.name || "",
            type: d.vendor.type || "",
            email: d.vendor.email || "",
            phone: d.vendor.phone || "",
            address: d.vendor.address || "",
            country: d.vendor.country || "",
            taxNumber: d.vendor.taxNumber || "",
            paymentTerms: d.vendor.paymentTerms || "",
            rating: String(d.vendor.rating || 3),
            notes: d.vendor.notes || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setVendor(data.vendor);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground animate-pulse">Loading...</p></div>;
  if (!vendor) return <div className="py-20 text-center"><p className="text-muted-foreground">Vendor not found</p><Link href="/vendors" className="text-primary hover:underline text-sm mt-2 inline-block">← Back</Link></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/vendors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Vendors</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title flex items-center gap-2"><Building2 size={20} /> {vendor.name}</h1>
        </div>
        <button onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${editing ? "bg-muted" : "hover:bg-muted"}`}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {!editing ? (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{vendor.name}</h2>
                  {vendor.type && <span className="status-chip bg-blue-100 text-blue-700">{vendor.type}</span>}
                </div>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">{vendor.code}</p>
              </div>
              {vendor.rating && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className={i < vendor.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {vendor.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail size={14} />{vendor.email}</div>}
              {vendor.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone size={14} />{vendor.phone}</div>}
              {vendor.country && <div className="flex items-center gap-2 text-muted-foreground"><MapPin size={14} />{vendor.country}</div>}
              {vendor.taxNumber && <div><span className="text-muted-foreground">GST: </span>{vendor.taxNumber}</div>}
              {vendor.paymentTerms && <div><span className="text-muted-foreground">Payment: </span>{vendor.paymentTerms}</div>}
            </div>
            {vendor.address && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">{vendor.address}</p>}
            {vendor.notes && <p className="text-sm text-muted-foreground mt-2 italic">{vendor.notes}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Purchase Orders", value: vendor._count?.purchaseOrders || 0 },
              { label: "BOM Items", value: vendor._count?.bomItems || 0 },
              { label: "Job Works", value: vendor._count?.jobWorks || 0 },
            ].map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {vendor.purchaseOrders?.length > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b"><h2 className="font-semibold">Recent Purchase Orders</h2></div>
              <div className="divide-y">
                {vendor.purchaseOrders.map((po: any) => (
                  <div key={po.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-mono font-medium">{po.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{po.order?.orderNumber} · {po.order?.buyer?.name}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="status-chip bg-gray-100 text-gray-600 text-[10px]">{po.status}</span>
                      <Link href={`/orders/${po.orderId}`} className="text-primary hover:underline text-xs flex items-center gap-1">
                        View <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold">Edit Vendor</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "name", label: "Vendor Name", type: "text", required: true },
                { key: "email", label: "Email", type: "email" },
                { key: "phone", label: "Phone", type: "tel" },
                { key: "country", label: "Country", type: "text" },
                { key: "taxNumber", label: "GST / Tax No.", type: "text" },
                { key: "paymentTerms", label: "Payment Terms", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
                  <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)}
                    required={f.required}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select value={form.type} onChange={e => set("type", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Select type...</option>
                  {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rating</label>
                <select value={form.rating} onChange={e => set("rating", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{"★".repeat(r)}{"☆".repeat(5 - r)} ({r}/5)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 bg-card border rounded-xl px-6 py-4">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Save size={16} />{saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
