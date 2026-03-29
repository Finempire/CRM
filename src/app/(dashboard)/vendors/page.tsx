import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import { Building2, Plus, Star, ExternalLink, Phone, Mail } from "lucide-react";

export const metadata: Metadata = { title: "Vendors" };

type SearchParams = { search?: string; type?: string; page?: string };

const VENDOR_TYPES = ["FABRIC", "TRIMS", "JOB_WORK", "LOGISTICS", "MISC"];

const TYPE_COLORS: Record<string, string> = {
  FABRIC: "bg-blue-100 text-blue-700",
  TRIMS: "bg-purple-100 text-purple-700",
  JOB_WORK: "bg-orange-100 text-orange-700",
  LOGISTICS: "bg-cyan-100 text-cyan-700",
  MISC: "bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 30;

export default async function VendorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "manage:inventory") && !hasPermission(role, "create:purchase_order")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = parseInt(sp.page || "1");
  const canManage = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "STORE_MANAGER", "PROCUREMENT_USER", "ADMIN_OPERATIONS"].includes(role);

  const where: any = {
    deletedAt: null,
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.search ? {
      OR: [
        { name: { contains: sp.search, mode: "insensitive" } },
        { code: { contains: sp.search, mode: "insensitive" } },
        { email: { contains: sp.search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true, bomItems: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.vendor.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} vendors registered</p>
        </div>
        {canManage && (
          <Link href="/vendors/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Add Vendor
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={sp.search}
            placeholder="Search vendors..."
            className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary w-56"
          />
          <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Search</button>
          {sp.search && <Link href="/vendors" className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted">Clear</Link>}
        </form>
        <div className="flex gap-1.5 flex-wrap">
          <Link href="/vendors" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!sp.type ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>All</Link>
          {VENDOR_TYPES.map(t => (
            <Link key={t} href={`/vendors?type=${t}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sp.type === t ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
              {t}
            </Link>
          ))}
        </div>
      </div>

      {/* Vendor Grid */}
      {vendors.length === 0 ? (
        <div className="py-20 text-center bg-card border rounded-xl">
          <Building2 size={48} className="mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="font-semibold">No vendors found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {canManage ? <Link href="/vendors/new" className="text-primary hover:underline">Add your first vendor</Link> : "No vendors registered yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-card border rounded-xl p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{vendor.name}</h3>
                    {vendor.type && (
                      <span className={`status-chip text-[10px] ${TYPE_COLORS[vendor.type] || "bg-gray-100 text-gray-600"}`}>{vendor.type}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{vendor.code}</p>
                </div>
                {vendor.rating && (
                  <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < vendor.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                {vendor.email && (
                  <p className="flex items-center gap-1.5"><Mail size={11} /><span className="truncate">{vendor.email}</span></p>
                )}
                {vendor.phone && (
                  <p className="flex items-center gap-1.5"><Phone size={11} />{vendor.phone}</p>
                )}
                {vendor.country && (
                  <p>📍 {vendor.country}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{vendor._count.purchaseOrders} POs</span>
                  <span>{vendor._count.bomItems} BOM items</span>
                </div>
                {canManage && (
                  <Link href={`/vendors/${vendor.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit <ExternalLink size={11} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/vendors?page=${page - 1}${sp.type ? `&type=${sp.type}` : ""}${sp.search ? `&search=${sp.search}` : ""}`}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/vendors?page=${page + 1}${sp.type ? `&type=${sp.type}` : ""}${sp.search ? `&search=${sp.search}` : ""}`}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
