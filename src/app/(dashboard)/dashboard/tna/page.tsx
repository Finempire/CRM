import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Calendar, Clock, CheckCircle2, AlertTriangle, Circle, ExternalLink } from "lucide-react";

export const metadata = { title: "TNA Calendar" };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-600", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  NA: { label: "N/A", color: "bg-gray-50 text-gray-400", icon: Circle },
};

export default async function TnaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["CLOSED", "CANCELLED", "PAID"] },
      tnaMilestones: { some: {} },
    },
    include: {
      buyer: true,
      tnaMilestones: { orderBy: { plannedDate: "asc" } },
    },
    orderBy: { shipmentDate: "asc" },
    take: 30,
  });

  const ordersWithoutTna = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["CLOSED", "CANCELLED", "PAID", "INQUIRY"] },
      tnaMilestones: { none: {} },
    },
    include: { buyer: true },
    take: 10,
  });

  const totalMilestones = orders.reduce((s, o) => s + o.tnaMilestones.length, 0);
  const delayedCount = orders.reduce((s, o) => s + o.tnaMilestones.filter(m => m.status === "DELAYED").length, 0);
  const completedCount = orders.reduce((s, o) => s + o.tnaMilestones.filter(m => m.status === "COMPLETED").length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">TNA Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Time & Action plan tracking across all active orders</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Orders", value: orders.length, color: "text-blue-600" },
          { label: "Total Milestones", value: totalMilestones, color: "text-foreground" },
          { label: "Completed", value: completedCount, color: "text-green-600" },
          { label: "Delayed", value: delayedCount, color: "text-red-600" },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {orders.map(order => {
          const daysToShip = order.shipmentDate ? Math.ceil((new Date(order.shipmentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          const milestonesDone = order.tnaMilestones.filter(m => m.status === "COMPLETED").length;
          const progress = order.tnaMilestones.length > 0 ? Math.round((milestonesDone / order.tnaMilestones.length) * 100) : 0;

          return (
            <div key={order.id} className="bg-card rounded-xl border overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.buyer.name}</p>
                  </div>
                  <Link href={`/orders/${order.id}`} className="text-primary hover:underline"><ExternalLink size={14} /></Link>
                  {order.tnaMilestones.some(m => m.status === "DELAYED") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      <AlertTriangle size={11} /> Has Delays
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Ship By</p>
                    <p className={`font-semibold ${daysToShip !== null && daysToShip <= 7 ? "text-red-600" : daysToShip !== null && daysToShip <= 14 ? "text-yellow-600" : ""}`}>
                      {order.shipmentDate ? formatDate(order.shipmentDate) : "—"}
                      {daysToShip !== null && <span className="text-xs font-normal ml-1">({daysToShip}d)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="font-semibold">{milestonesDone}/{order.tnaMilestones.length}</p>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progress === 100 ? "bg-green-500" : progress > 50 ? "bg-blue-500" : "bg-yellow-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.tnaMilestones.map(m => {
                    const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING;
                    const Icon = cfg.icon;
                    const isOverdue = m.status !== "COMPLETED" && new Date(m.plannedDate) < new Date();
                    return (
                      <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? "border-red-200 bg-red-50/50" : "border-border bg-background"}`}>
                        <Icon size={16} className={`mt-0.5 flex-shrink-0 ${cfg.color.split(" ")[1]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(m.plannedDate)}</span>
                            {isOverdue && <span className="text-[10px] text-red-500 font-semibold">OVERDUE</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
            <Calendar size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No active TNA plans found</p>
          </div>
        )}
      </div>

      {ordersWithoutTna.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold flex items-center gap-2 text-amber-600"><AlertTriangle size={18} /> Orders Missing TNA Plan ({ordersWithoutTna.length})</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {ordersWithoutTna.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors">
                {order.orderNumber} <span className="text-xs text-muted-foreground">· {order.buyer.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
