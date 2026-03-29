"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Save } from "lucide-react";

const VENDOR_TYPES = ["FABRIC", "TRIMS", "JOB_WORK", "LOGISTICS", "MISC"];

export default function NewVendorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "", name: "", type: "", email: "", phone: "",
    address: "", country: "", taxNumber: "", paymentTerms: "",
    rating: "3", notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name) { setError("Code and name are required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vendor");
      router.push("/vendors");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/vendors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Vendors
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="page-title flex items-center gap-2"><Building2 size={20} /> New Vendor</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Vendor Code <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. VEN001" required
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Vendor Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Vendor company name" required
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Vendor Type</label>
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
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Contact Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Country</label>
              <input type="text" value={form.country} onChange={e => set("country", e.target.value)}
                placeholder="India"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">GST / Tax Number</label>
              <input type="text" value={form.taxNumber} onChange={e => set("taxNumber", e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <textarea value={form.address} onChange={e => set("address", e.target.value)}
              placeholder="Full address..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Commercial</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Terms</label>
            <input type="text" value={form.paymentTerms} onChange={e => set("paymentTerms", e.target.value)}
              placeholder="e.g. Net 30 days, 50% advance"
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any notes about this vendor..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-card border rounded-xl px-6 py-4">
          <Link href="/vendors" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} /> {saving ? "Saving..." : "Create Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}
