import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Submit Inquiry</h1>
          <p className="text-slate-500 text-sm mt-1">
            Fill in your order details below.{form.buyerName && ` Welcome, ${form.buyerName}!`}
          </p>
        </div>

        <form action={`/api/intake/${token}`} method="POST" encType="multipart/form-data" className="space-y-6">
          {/* Buyer Info */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="buyer_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company / Buyer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer_name"
                  name="buyerName"
                  required
                  defaultValue={form.buyerName ?? ""}
                  placeholder="e.g. Trendy Fashion Ltd"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="contact_number" className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number <span className="text-red-500">*</span></label>
                <input
                  id="contact_number"
                  name="contactNumber"
                  required
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input
                  id="contact_email"
                  name="contactEmail"
                  type="email"
                  placeholder="buyer@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="billing_address" className="block text-sm font-medium text-slate-700 mb-1.5">Billing Address</label>
                <textarea
                  id="billing_address"
                  name="billingAddress"
                  rows={2}
                  placeholder="Full billing address"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="shipping_address" className="block text-sm font-medium text-slate-700 mb-1.5">Shipping Address</label>
                <textarea
                  id="shipping_address"
                  name="shippingAddress"
                  rows={2}
                  placeholder="Full shipping address (if different from billing)"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shipment_date" className="block text-sm font-medium text-slate-700 mb-1.5">Required Shipment Date <span className="text-red-500">*</span></label>
                <input
                  id="shipment_date"
                  name="shipmentDate"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1.5">Quantity (pcs)</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="item_details" className="block text-sm font-medium text-slate-700 mb-1.5">Item / Style Description <span className="text-red-500">*</span></label>
                <textarea
                  id="item_details"
                  name="itemDetails"
                  required
                  rows={3}
                  placeholder="Describe the style, cut, construction details..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="fabric_notes" className="block text-sm font-medium text-slate-700 mb-1.5">Fabric Notes</label>
                <textarea
                  id="fabric_notes"
                  name="fabricNotes"
                  rows={2}
                  placeholder="Fabric composition, weight, finish..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="trims_notes" className="block text-sm font-medium text-slate-700 mb-1.5">Trims & Labels Notes</label>
                <textarea
                  id="trims_notes"
                  name="trimsNotes"
                  rows={2}
                  placeholder="Buttons, zippers, labels, tags..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="printing_notes" className="block text-sm font-medium text-slate-700 mb-1.5">Printing / Embroidery Notes</label>
                <textarea
                  id="printing_notes"
                  name="printingNotes"
                  rows={2}
                  placeholder="Printing technique, placement, colors..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="other_comments" className="block text-sm font-medium text-slate-700 mb-1.5">Other Comments</label>
                <textarea
                  id="other_comments"
                  name="otherComments"
                  rows={3}
                  placeholder="Any other requirements or special instructions..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* File Attachment */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b">Attachments</h2>
            <div>
              <label htmlFor="artwork" className="block text-sm font-medium text-slate-700 mb-1.5">
                Artwork / Reference Images / Tech Sketch
              </label>
              <input
                id="artwork"
                name="artwork"
                type="file"
                multiple
                accept="image/*,.pdf,.ai,.eps,.psd,.dwg"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
              />
              <p className="text-xs text-slate-400 mt-1.5">Accepts images, PDF, AI, EPS, PSD files. Max 10MB per file.</p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
          >
            Submit Inquiry
          </button>
          <p className="text-center text-xs text-slate-400">
            Your inquiry will be reviewed by our team and you will be contacted within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
