import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActivityAction, UserRole } from "@prisma/client";

interface LogActivityParams {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  orderId?: string;
  description: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const session = await auth();
    const user = session?.user;

    await prisma.activityLog.create({
      data: {
        userId: user?.id,
        userEmail: user?.email ?? undefined,
        userRole: (user as any)?.role as UserRole | undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        orderId: params.orderId,
        description: params.description,
        oldValues: params.oldValues as any,
        newValues: params.newValues as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("[AuditLog] Failed to log activity:", error);
  }
}

export async function logActivityServer(
  params: LogActivityParams & { userId?: string; userEmail?: string; userRole?: UserRole }
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        orderId: params.orderId,
        description: params.description,
        oldValues: params.oldValues as any,
        newValues: params.newValues as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("[AuditLog] Failed to log activity:", error);
  }
}
