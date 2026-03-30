import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search, Globe, Phone, Mail, Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Buyers" };

interface SearchParams {
  search?: string;
  country?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export default async function BuyersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const where = {
    deletedAt: null as null,
    ...(sp.search && {
      OR: [
        { name: { contains: sp.search } },
        { code: { contains: sp.search } },
        { email: { contains: sp.search } },
      ],
    }),
    ...(sp.country && { country: sp.country }),
  };

  const [buyers, totalCount] = await Promise.all([
    prisma.buyer.findMany({
      where,
      include: {
        _count: { select: { orders: true, inquiries: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.buyer.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buyers</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} buyers registered</p>
        </div>
        <Link
          href="/buyers/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Buyer
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <form className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Search buyers..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <input
            name="country"
            defaultValue={sp.country}
            placeholder="Country"
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring w-40"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
          >
            Search
          </button>
          {(sp.search || sp.country) && (
            <Link href="/buyers" className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {buyers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No buyers found</p>
            <p className="text-sm mt-1">Add your first buyer to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buyer Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment Terms</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{buyer.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/buyers/${buyer.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {buyer.name}
                    </Link>
                    {buyer.shortName && (
                      <span className="ml-2 text-xs text-muted-foreground">({buyer.shortName})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      {buyer.country ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                      {buyer.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{buyer.paymentTerms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{buyer._count.orders}</span>
                    <span className="text-muted-foreground ml-1">orders</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {buyer.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {buyer.email}
                        </div>
                      )}
                      {buyer.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {buyer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${buyer.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {buyer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/buyers?page=${page - 1}${sp.search ? `&search=${sp.search}` : ""}`}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent">Previous</Link>
            )}
            {page < totalPages && (
              <Link href={`/buyers?page=${page + 1}${sp.search ? `&search=${sp.search}` : ""}`}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
