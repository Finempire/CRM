import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";
import Link from "next/link";
import {
  BarChart3, FileText, Package, Clock, Users, Truck,
  Warehouse, Briefcase, Ship, Receipt, Activity
} from "lucide-react";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  {
    id: "costing",
    title: "Costing Report",
    description: "Full costing breakdown per order with margins and profitability",
    icon: Receipt,
    color: "bg-blue-50 text-blue-700",
    financeOnly: true,
  },
  {
    id: "order-profitability",
    title: "Order Profitability",
    description: "Revenue, cost, and margin analysis by order and buyer",
    icon: BarChart3,
    color: "bg-green-50 text-green-700",
    financeOnly: true,
  },
  {
    id: "production-progress",
    title: "Production Progress",
    description: "Cutting, stitching, finishing, packing progress per order",
    icon: Package,
    color: "bg-orange-50 text-orange-700",
    financeOnly: false,
  },
  {
    id: "tna-delay",
    title: "TNA Delay Report",
    description: "All overdue and at-risk TNA milestones with delay reasons",
    icon: Clock,
    color: "bg-red-50 text-red-700",
    financeOnly: false,
  },
  {
    id: "buyer-order-summary",
    title: "Buyer-wise Order Summary",
    description: "Order counts, values, and status grouped by buyer",
    icon: Users,
    color: "bg-purple-50 text-purple-700",
    financeOnly: false,
  },
  {
    id: "vendor-purchase",
    title: "Vendor Purchase Report",
    description: "All purchase orders by vendor with amounts and delivery status",
    icon: Briefcase,
    color: "bg-amber-50 text-amber-700",
    financeOnly: false,
  },
  {
    id: "material-consumption",
    title: "Material Consumption",
    description: "Material issued vs received vs wastage per order",
    icon: Warehouse,
    color: "bg-teal-50 text-teal-700",
    financeOnly: false,
  },
  {
    id: "job-work",
    title: "Job Work Report",
    description: "All job work requirements, vendors, rates, and status",
    icon: Briefcase,
    color: "bg-indigo-50 text-indigo-700",
    financeOnly: false,
  },
  {
    id: "shipment-performance",
    title: "Shipment Performance",
    description: "On-time vs delayed shipments with courier performance",
    icon: Truck,
    color: "bg-cyan-50 text-cyan-700",
    financeOnly: false,
  },
  {
    id: "invoice-payment-aging",
    title: "Invoice & Payment Aging",
    description: "Outstanding invoices grouped by aging bucket",
    icon: FileText,
    color: "bg-pink-50 text-pink-700",
    financeOnly: true,
  },
  {
    id: "user-activity-audit",
    title: "User Activity Audit",
    description: "All create, update, delete, approve actions by user",
    icon: Activity,
    color: "bg-slate-50 text-slate-700",
    financeOnly: false,
  },
];

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as UserRole;
  const canViewFinancial = hasPermission(role, "view:financial_data");

  const visibleReports = REPORTS.filter((r) => !r.financeOnly || canViewFinancial);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports Center</h1>
          <p className="text-muted-foreground text-sm mt-1">{visibleReports.length} reports available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReports.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="group bg-card border rounded-xl p-6 hover:shadow-md transition-all hover:border-primary/20"
            >
              <div className={`p-3 rounded-xl ${report.color} w-fit mb-4`}>
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                {report.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1 hover:text-primary transition-colors">
                  View Report →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
