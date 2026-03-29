"use client";

import { useState } from "react";
import { Save, Loader2, Tags, Link as LinkIcon, Building2 } from "lucide-react";

type Tab = "company" | "defaults" | "integrations";

interface Props {
  settings: Record<string, string>;
  canEdit: boolean;
}

export function SettingsForm({ settings, canEdit }: Props) {
  const [tab, setTab] = useState<Tab>("company");
  const [values, setValues] = useState<Record<string, string>>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "company" as Tab, label: "Company Profile", icon: Building2 },
    { id: "defaults" as Tab, label: "Defaults", icon: Tags },
    { id: "integrations" as Tab, label: "Integrations", icon: LinkIcon },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="space-y-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="md:col-span-3">
        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl overflow-hidden">
          {tab === "company" && (
            <>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Company Profile</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Basic information used on invoices and reports</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Company Name</label>
                    <input value={values.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input type="email" value={values.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone</label>
                    <input value={values.company_phone ?? ""} onChange={(e) => set("company_phone", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Address</label>
                    <textarea rows={2} value={values.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60" />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "defaults" && (
            <>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Defaults & Customization</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Number prefixes, currency, and notification settings</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Default Currency</label>
                    <select value={values.default_currency ?? "INR"} onChange={(e) => set("default_currency", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60">
                      {["INR", "USD", "EUR", "GBP", "AUD"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Order Prefix</label>
                    <input value={values.order_prefix ?? "ORD"} onChange={(e) => set("order_prefix", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Invoice Prefix</label>
                    <input value={values.invoice_prefix ?? "INV"} onChange={(e) => set("invoice_prefix", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">PO Prefix</label>
                    <input value={values.po_prefix ?? "PO"} onChange={(e) => set("po_prefix", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">TNA Warning Days</label>
                    <input type="number" min="1" value={values.tna_warning_days ?? "3"} onChange={(e) => set("tna_warning_days", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Payment Overdue Days</label>
                    <input type="number" min="1" value={values.payment_overdue_days ?? "30"} onChange={(e) => set("payment_overdue_days", e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "integrations" && (
            <>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Integrations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Email, WhatsApp, and other service integrations</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Available Integrations</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Email (Resend / SMTP) — configured via environment variables</li>
                    <li>WhatsApp — Phase 2 integration (API keys via .env)</li>
                    <li>SMS (Twilio) — Phase 2 integration</li>
                    <li>Vertex AI — Phase 3 document extraction</li>
                  </ul>
                  <p className="mt-2 text-xs">Configure these in your <code className="bg-muted rounded px-1">.env.local</code> file.</p>
                </div>
              </div>
            </>
          )}

          {canEdit && (
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {saved && <p className="text-sm text-green-600">Settings saved successfully.</p>}
              </div>
              <button
                type="submit"
                disabled={saving || tab === "integrations"}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
