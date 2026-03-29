import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

// Role → dashboard path mapping
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  SUPER_ADMIN: "/dashboard/management",
  ACCOUNTANT_ADMIN: "/dashboard/accountant",
  ACCOUNTANT: "/dashboard/accountant",
  ADMIN_OPERATIONS: "/dashboard/operations",
  MERCHANDISER: "/dashboard/merchandiser",
  PRODUCTION_MANAGER: "/dashboard/production",
  STORE_MANAGER: "/dashboard/store",
  PROCUREMENT_USER: "/dashboard/store",
  LOGISTICS_USER: "/dashboard/logistics",
  CLIENT: "/dashboard/client",
  CEO: "/dashboard/management",
};

export default async function DashboardRootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const role = (session.user as any).role as UserRole;
  redirect(ROLE_DASHBOARDS[role] ?? "/dashboard/operations");
}
