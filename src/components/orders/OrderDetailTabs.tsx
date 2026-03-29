"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { formatDate, formatDateTime, formatCurrency, getStatusColor, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Clock, ShoppingBag, FileText, Layers, ListChecks,
  Factory, Truck, Receipt, MessageSquare, AlertCircle,
  CheckCircle, Circle, ChevronDown, ChevronRight, Download,
  Upload, Plus, Eye
} from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

const TABS: Tab[] = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "merchandising", label: "Merch & TNA", icon: ShoppingBag },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "material", label: "Material", icon: ListChecks },
  { id: "production", label: "Production", icon: Factory },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "invoice", label: "Invoice & Pay", icon: Receipt },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "audit", label: "Audit", icon: AlertCircle },
];

interface OrderDetailTabsProps {
  order: any;
  isFinance: boolean;
  role: UserRole;
  userId: string;
  activeTab: string;
}

export function OrderDetailTabs({ order, isFinance, role, userId, activeTab: initialTab }: OrderDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/orders/${order.id}?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "timeline" && <TimelineTab order={order} />}
        {activeTab === "merchandising" && <MerchandisingTab order={order} role={role} />}
        {activeTab === "documents" && <DocumentsTab order={order} role={role} />}
        {activeTab === "material" && <MaterialTab order={order} role={role} />}
        {activeTab === "production" && <ProductionTab order={order} role={role} />}
        {activeTab === "logistics" && <LogisticsTab order={order} role={role} />}
        {activeTab === "invoice" && <InvoiceTab order={order} isFinance={isFinance} role={role} />}
        {activeTab === "comments" && <CommentsTab order={order} userId={userId} />}
        {activeTab === "audit" && <AuditTab order={order} />}
      </div>
    </div>
  );
}

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────

