import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Number formatting ────────────────────────────────────────────────────────

export function formatCurrency(amount: number | string | null | undefined, currency = "INR"): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "—";
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatPercent(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "—";
  const n = typeof num === "string" ? parseFloat(num) : num;
  return `${n.toFixed(2)}%`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return isBefore(new Date(date), new Date());
}

export function isDueSoon(date: Date | string | null | undefined, days = 3): boolean {
  if (!date) return false;
  const target = new Date(date);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return isAfter(threshold, target) && isAfter(target, new Date());
}

// ─── ID Generators ────────────────────────────────────────────────────────────

export function generateOrderNumber(prefix = "ORD"): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${year}${month}${random}`;
}

export function generateInquiryNumber(): string {
  return generateOrderNumber("INQ");
}

export function generatePoNumber(): string {
  return generateOrderNumber("PO");
}

export function generateInvoiceNumber(): string {
  return generateOrderNumber("INV");
}

export function generateGrnNumber(): string {
  return generateOrderNumber("GRN");
}

export function generatePaymentNumber(): string {
  return generateOrderNumber("PAY");
}

export function generateShipmentNumber(): string {
  return generateOrderNumber("SHP");
}

export function generateMrNumber(): string {
  return generateOrderNumber("MR");
}

// ─── Status colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  // Order status
  INQUIRY: "bg-gray-100 text-gray-700",
  REVIEW: "bg-yellow-100 text-yellow-700",
  COSTING: "bg-amber-100 text-amber-700",
  MERCHANDISING: "bg-blue-100 text-blue-700",
  PRE_PRODUCTION: "bg-indigo-100 text-indigo-700",
  PROCUREMENT: "bg-purple-100 text-purple-700",
  PRODUCTION: "bg-orange-100 text-orange-700",
  LOGISTICS: "bg-cyan-100 text-cyan-700",
  DELIVERY: "bg-teal-100 text-teal-700",
  INVOICED: "bg-green-100 text-green-700",
  PAID: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
  // TNA
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DELAYED: "bg-red-100 text-red-700",
  NA: "bg-gray-50 text-gray-400",
  // Approval
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-700",
  // Payment
  PARTIAL: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  // Shipment
  READY_TO_SHIP: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-orange-100 text-orange-700",
  // Material
  ORDERED: "bg-blue-100 text-blue-700",
  PARTIAL_RECEIVED: "bg-yellow-100 text-yellow-700",
  FULLY_RECEIVED: "bg-green-100 text-green-700",
  READY: "bg-emerald-100 text-emerald-700",
  SHORTAGE: "bg-red-100 text-red-700",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
}

// ─── File size formatting ─────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Order status progression ─────────────────────────────────────────────────

export const ORDER_STATUS_STEPS = [
  "INQUIRY",
  "REVIEW",
  "COSTING",
  "MERCHANDISING",
  "PRE_PRODUCTION",
  "PROCUREMENT",
  "PRODUCTION",
  "LOGISTICS",
  "DELIVERY",
  "INVOICED",
  "PAID",
  "CLOSED",
] as const;

export function getOrderProgress(status: string): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status as any);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / ORDER_STATUS_STEPS.length) * 100);
}
