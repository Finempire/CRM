import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import IntakeFormClient from "./IntakeFormClient";

export const metadata: Metadata = { title: "Submit Inquiry" };

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await prisma.intakeForm.findUnique({
    where: { token, isActive: true },
  });

  if (!form) notFound();

  const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.961-.567 2.419-1.473.459-.906.34-1.992-.307-2.773L13.12 4.472C12.473 3.69 11.492 3.25 10.5 3.25s-1.973.44-2.62 1.222L3.77 13.754c-.647.78-.766 1.867-.307 2.773C3.921 17.433 4.828 18 5.882 18z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Link Expired</h2>
          <p className="text-slate-500 text-sm">This inquiry form link has expired. Please contact us for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <IntakeFormClient
      token={token}
      buyerName={form.buyerName ?? ""}
    />
  );
}
