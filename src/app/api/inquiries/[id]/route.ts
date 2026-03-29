import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivityServer } from "@/lib/audit";
import type { InquiryStatus, UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ACCOUNTANT_ADMIN",
  "ACCOUNTANT",
  "ADMIN_OPERATIONS",
  "MERCHANDISER",
  "CEO",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        status: status as InquiryStatus,
        ...(rejectionReason && { rejectionReason }),
      },
    });

    await logActivityServer({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userRole: role,
      action: status === "REJECTED" ? "REJECTED" : "STATUS_CHANGED",
      entityType: "inquiry",
      entityId: id,
      description: `Inquiry ${status === "REJECTED" ? "rejected" : `status changed to ${status}`}`,
      oldValues: { status: inquiry.status },
      newValues: { status },
    });

    return NextResponse.json({ inquiry: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}
