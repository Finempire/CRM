"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, ROLE_COLORS, ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard, FileText, Package, Calculator, Calendar,
  Layers, Scissors, ListChecks, ShoppingCart, Warehouse,
  Factory, Truck, Receipt, CreditCard, FolderOpen,
  Bell, BarChart3, Users, Settings, ChevronRight,
  ChevronLeft, LogOut, Building2, Search, Inbox
} from "lucide-react";
import { signOut } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiredPermission?: string;
  roles?: UserRole[];
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inquiries", href: "/inquiries", icon: Inbox },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Costing", href: "/costing", icon: Calculator, roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "CEO"] as UserRole[] },
  { label: "TNA Calendar", href: "/tna", icon: Calendar },
  { label: "Tech Pack", href: "/tech-pack", icon: Layers },
  { label: "Patterns", href: "/patterns", icon: Scissors },
  { label: "BOM", href: "/bom", icon: ListChecks },
  { label: "Material Requests", href: "/material-requests", icon: FileText },
  { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Warehouse },
  { label: "Production", href: "/production", icon: Factory },
  { label: "Shipments", href: "/shipments", icon: Truck },
  { label: "Invoices", href: "/invoices", icon: Receipt, roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "CEO"] as UserRole[] },
  { label: "Payments", href: "/payments", icon: CreditCard, roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "CEO"] as UserRole[] },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN"] as UserRole[] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN"] as UserRole[] },
];

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const isVisible = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-bold text-sidebar-foreground text-sm tracking-tight">GarmentOS</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto">
            <Building2 size={18} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Search hint */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground/50 text-xs hover:text-sidebar-foreground transition-colors">
            <Search size={12} />
            <span>Quick search...</span>
            <kbd className="ml-auto text-[10px] bg-sidebar-border px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.filter(isVisible).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "nav-item",
                active && "active",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
        {BOTTOM_NAV.filter(isVisible).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "nav-item",
                active && "active",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-xs font-semibold truncate">{user.name}</p>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 text-sidebar-foreground/40 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
