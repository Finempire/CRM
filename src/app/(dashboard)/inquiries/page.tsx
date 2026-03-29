import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import type { InquiryStatus, Prisma } from "@prisma/client";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import { Plus, QrCode, Search, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Inquiries" };

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const canConvert = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"].includes(role);

  const where: Prisma.InquiryWhereInput = {
    deletedAt: null,
    ...(sp.status && { status: sp.status as InquiryStatus }),
    ...(sp.search && {
      OR: [
        { inquiryNumber: { contains: sp.search, mode: "insensitive" } },
        { buyerName: { contains: sp.search, mode: "insensitive" } },
        { itemDetails: { contains: sp.search, mode: "insensitive" } },
      ],
    }),
  };

  const [inquiries, total, counts] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: { buyer: true, attachments: { take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
    prisma.inquiry.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { deletedAt: null },
    }),
  ]);

  const statusCounts = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));

  const statusTabs: { label: string; value: string; count?: number }[] = [
    { label: "All", value: "", count: total },
    { label: "New", value: "NEW", count: statusCounts.NEW },
    { label: "Reviewing", value: "REVIEWING", count: statusCounts.REVIEWING },
    { label: "Converted", value: "CONVERTED", count: statusCounts.CONVERTED },
    { label: "Rejected", value: "REJECTED", count: statusCounts.REJECTED },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inquiries</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} inquiries total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inquiries/qr-codes" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition-colors">
            <QrCode size={15} /> QR Codes
          </Link>
          {canConvert && (
            <Link href="/inquiries/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm">
              <Plus size={16} /> New Inquiry
            </Link>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/inquiries?status=${tab.value}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              (sp.status ?? "") === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${(sp.status ?? "") === tab.value ? "bg-white/20" : "bg-muted"}`}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            defaultValue={sp.search}
            placeholder="Search inquiry #, buyer name, style..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <input type="hidden" name="status" value={sp.status ?? ""} />
        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          Search
        </button>
      </form>

      {/* Inquiries Grid */}
      {inquiries.length === 0 ? (
        <div className="py-20 text-center">
          <QrCode size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No inquiries found</p>
          <p className="text-sm text-muted-foreground mt-1">Clients can submit inquiries via QR code or direct link</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-card border rounded-xl p-5 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="font-semibold text-foreground">{inquiry.inquiryNumber}</span>
                    <span className={`status-chip ${getStatusColor(inquiry.status)}`}>{inquiry.status}</span>
                    {inquiry.intakeSource && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{inquiry.intakeSource}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Buyer</p>
                      <p className="font-medium">{inquiry.buyerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Style / Item</p>
                      <p className="font-medium truncate">{inquiry.itemDetails ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="font-medium">{inquiry.quantity?.toLocaleString() ?? "—"} pcs</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ship Date</p>
                      <p className="font-medium">{formatDate(inquiry.shipmentDate)}</p>
                    </div>
                  </div>
                  {inquiry.otherComments && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{inquiry.otherComments}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{formatDate(inquiry.createdAt)}</p>
                  {inquiry.status === "NEW" && canConvert && (
                    <Link
                      href={`/inquiries/${inquiry.id}/convert`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      Convert to Order <ArrowRight size={12} />
                    </Link>
                  )}
                  <Link href={`/inquiries/${inquiry.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    View details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
