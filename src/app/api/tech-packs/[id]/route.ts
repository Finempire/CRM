import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const techPack = await prisma.techPack.findUnique({
    where: { id },
    include: {
      order: { include: { buyer: true } },
      style: true,
      files: true,
    },
  });

  if (!techPack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ techPack });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  const { id } = await params;
  const body = await request.json();

  const techPack = await prisma.techPack.findUnique({ where: { id } });
  if (!techPack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, version, buyerComments, fitComments, notes, approvalStatus } = body;

  // Only finance/admin can approve
  if (approvalStatus && !hasPermission(role, "approve:tech_pack")) {
    return NextResponse.json({ error: "Not authorised to approve tech packs" }, { status: 403 });
  }

  const updated = await prisma.techPack.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(version !== undefined && { version }),
      ...(buyerComments !== undefined && { buyerComments }),
      ...(fitComments !== undefined && { fitComments }),
      ...(notes !== undefined && { notes }),
      ...(approvalStatus !== undefined && {
        approvalStatus,
        ...(approvalStatus === "APPROVED" && { approvedById: session.user.id, approvedAt: new Date() }),
      }),
    },
  });

  await logActivityServer({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole: role,
    action: approvalStatus ? "APPROVED" : "UPDATED",
    entityType: "tech_pack",
    entityId: id,
    orderId: techPack.orderId,
    description: approvalStatus ? `Tech pack ${approvalStatus.toLowerCase()}` : `Tech pack "${techPack.title}" updated`,
  });

  return NextResponse.json({ techPack: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!hasPermission(role, "upload:tech_pack")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const techPack = await prisma.techPack.findUnique({ where: { id } });
  if (!techPack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.techPack.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
