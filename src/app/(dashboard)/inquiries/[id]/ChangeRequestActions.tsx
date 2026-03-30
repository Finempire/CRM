"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function ChangeRequestActions({
  changeRequestId,
  inquiryId,
}: {
  changeRequestId: string;
  inquiryId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"apply" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [action, setAction] = useState<"apply" | "reject" | null>(null);

  async function handleAction(status: "APPLIED" | "REJECTED") {
    setLoading(status === "APPLIED" ? "apply" : "reject");
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/change-requests/${changeRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote: note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch {
      // silent — user sees stale state; refresh will fix
    } finally {
      setLoading(null);
    }
  }

  if (showNote && action) {
    return (
      <div className="mt-3 pt-3 border-t space-y-2">
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={action === "apply" ? "Note for client (optional)..." : "Reason for rejection..."}
          className="w-full text-xs px-2 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(action === "apply" ? "APPLIED" : "REJECTED")}
            disabled={!!loading}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${
              action === "apply"
                ? "bg-green-600 text-white hover:bg-green-500"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Confirm {action === "apply" ? "Apply" : "Reject"}
          </button>
          <button
            onClick={() => { setShowNote(false); setAction(null); }}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t">
      <button
        onClick={() => { setAction("apply"); setShowNote(true); }}
        disabled={!!loading}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Apply Changes
      </button>
      <button
        onClick={() => { setAction("reject"); setShowNote(true); }}
        disabled={!!loading}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        <XCircle className="w-3.5 h-3.5" />
        Reject
      </button>
    </div>
  );
}
