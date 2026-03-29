import { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";

// ─── Permission Definitions ────────────────────────────────────────────────────

export type Permission =
  | "view:financial_data"
  | "create:order"
  | "edit:order"
  | "delete:order"
  | "approve:costing"
  | "view:costing"
  | "edit:costing"
  | "manage:tna"
  | "upload:tech_pack"
  | "approve:tech_pack"
  | "manage:bom"
  | "approve:pre_production"
  | "manage:inventory"
  | "create:purchase_order"
  | "approve:purchase_order"
  | "update:production_wip"
  | "approve:production_plan"
  | "manage:shipments"
  | "generate:invoice"
  | "record:payment"
  | "view:reports"
  | "export:reports"
  | "manage:users"
  | "manage:settings"
  | "view:audit_log"
  | "manage:documents"
  | "convert:inquiry"
  | "reopen:order"
  | "view:all_orders"
  | "view:own_orders";

// ─── Role → Permissions Map ────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "view:financial_data",
    "create:order",
    "edit:order",
    "delete:order",
    "approve:costing",
    "view:costing",
    "edit:costing",
    "manage:tna",
    "upload:tech_pack",
    "approve:tech_pack",
    "manage:bom",
    "approve:pre_production",
    "manage:inventory",
    "create:purchase_order",
    "approve:purchase_order",
    "update:production_wip",
    "approve:production_plan",
    "manage:shipments",
    "generate:invoice",
    "record:payment",
    "view:reports",
    "export:reports",
    "manage:users",
    "manage:settings",
    "view:audit_log",
    "manage:documents",
    "convert:inquiry",
    "reopen:order",
    "view:all_orders",
  ],
  ACCOUNTANT_ADMIN: [
    "view:financial_data",
    "create:order",
    "edit:order",
    "approve:costing",
    "view:costing",
    "edit:costing",
    "generate:invoice",
    "record:payment",
    "view:reports",
    "export:reports",
    "manage:users",
    "manage:settings",
    "view:audit_log",
    "manage:documents",
    "convert:inquiry",
    "reopen:order",
    "view:all_orders",
  ],
  ACCOUNTANT: [
    "view:financial_data",
    "create:order",
    "edit:order",
    "view:costing",
    "edit:costing",
    "generate:invoice",
    "record:payment",
    "view:reports",
    "export:reports",
    "manage:documents",
    "convert:inquiry",
    "view:all_orders",
  ],
  ADMIN_OPERATIONS: [
    "create:order",
    "edit:order",
    "manage:tna",
    "upload:tech_pack",
    "manage:bom",
    "view:reports",
    "manage:documents",
    "convert:inquiry",
    "view:all_orders",
  ],
  MERCHANDISER: [
    "manage:tna",
    "upload:tech_pack",
    "manage:bom",
    "manage:documents",
    "view:own_orders",
  ],
  PRODUCTION_MANAGER: [
    "approve:pre_production",
    "update:production_wip",
    "approve:production_plan",
    "manage:documents",
    "view:all_orders",
  ],
  STORE_MANAGER: [
    "manage:inventory",
    "create:purchase_order",
    "manage:documents",
    "view:all_orders",
  ],
  PROCUREMENT_USER: [
    "manage:inventory",
    "create:purchase_order",
    "manage:documents",
    "view:all_orders",
  ],
  LOGISTICS_USER: [
    "manage:shipments",
    "manage:documents",
    "view:all_orders",
  ],
  CLIENT: ["view:own_orders"],
  CEO: [
    "view:financial_data",
    "view:costing",
    "view:reports",
    "export:reports",
    "view:audit_log",
    "view:all_orders",
  ],
};

// ─── Permission Check Functions ───────────────────────────────────────────────

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─── Server-side Auth Guard ────────────────────────────────────────────────────

export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (session.user as any).role as UserRole;
  if (!roles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// ─── Finance-restricted roles ─────────────────────────────────────────────────

export const FINANCE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ACCOUNTANT_ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.CEO,
];

export const isFinanceRole = (role: UserRole) => FINANCE_ROLES.includes(role);

// ─── Role display labels ───────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ACCOUNTANT_ADMIN: "Accountant Admin",
  ACCOUNTANT: "Accountant",
  ADMIN_OPERATIONS: "Admin Operations",
  MERCHANDISER: "Merchandiser",
  PRODUCTION_MANAGER: "Production Manager",
  STORE_MANAGER: "Store Manager",
  PROCUREMENT_USER: "Procurement",
  LOGISTICS_USER: "Logistics",
  CLIENT: "Client",
  CEO: "CEO",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ACCOUNTANT_ADMIN: "bg-purple-100 text-purple-700",
  ACCOUNTANT: "bg-violet-100 text-violet-700",
  ADMIN_OPERATIONS: "bg-blue-100 text-blue-700",
  MERCHANDISER: "bg-teal-100 text-teal-700",
  PRODUCTION_MANAGER: "bg-orange-100 text-orange-700",
  STORE_MANAGER: "bg-yellow-100 text-yellow-700",
  PROCUREMENT_USER: "bg-amber-100 text-amber-700",
  LOGISTICS_USER: "bg-cyan-100 text-cyan-700",
  CLIENT: "bg-green-100 text-green-700",
  CEO: "bg-indigo-100 text-indigo-700",
};
