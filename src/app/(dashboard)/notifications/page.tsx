import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-gray-300",
  };

  const notificationsByDate = notifications.reduce<Record<string, typeof notifications>>((acc, n) => {
    const date = new Date(n.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action="/api/notifications/mark-all-read" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition-colors"
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-20 text-center">
          <Bell size={48} className="mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="font-semibold text-foreground">All caught up!</h3>
          <p className="text-muted-foreground text-sm mt-1">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(notificationsByDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {new Date(date).toDateString() === new Date().toDateString() ? "Today" :
                  new Date(date).toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Yesterday" :
                  date}
              </h3>
              <div className="space-y-2">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-4 rounded-xl border transition-colors ${!n.isRead ? "bg-blue-50/50 border-blue-100" : "bg-card"}`}
                  >
                    {/* Priority dot */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[n.priority] ?? "bg-gray-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold ${!n.isRead ? "text-foreground" : "text-foreground/80"}`}>
                            {n.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                          {n.actionUrl && (
                            <a href={n.actionUrl} className="text-xs text-primary hover:underline mt-1 inline-block">
                              View details →
                            </a>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                          {!n.isRead && (
                            <form action={`/api/notifications/${n.id}/read`} method="POST" className="mt-1">
                              <button type="submit" className="text-[10px] text-blue-600 hover:underline">
                                Mark read
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
