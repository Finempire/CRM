"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewQrFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      buyerName: (form.elements.namedItem("buyerName") as HTMLInputElement).value || null,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value || null,
      expiresAt: (form.elements.namedItem("expiresAt") as HTMLInputElement).value || null,
    };

    try {
      const res = await fetch("/api/intake/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to create form");
        setLoading(false);
        return;
      }

      router.push("/inquiries/qr-codes");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inquiries/qr-codes" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">New Intake Form</h1>
          <p className="text-muted-foreground text-sm">Generate a shareable link & QR code for buyer inquiries</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Buyer Name <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            name="buyerName"
            placeholder="e.g. Zara, H&M — leave blank for generic form"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            name="description"
            rows={3}
            placeholder="e.g. Summer 2025 collection inquiries"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            name="expiresAt"
            type="date"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Creating…" : "Create Form"}
          </button>
          <Link href="/inquiries/qr-codes" className="px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
