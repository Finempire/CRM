import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inquiry Submitted" };

export default async function IntakeSuccessPage({
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ id?: string; ct?: string }>;
}) {
  const sp = await searchParams;
  const portalUrl = sp.ct ? `/portal/${sp.ct}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-md w-full">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Inquiry Submitted!</h1>
        <p className="text-slate-500 text-sm mb-6">
          Thank you! Your inquiry has been received. Our team will review it and get back to you within 24 hours.
        </p>

        {sp.id && (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mb-6 font-mono">
            Reference: {sp.id.slice(-10).toUpperCase()}
          </p>
        )}

        {/* Client portal link */}
        {portalUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-1">📦 Track your order</p>
            <p className="text-xs text-blue-700 mb-3">
              Save this link to track your order status, view updates, and request changes at any time.
            </p>
            <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-blue-800 break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}${portalUrl}`
                : portalUrl}
            </div>
            <a
              href={portalUrl}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition-colors"
            >
              View Order Status →
            </a>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Our team will contact you at the details you provided.
        </p>
      </div>
    </div>
  );
}
