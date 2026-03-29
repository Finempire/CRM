import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { Factory, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Production WIP Board" };

export default async function ProductionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const canEdit = ["SUPER_ADMIN", "PRODUCTION_MANAGER"].includes(role);

  const plans = await prisma.productionPlan.findMany({
    where: {
      isApproved: true,
      actualFinishDate: null,
    },
    include: {
      order: { include: { buyer: true } },
      stages: {
        include: {
          updates: { take: 1, orderBy: { date: "desc" } },
        },
        orderBy: { stage: "asc" },
      },
    },
    orderBy: { plannedFinishDate: "asc" },
  });

  const STAGES = ["CUTTING", "STITCHING", "FINISHING", "PACKING"] as const;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Production WIP Board</h1>
          <p className="text-muted-foreground text-sm mt-1">{plans.length} active production orders</p>
        </div>
        {canEdit && (
          <Link href="/production/plan/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus size={16} /> New Plan
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="py-20 text-center">
          <Factory size={48} className="mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="font-semibold text-foreground">No Active Production</h3>
          <p className="text-muted-foreground text-sm mt-1">No production plans are currently active</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Kanban columns header */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {STAGES.map((stage) => {
              const stageOrders = plans.flatMap((p) =>
                p.stages.filter((s) => s.stage === stage)
              );
              const totalPlanned = stageOrders.reduce((s, o) => s + o.plannedQty, 0);
              const totalActual = stageOrders.reduce((s, o) => s + o.actualQty, 0);

              return (
                <div key={stage} className="space-y-3">
                  <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{stage}</h3>
                      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">
                        {stageOrders.length}
                      </span>
                    </div>
                    {totalPlanned > 0 && (
                      <>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((totalActual / totalPlanned) * 100))}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{totalActual.toLocaleString()} / {totalPlanned.toLocaleString()} pcs</p>
                      </>
                    )}
                  </div>

                  {/* Cards for this stage */}
                  {plans.map((plan) => {
                    const stageData = plan.stages.find((s) => s.stage === stage);
                    if (!stageData) return null;

                    const pct = stageData.plannedQty > 0
                      ? Math.min(100, Math.round((stageData.actualQty / stageData.plannedQty) * 100))
                      : 0;

                    return (
                      <div key={`${plan.id}-${stage}`} className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Link href={`/orders/${plan.orderId}?tab=production`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                              {plan.order.orderNumber}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">{plan.order.buyer.name}</p>
                          </div>
                          <span className={`status-chip text-[10px] ${getStatusColor(stageData.status)}`}>
                            {stageData.status}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{pct}% done</span>
                            <span className="text-xs font-medium">{stageData.actualQty}/{stageData.plannedQty}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 80 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-1 text-center text-xs">
                          <div className="bg-muted/50 rounded p-1.5">
                            <p className="text-muted-foreground">Actual</p>
                            <p className="font-bold text-foreground">{stageData.actualQty}</p>
                          </div>
                          <div className="bg-red-50 rounded p-1.5">
                            <p className="text-muted-foreground">Reject</p>
                            <p className="font-bold text-red-600">{stageData.rejectionQty}</p>
                          </div>
                          <div className="bg-amber-50 rounded p-1.5">
                            <p className="text-muted-foreground">Balance</p>
                            <p className="font-bold text-amber-600">{stageData.balanceQty}</p>
                          </div>
                        </div>

                        {/* Last update */}
                        {stageData.updates[0] && (
                          <p className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
                            Last: {formatDate(stageData.updates[0].date)}
                            {stageData.updates[0].delayReason && ` · ⚠️ ${stageData.updates[0].delayReason}`}
                          </p>
                        )}

                        {canEdit && (
                          <Link
                            href={`/production/update/${stageData.id}`}
                            className="w-full mt-3 py-1.5 rounded-lg text-xs font-medium text-center block bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            Update Progress
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
