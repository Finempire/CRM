import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatFileSize, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { DocumentCategory } from "@prisma/client";
import { FolderOpen, FileText, Search, Download } from "lucide-react";

export const metadata: Metadata = { title: "Documents" };

interface SearchParams { search?: string; category?: string; orderId?: string; page?: string; }
const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CLIENT_REQUEST: "01 Client Request",
  COMMERCIAL: "02 Commercial",
  TECH_PACK: "03 Tech Pack",
  PATTERN: "04 Pattern",
  BOM_MATERIAL_PLAN: "05 BOM & Material Plan",
  PURCHASE_ORDERS: "06 Purchase Orders",
  INWARD_GRN: "07 Inward / GRN",
  PRODUCTION_FILES: "08 Production Files",
  SHIPPING_DOCS: "09 Shipping Docs",
  INVOICE_PAYMENT: "10 Invoice & Payment",
  QA_INSPECTION: "11 QA / Inspection",
  FINAL_DELIVERY: "12 Final Delivery",
  OTHER: "Other",
};

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const where: any = {
    deletedAt: null,
    ...(sp.category ? { category: sp.category as DocumentCategory } : {}),
    ...(sp.orderId ? { orderId: sp.orderId } : {}),
    ...(sp.search ? {
      OR: [
        { title: { contains: sp.search } },
        { fileName: { contains: sp.search } },
        { order: { orderNumber: { contains: sp.search } } },
        { order: { buyer: { name: { contains: sp.search } } } },
      ],
    } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        order: { include: { buyer: { select: { name: true } } } },
        uploadedBy: { select: { name: true } },
        versions: { select: { id: true } },
      },
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.document.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">{total} documents across all orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <form className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input name="search" defaultValue={sp.search} placeholder="Search title, file, order#..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select name="category" defaultValue={sp.category ?? ""}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background min-w-[200px]">
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90">Filter</button>
          {(sp.search || sp.category) && <Link href="/documents" className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">Clear</Link>}
        </form>
      </div>

      {/* Document grid / list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm mt-1">Documents are uploaded from order detail pages</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Document</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Version</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Approval</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uploaded By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <Link href={`/documents/${doc.id}`} className="font-medium text-primary hover:underline line-clamp-1">
                          {doc.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{doc.fileName} · {formatFileSize(doc.fileSize)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                      {CATEGORY_LABELS[doc.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${doc.orderId}`} className="text-muted-foreground hover:text-foreground">
                      {doc.order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.order.buyer.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">v{doc.currentVersion}</span>
                    {doc.versions.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">({doc.versions.length} hist)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.approvalStatus)}`}>
                      {doc.approvalStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.uploadedBy?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {Math.ceil(total / PAGE_SIZE) > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/documents?page=${page - 1}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent">Previous</Link>}
            {page < Math.ceil(total / PAGE_SIZE) && <Link href={`/documents?page=${page + 1}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
