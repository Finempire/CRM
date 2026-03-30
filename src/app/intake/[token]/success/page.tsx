import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Inquiry Submitted" };

export default async function IntakeSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  await params; // token not needed on success page
  const sp = await searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-sm w-full">
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
            Reference: {sp.id.slice(-8).toUpperCase()}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs text-slate-400">Need to submit another inquiry?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
