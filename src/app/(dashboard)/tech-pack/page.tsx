import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import { Layers, FileText, Search } from "lucide-react";

export const metadata: Metadata = { title: "Tech Pack" };

interface SearchParams { search?: string; status?: string; page?: string; }
const PAGE_SIZE = 20;

export default async function TechPackPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const where: any = {
    order: { deletedAt: null },
    ...(sp.status ? { approvalStatus: sp.status } : {}),
    ...(sp.search ? {
      OR: [
        { title: { contains: sp.search, mode: "insensitive" } },
        { order: { orderNumber: { contains: sp.search, mode: "insensitive" } } },
      ],
    } : {}),
    ...(role === "MERCHANDISER" ? { order: { merchandiserId: session.user.id } } : {}),
  };

  const [techPacks, total] = await Promise.all([
    prisma.techPack.findMany({
      where,
      include: {
        order: { include: { buyer: { select: { name: true } } } },
        style: { select: { name: true } },
        files: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.techPack.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tech Pack</h1>
          <p className="text-sm text-muted-foreground">{total} tech packs</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <form className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input name="search" defaultValue={sp.search} placeholder="Search title or order#..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select name="status" defaultValue={sp.status ?? ""}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90">Filter</button>
          {(sp.search || sp.status) && <Link href="/tech-pack" className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">Clear</Link>}
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {techPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Layers className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No tech packs found</p>
            <p className="text-sm mt-1">Tech packs are created from order detail pages</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Style</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Version</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Files</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Approval</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {techPacks.map((tp) => (
                <tr key={tp.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/tech-pack/${tp.id}`} className="font-medium text-primary hover:underline">{tp.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${tp.orderId}`} className="text-muted-foreground hover:text-foreground">{tp.order.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tp.order.buyer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tp.style?.name ?? "—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-muted rounded text-xs">{tp.version}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />{tp.files.length}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tp.approvalStatus)}`}>
                      {tp.approvalStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(tp.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