function TimelineTab({ order }: { order: any }) {
  const activities = order.activityLogs ?? [];
  const history = order.statusHistory ?? [];

  const allEvents = [
    ...history.map((h: any) => ({
      type: "status",
      date: h.changedAt,
      label: h.toStatus,
      note: h.note,
      user: null,
    })),
    ...activities.map((a: any) => ({
      type: "activity",
      date: a.createdAt,
      label: a.description,
      note: null,
      user: a.user?.name,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allEvents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Clock size={40} className="mx-auto mb-3 opacity-20" />
        <p>No activity yet for this order</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {allEvents.slice(0, 30).map((event, i) => (
        <div key={i} className="timeline-item">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            event.type === "status" ? "bg-blue-100" : "bg-muted"
          )}>
            {event.type === "status"
              ? <CheckCircle size={16} className="text-blue-600" />
              : <Circle size={16} className="text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className={cn("text-sm", event.type === "status" ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {event.type === "status"
                ? `Status changed to ${event.label?.replace(/_/g, " ")}`
                : event.label}
            </p>
            {event.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{event.note}</p>}
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              {formatDateTime(event.date)}
              {event.user && ` · ${event.user}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MERCHANDISING TAB ────────────────────────────────────────────────────────

function MerchandisingTab({ order, role }: { order: any; role: UserRole }) {
  const milestones = order.tnaMilestones ?? [];
  const techPacks = order.techPacks ?? [];
  const patterns = order.patterns ?? [];
  const bomItems = order.bomItems ?? [];

  const canEdit = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ADMIN_OPERATIONS", "MERCHANDISER"].includes(role);

  return (
    <div className="space-y-8">
      {/* TNA Milestones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">TNA Milestones</h3>
          {canEdit && (
            <Link href={`/tna?orderId=${order.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Plus size={13} /> Add Milestone
            </Link>
          )}
        </div>
        {milestones.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No TNA milestones set. {canEdit && <Link href={`/tna?orderId=${order.id}`} className="text-primary hover:underline">Add them now</Link>}
          </div>
        ) : (
          <div className="space-y-2">
            {milestones.map((m: any) => {
              const isCompleted = m.status === "COMPLETED";
              const isDelayed = m.status === "DELAYED";
              return (
                <div key={m.id} className="flex items-center gap-4 p-3.5 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isCompleted ? "bg-green-100" : isDelayed ? "bg-red-100" : "bg-muted"
                  )}>
                    {isCompleted
                      ? <CheckCircle size={16} className="text-green-600" />
                      : isDelayed
                      ? <AlertCircle size={16} className="text-red-600" />
                      : <Clock size={16} className="text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{formatDate(m.plannedDate)}</p>
                    {m.actualDate && <p className="text-xs text-muted-foreground">Done: {formatDate(m.actualDate)}</p>}
                    <span className={`status-chip text-[10px] ${getStatusColor(m.status)}`}>{m.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tech Packs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Tech Packs ({techPacks.length})</h3>
          {canEdit && (
            <Link href={`/tech-pack?orderId=${order.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Upload size={13} /> Upload
            </Link>
          )}
        </div>
        {techPacks.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No tech packs uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {techPacks.map((tp: any) => (
              <div key={tp.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <p className="text-sm font-medium">{tp.title}</p>
                  <p className="text-xs text-muted-foreground">Version {tp.version} · {formatDate(tp.createdAt)}</p>
                </div>
                <span className={`status-chip text-xs ${getStatusColor(tp.approvalStatus)}`}>{tp.approvalStatus}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOM Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Bill of Materials ({bomItems.length} items)</h3>
          {canEdit && (
            <Link href={`/bom?orderId=${order.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Plus size={13} /> Edit BOM
            </Link>
          )}
        </div>
        {bomItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No BOM items added yet
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Item</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Category</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Req. Qty</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Unit</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bomItems.slice(0, 10).map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.itemName}</p>
                      {item.color && <p className="text-xs text-muted-foreground">{item.color}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="status-chip bg-gray-100 text-gray-700 text-xs">{item.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{Number(item.netRequiredQty).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.vendor?.name ?? "—"}</td>
                  </tr>
                ))}
                {bomItems.length > 10 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-2.5 text-center text-sm text-muted-foreground">
                      <Link href={`/bom?orderId=${order.id}`} className="text-primary hover:underline">
                        View all {bomItems.length} items →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────

const DOC_CATEGORIES = [
  "CLIENT_REQUEST", "COMMERCIAL", "TECH_PACK", "PATTERN",
  "BOM_MATERIAL_PLAN", "PURCHASE_ORDERS", "INWARD_GRN", "PRODUCTION_FILES",
  "SHIPPING_DOCS", "INVOICE_PAYMENT", "QA_INSPECTION", "FINAL_DELIVERY",
];

const CAT_LABELS: Record<string, string> = {
  CLIENT_REQUEST: "01 Client Request",
  COMMERCIAL: "02 Commercial",
  TECH_PACK: "03 Tech Pack",
  PATTERN: "04 Pattern",
  BOM_MATERIAL_PLAN: "05 BOM & Material Plan",
  PURCHASE_ORDERS: "06 Purchase Orders",
  INWARD_GRN: "07 Inward & GRN",
  PRODUCTION_FILES: "08 Production Files",
  SHIPPING_DOCS: "09 Shipping Docs",
  INVOICE_PAYMENT: "10 Invoice & Payment",
  QA_INSPECTION: "11 QA / Inspection",
  FINAL_DELIVERY: "12 Final Delivery",
};

function DocumentsTab({ order, role }: { order: any; role: UserRole }) {
  const docs = order.documents ?? [];
  const byCategory = DOC_CATEGORIES.map((cat) => ({
    cat,
    docs: docs.filter((d: any) => d.category === cat),
  }));

  const canUpload = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ADMIN_OPERATIONS", "MERCHANDISER", "PRODUCTION_MANAGER", "STORE_MANAGER", "LOGISTICS_USER", "ACCOUNTANT"].includes(role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{docs.length} files across {DOC_CATEGORIES.length} categories</p>
        {canUpload && (
          <Link href={`/documents/upload?orderId=${order.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            <Upload size={13} /> Upload Document
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {byCategory.map(({ cat, docs: catDocs }) => (
          <div key={cat} className="border rounded-lg overflow-hidden">
            <div className={cn(
              "flex items-center justify-between px-4 py-2.5",
              catDocs.length > 0 ? "bg-muted/50" : "bg-muted/20"
            )}>
              <span className="text-sm font-medium">{CAT_LABELS[cat]}</span>
              <span className="text-xs text-muted-foreground">{catDocs.length} file{catDocs.length !== 1 ? "s" : ""}</span>
            </div>
            {catDocs.length > 0 && (
              <div className="divide-y">
                {catDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          v{doc.currentVersion} · {formatDate(doc.uploadedAt)} · {doc.uploadedBy?.name}
                          {doc.fileSize && ` · ${formatFileSize(doc.fileSize)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <span className={`status-chip text-[10px] ${getStatusColor(doc.approvalStatus)}`}>{doc.approvalStatus}</span>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <Download size={14} className="text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MATERIAL TAB ─────────────────────────────────────────────────────────────

function MaterialTab({ order, role }: { order: any; role: UserRole }) {
  const requests = order.materialRequests ?? [];
  const purchaseOrders = order.purchaseOrders ?? [];

  return (
    <div className="space-y-6">
      {/* Material Requests */}
      <div>
        <h3 className="font-semibold mb-3">Material Requests ({requests.length})</h3>
        {requests.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No material requests created yet
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((mr: any) => (
              <div key={mr.id} className="flex items-center justify-between p-3.5 border rounded-lg bg-background">
                <div>
                  <p className="font-medium text-sm">{mr.requestNumber}</p>
                  <p className="text-xs text-muted-foreground">{mr.lines?.length ?? 0} line items · {formatDate(mr.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-chip text-xs ${getStatusColor(mr.status)}`}>{mr.status.replace(/_/g, " ")}</span>
                  <Link href={`/material-requests/${mr.id}`} className="text-sm text-primary hover:underline">View →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Orders */}
      <div>
        <h3 className="font-semibold mb-3">Purchase Orders ({purchaseOrders.length})</h3>
        {purchaseOrders.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No purchase orders for this order
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">PO #</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Vendor</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Delivery</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <Link href={`/purchase-orders/${po.id}`} className="font-medium text-primary hover:underline">{po.poNumber}</Link>
                    </td>
                    <td className="px-4 py-2.5">{po.vendor.name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(Number(po.grandTotal))}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(po.deliveryDate)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`status-chip text-xs ${getStatusColor(po.status)}`}>{po.status.replace(/_/g, " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCTION TAB ───────────────────────────────────────────────────────────

function ProductionTab({ order, role }: { order: any; role: UserRole }) {
  const plan = order.productionPlan;
  const canEdit = ["SUPER_ADMIN", "PRODUCTION_MANAGER"].includes(role);

  if (!plan) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Factory size={40} className="mx-auto mb-3 opacity-20" />
        <p>No production plan created yet</p>
        {canEdit && (
          <Link href={`/production/plan?orderId=${order.id}`} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus size={14} /> Create Production Plan
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Planned Start", value: formatDate(plan.plannedStartDate) },
          { label: "Planned Finish", value: formatDate(plan.plannedFinishDate) },
          { label: "Production Line", value: plan.productionLine ?? "—" },
          { label: "Target/Day", value: plan.targetOutputPerDay ? `${plan.targetOutputPerDay} pcs` : "—" },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-lg border bg-background">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Stage Trackers */}
      <div>
        <h3 className="font-semibold mb-3">Production Stages</h3>
        <div className="space-y-3">
          {plan.stages?.map((stage: any) => {
            const pct = stage.plannedQty > 0 ? Math.min(100, Math.round((stage.actualQty / stage.plannedQty) * 100)) : 0;
            return (
              <div key={stage.id} className="p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{stage.stage}</span>
                    <span className={`status-chip text-xs ${getStatusColor(stage.status)}`}>{stage.status}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{pct}% complete</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${pct > 80 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Planned</p>
                    <p className="font-semibold">{stage.plannedQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual</p>
                    <p className="font-semibold text-blue-600">{stage.actualQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                    <p className="font-semibold text-red-600">{stage.rejectionQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-semibold text-amber-600">{stage.balanceQty}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── LOGISTICS TAB ────────────────────────────────────────────────────────────

function LogisticsTab({ order, role }: { order: any; role: UserRole }) {
  const shipments = order.shipments ?? [];
  const canEdit = ["SUPER_ADMIN", "LOGISTICS_USER"].includes(role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Shipments ({shipments.length})</h3>
        {canEdit && (
          <Link href={`/shipments/new?orderId=${order.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            <Plus size={13} /> New Shipment
          </Link>
        )}
      </div>
      {shipments.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border rounded-lg border-dashed">
          <Truck size={36} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">No shipments created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment: any) => (
            <div key={shipment.id} className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <div>
                  <Link href={`/shipments/${shipment.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                    {shipment.shipmentNumber}
                  </Link>
                  {shipment.trackingNumber && (
                    <p className="text-xs text-muted-foreground mt-0.5">Track: {shipment.trackingNumber}</p>
                  )}
                </div>
                <span className={`status-chip ${getStatusColor(shipment.status)}`}>{shipment.status.replace(/_/g, " ")}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Transporter</p>
                  <p className="font-medium">{shipment.transporter ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispatch Date</p>
                  <p className="font-medium">{formatDate(shipment.dispatchDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">{formatDate(shipment.expectedDeliveryDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cartons</p>
                  <p className="font-medium">{shipment.cartonCount ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INVOICE TAB ──────────────────────────────────────────────────────────────

function InvoiceTab({ order, isFinance, role }: { order: any; isFinance: boolean; role: UserRole }) {
  const invoices = order.invoices ?? [];

  if (!isFinance) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Receipt size={40} className="mx-auto mb-3 opacity-20" />
        <p>Financial information is restricted</p>
        <p className="text-sm mt-1">Only finance team members can view invoice and payment data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Invoices ({invoices.length})</h3>
        {["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT"].includes(role) && (
          <Link href={`/invoices/new?orderId=${order.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            <Plus size={13} /> Generate Invoice
          </Link>
        )}
      </div>
      {invoices.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border rounded-lg border-dashed">
          <p className="text-sm">No invoices generated yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/invoices/${inv.id}`} className="font-semibold text-foreground hover:text-primary">
                    {inv.invoiceNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.invoiceDate)} · Due: {formatDate(inv.dueDate)}</p>
                </div>
                <span className={`status-chip ${getStatusColor(inv.status)}`}>{inv.status.replace(/_/g, " ")}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-foreground">{formatCurrency(Number(inv.totalAmount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-bold text-green-600">{formatCurrency(Number(inv.paidAmount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`font-bold ${Number(inv.balanceAmount) > 0 ? "text-red-600" : "text-foreground"}`}>
                    {formatCurrency(Number(inv.balanceAmount))}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMMENTS TAB ─────────────────────────────────────────────────────────────

function CommentsTab({ order, userId }: { order: any; userId: string }) {
  const comments = order.comments ?? [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments & Activity ({comments.length})</h3>
      {comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
          No comments yet
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{c.author?.name?.charAt(0)}</span>
              </div>
              <div className="flex-1 bg-muted/50 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{c.author?.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                  {!c.isInternal && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Visible to client</span>}
                </div>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form
        action={`/api/orders/${order.id}/comments`}
        method="POST"
        className="flex gap-3 mt-4 pt-4 border-t"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">Y</span>
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            name="content"
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" name="isInternal" defaultChecked className="rounded" />
              Internal only (hidden from client)
            </label>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Comment
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── AUDIT TAB ────────────────────────────────────────────────────────────────

function AuditTab({ order }: { order: any }) {
  const logs = order.activityLogs ?? [];

  return (
    <div className="space-y-2">
      <h3 className="font-semibold mb-4">Audit Trail ({logs.length} events)</h3>
      {logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No audit events recorded</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Time</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium">{log.userEmail ?? "System"}</p>
                    {log.user && <p className="text-[10px] text-muted-foreground">{log.user.role}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="status-chip bg-slate-100 text-slate-700 text-[10px]">{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
