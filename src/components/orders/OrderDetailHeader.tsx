"use client";

import Link from "next/link";
import { formatDate, formatCurrency, getOrderProgress, getStatusColor, ORDER_STATUS_STEPS } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import {
  ArrowLeft, ExternalLink, Lock, Unlock, MoreHorizontal,
  Calendar, User, Package, Truck, CheckCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailHeaderProps {
  order: any;
  isFinance: boolean;
  role: UserRole;
  userId: string;
}

export function OrderDetailHeader({ order, isFinance, role, userId }: OrderDetailHeaderProps) {
  const progress = getOrderProgress(order.status);
  const currentStepIdx = ORDER_STATUS_STEPS.indexOf(order.status);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Orders
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{order.orderNumber}</span>
      </div>

      {/* Top Summary Strip */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: Order Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{order.orderNumber}</h1>
              <span className={`status-chip ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              <span className={`status-chip ${order.type === "SAMPLE" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                {order.type}
              </span>
              {order.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                  <Lock size={11} /> Locked
                </span>
              )}
            </div>

            {/* Buyer */}
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Package size={14} />
                <Link href={`/buyers/${order.buyer.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {order.buyer.name}
                </Link>
                {order.buyer.country && <span className="text-muted-foreground">· {order.buyer.country}</span>}
              </div>
              {order.shipmentDate && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck size={14} />
                  <span>Ship by <strong className="text-foreground">{formatDate(order.shipmentDate)}</strong></span>
                </div>
              )}
              {order.merchandiser && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User size={14} />
                  <span>Merch: <strong className="text-foreground">{order.merchandiser.name}</strong></span>
                </div>
              )}
              {order.productionManager && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User size={14} />
                  <span>PM: <strong className="text-foreground">{order.productionManager.name}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Finance Block (role-restricted) */}
          {isFinance && order.costing && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(Number(order.costing.totalRevenue))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Margin</p>
                <p className={`text-xl font-bold ${Number(order.costing.marginPercent) > 20 ? "text-green-600" : Number(order.costing.marginPercent) > 10 ? "text-amber-600" : "text-red-600"}`}>
                  {Number(order.costing.marginPercent).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Order Progress</span>
            <span className="text-xs font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="hidden md:flex items-center justify-between mt-2">
            {ORDER_STATUS_STEPS.slice(0, 8).map((step, idx) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  idx < currentStepIdx ? "bg-blue-500" :
                  idx === currentStepIdx ? "bg-indigo-600 ring-2 ring-indigo-200" :
                  "bg-muted-foreground/20"
                )} />
                <span className="text-[9px] text-muted-foreground hidden lg:block">{step.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Created {formatDate(order.createdAt)} by {order.createdBy?.name}</span>
            {order.paymentTerms && <span>Terms: {order.paymentTerms}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span>{order._count.documents} docs</span>
            <span>·</span>
            <span>{order._count.comments} comments</span>
            {order.orderLines.length > 0 && (
              <>
                <span>·</span>
                <span>{order.orderLines.reduce((s: number, l: any) => s + l.quantity, 0).toLocaleString()} pcs total</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
