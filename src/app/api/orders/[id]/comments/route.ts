import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivityServer } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, isInternal = true, parentId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        orderId,
        authorId: session.user.id,
        content: content.trim(),
        isInternal,
        parentId: parentId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logActivityServer({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userRole: (session.user as any).role as UserRole,
      action: "CREATED",
      entityType: "comment",
      entityId: comment.id,
      orderId,
      description: `Added a comment on order`,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;

    const comments = await prisma.comment.findMany({
      where: { orderId, parentId: null },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
