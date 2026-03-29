import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Factory, CheckSquare, AlertCircle, Activity, BarChart2, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Production Dashboard" };

export default async function ProductionDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "PRODUCTION_MANAGER", "ADMIN_OPERATIONS"].includes(role)) redirect("/dashboard");

  const userId = session.user.id!;

  const [pendingApprovals, activeProduction, materialReady, materialPending, recentUpdates, wipByStage] = await Promise.all([
    prisma.approval.count({ where: { type: "PRE_PRODUCTION", status: "PENDING" } }),
    prisma.productionPlan.count({ where: { isApproved: true, actualFinishDate: null } }),
    prisma.materialRequest.count({ where: { status: "READY" } }),
    prisma.materialRequest.count({ where: { status: { in: ["PENDING", "ORDERED", "PARTIAL_RECEIVED"] } } }),
    prisma.productionUpdate.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: {
        stageTracker: {
          include: {
            productionPlan: {
              include: { order: { include: { buyer: true } } },
            },
          },
        },
      },
    }),
    prisma.productionStageTracker.groupBy({
      by: ["stage"],
      _sum: { plannedQty: true, actualQty: true, rejectionQty: true },
      where: { status: "IN_PROGRESS" },
    }),
  ]);

  const stats = [
    { label: "Pending Approvals", value: pendingApprovals, icon: CheckSquare, color: "text-red-600", bg: "bg-red-50", href: "/orders?tab=pre-production" },
    { label: "Active Production", value: activeProduction, icon: Factory, color: "text-blue-600", bg: "bg-blue-50", href: "/production" },
    { label: "Material Ready", value: materialReady, icon: CheckSquare, color: "text-green-600", bg: "bg-green-50", href: "/material-requests?status=READY" },
    { label: "Material Pending", value: materialPending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", href: "/material-requests" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Production Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/production" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Activity size={16} /> WIP Board
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="stat-card group cursor-pointer">
              <div className={`p-2.5 rounded-lg ${stat.bg} w-fit`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* WIP by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">WIP by Stage (Active)</h2>
          </div>
          <div className="p-6 space-y-4">
            {wipByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active production</p>
            ) : (
              wipByStage.map((wip) => {
                const planned = wip._sum.plannedQty ?? 0;
                const actual = wip._sum.actualQty ?? 0;
                const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
                return (
                  <div key={wip.stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{wip.stage}</span>
                      <span className="text-xs text-muted-foreground">{actual} / {planned} pcs ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">Recent Updates</h2>
            <Link href="/production" className="text-sm text-primary hover:underline">Board view</Link>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {recentUpdates.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No recent updates</div>
            ) : (
              recentUpdates.map((update) => (
                <div key={update.id} className="px-6 py-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{update.stageTracker.productionPlan.order.buyer.name}</p>
                      <p className="text-xs text-muted-foreground">{update.stageTracker.stage} stage</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{update.actualQty} pcs</p>
                      {update.rejectionQty > 0 && (
                        <p className="text-xs text-red-500">{update.rejectionQty} rejected</p>
                      )}
                    </div>
                  </div>
                  {update.delayReason && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {update.delayReason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
