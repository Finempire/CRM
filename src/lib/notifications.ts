import { prisma } from "@/lib/db";
import type { NotificationType, NotificationPriority, UserRole } from "@prisma/client";

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  referenceId?: string;
  referenceType?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

interface BroadcastNotificationParams {
  roles: UserRole[];
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  referenceId?: string;
  referenceType?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        priority: params.priority ?? "MEDIUM",
        actionUrl: params.actionUrl,
      },
    });
  } catch (error) {
    console.error("[Notification] Failed to send notification:", error);
  }
}

export async function broadcastNotification(params: BroadcastNotificationParams) {
  try {
    // Find all active users with matching roles
    const users = await prisma.user.findMany({
      where: {
        role: { in: params.roles },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        priority: params.priority ?? "MEDIUM",
        actionUrl: params.actionUrl,
      })),
    });
  } catch (error) {
    console.error("[Notification] Failed to broadcast notification:", error);
  }
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}
