import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, ExternalLink, Download } from "lucide-react";
import QRCode from "qrcode";

export const metadata: Metadata = { title: "QR Codes — Inquiries" };

export default async function QrCodesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const canManage = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"].includes(role);

  const forms = await prisma.intakeForm.findMany({
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Generate QR SVGs server-side for all forms
  const formsWithQr = await Promise.all(
    forms.map(async (form) => {
      const intakeUrl = `${baseUrl}/intake/${form.token}`;
      const qrSvg = await QRCode.toString(intakeUrl, {
        type: "svg",
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        width: 200,
      });
      return { ...form, intakeUrl, qrSvg };
    })
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code Intake Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Share these links or QR codes with buyers to collect inquiries directly
          </p>
        </div>
        {canManage && (
          <Link
            href="/inquiries/qr-codes/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"
          >
            <Plus size={16} /> New Form
          </Link>
        )}
      </div>

      {formsWithQr.length === 0 ? (
        <div className="bg-card border rounded-xl py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted-foreground/50">
              <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h-3zM15 21h3M21 15v3M21 21h-3v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground">No intake forms yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create a form and share the link or QR code with your buyers
          </p>
          {canManage && (
            <Link
              href="/inquiries/qr-codes/new"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus size={16} /> Create First Form
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formsWithQr.map((form) => {
            const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();

            return (
              <div key={form.id} className="bg-card border rounded-xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {form.buyerName || "General Form"}
                    </p>
                    {form.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isExpired
                        ? "bg-red-100 text-red-700"
                        : form.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isExpired ? "Expired" : form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Real QR Code */}
                <div className="flex items-center justify-center bg-white rounded-xl p-4 border">
                  <div
                    className="w-40 h-40"
                    dangerouslySetInnerHTML={{ __html: form.qrSvg }}
                  />
                </div>

                {/* URL row */}
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground border">
                  <span className="flex-1 truncate">/intake/{form.token.slice(0, 18)}…</span>
                  <a
                    href={form.intakeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 flex-shrink-0"
                    title="Open form in new tab"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {formatDate(form.createdAt)}</span>
                  {form.expiresAt && (
                    <span className={isExpired ? "text-red-500 font-medium" : ""}>
                      Expires {formatDate(form.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Create an intake form (optionally set a buyer name for tracking)</li>
          <li>Share the link or print the QR code and give it to your buyer</li>
          <li>Buyer fills in their inquiry — it appears instantly in the Inquiries list</li>
          <li>Your team reviews and converts it to an order</li>
        </ol>
      </div>
    </div>
  );
}
