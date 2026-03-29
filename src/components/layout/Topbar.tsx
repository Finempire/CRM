"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import { Bell, Search, X, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";

interface TopbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

export function Topbar({ user }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch notifications on mount
    fetch("/api/notifications?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 gap-4 flex-shrink-0">
      {/* Left: Breadcrumb / title */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-medium text-muted-foreground hidden sm:block">
          {process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Manufacture Lab"}
        </h1>
      </div>

      {/* Center: Global search */}
      <div className="flex-1 max-w-md">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm transition-colors"
        >
          <Search size={15} />
          <span>Search orders, buyers, styles...</span>
          <kbd className="ml-auto text-[10px] bg-background border px-1.5 py-0.5 rounded text-muted-foreground">⌘K</kbd>
        </button>

        {/* Global search modal */}
        {searchOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-xl bg-card border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Search size={18} className="text-muted-foreground" />
                <input
                  id="global-search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders, buyers, invoices, styles..."
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-4">
                {searchQuery.length < 2 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Links</p>
                    {[
                      { label: "All Orders", href: "/orders" },
                      { label: "New Inquiry", href: "/inquiries/new" },
                      { label: "Production Board", href: "/production" },
                      { label: "Today's Shipments", href: "/shipments?filter=today" },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Searching for &quot;{searchQuery}&quot;...
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-background border px-1 rounded">↵</kbd> to select</span>
                <span className="flex items-center gap-1"><kbd className="bg-background border px-1 rounded">Esc</kbd> to close</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700">
                      Mark all read
                    </button>
                  )}
                  <Link href="/notifications" onClick={() => setShowNotifications(false)} className="text-xs text-muted-foreground hover:text-foreground">
                    View all
                  </Link>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn("px-4 py-3 hover:bg-muted/50 transition-colors", !n.isRead && "bg-blue-50/50")}
                    >
                      {!n.isRead && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mb-0.5" />}
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user.name.charAt(0)}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-56 bg-card border rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block", ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <Link href="/settings/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setShowProfile(false)}>
                My Profile
              </Link>
              <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setShowProfile(false)}>
                Settings
              </Link>
              <div className="border-t my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
