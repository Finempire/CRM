"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

// Save Costing Action
export async function saveCosting(orderId: string, formData: any, lineItems: any[]) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const totalCost = Number(formData.fabricCost || 0) +
      Number(formData.trimmingsCost || 0) +
      Number(formData.accessoriesCost || 0) +
      Number(formData.packagingCost || 0) +
      Number(formData.cuttingCost || 0) +
      Number(formData.stitchingCost || 0) +
      Number(formData.finishingCost || 0) +
      Number(formData.printingCost || 0) +
      Number(formData.embroideryCost || 0) +
      Number(formData.washingCost || 0) +
      Number(formData.otherJobWorkCost || 0) +
      Number(formData.overheadCost || 0) +
      Number(formData.shippingCost || 0);

    const sellingRate = Number(formData.sellingRate || 0);
    // Assuming 1 quantity or per piece margin tracking for now based on forms
    // Best practice is Costing totalRevenue = sellingRate * order.quantity
    
    // Let's get the order quantity first
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderLines: true }
    });
    
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const totalOrderQty = order.orderLines.reduce((acc, line) => acc + line.quantity, 0);
    // If quantity is 0, margin is per piece
    const revenue = sellingRate * (totalOrderQty > 0 ? totalOrderQty : 1);
    // Note: totalCost might be entered as total cost for the whole order, or per piece.
    // Assuming entered values are TOTAL values for the order.
    
    const grossMargin = revenue - totalCost;
    const marginPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

    await prisma.$transaction(async (tx) => {
      // Upsert Costing
      const costing = await tx.costing.upsert({
        where: { orderId },
        update: {
          fabricCost: Number(formData.fabricCost || 0),
          trimmingsCost: Number(formData.trimmingsCost || 0),
          accessoriesCost: Number(formData.accessoriesCost || 0),
          packagingCost: Number(formData.packagingCost || 0),
          cuttingCost: Number(formData.cuttingCost || 0),
          stitchingCost: Number(formData.stitchingCost || 0),
          finishingCost: Number(formData.finishingCost || 0),
          printingCost: Number(formData.printingCost || 0),
          embroideryCost: Number(formData.embroideryCost || 0),
          washingCost: Number(formData.washingCost || 0),
          otherJobWorkCost: Number(formData.otherJobWorkCost || 0),
          overheadCost: Number(formData.overheadCost || 0),
          shippingCost: Number(formData.shippingCost || 0),
          totalCost,
          sellingRate,
          totalRevenue: revenue,
          grossMargin,
          marginPercent,
          notes: formData.notes,
        },
        create: {
          orderId,
          fabricCost: Number(formData.fabricCost || 0),
          trimmingsCost: Number(formData.trimmingsCost || 0),
          accessoriesCost: Number(formData.accessoriesCost || 0),
          packagingCost: Number(formData.packagingCost || 0),
          cuttingCost: Number(formData.cuttingCost || 0),
          stitchingCost: Number(formData.stitchingCost || 0),
          finishingCost: Number(formData.finishingCost || 0),
          printingCost: Number(formData.printingCost || 0),
          embroideryCost: Number(formData.embroideryCost || 0),
          washingCost: Number(formData.washingCost || 0),
          otherJobWorkCost: Number(formData.otherJobWorkCost || 0),
          overheadCost: Number(formData.overheadCost || 0),
          shippingCost: Number(formData.shippingCost || 0),
          totalCost,
          sellingRate,
          totalRevenue: revenue,
          grossMargin,
          marginPercent,
          notes: formData.notes,
        }
      });

      // Clear old line items
      await tx.costingLine.deleteMany({ where: { costingId: costing.id } });

      // Create new line items
      if (lineItems && lineItems.length > 0) {
        await tx.costingLine.createMany({
          data: lineItems.map((item: any) => ({
            costingId: costing.id,
            category: item.category,
            description: item.description,
            quantity: Number(item.quantity || 0),
            unit: item.unit || "PCS",
            rate: Number(item.rate || 0),
            amount: Number(item.quantity || 0) * Number(item.rate || 0),
            notes: item.notes,
          }))
        });
      }

      // Update Order status if it was in REVIEW or INQUIRY
      if (order.status === "INQUIRY" || order.status === "REVIEW") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "COSTING" }
        });
      }

      // Log Activity
      await tx.activityLog.create({
        data: {
          orderId,
          userId: session.user!.id,
          action: "UPDATED",
          entityType: "COSTING",
          entityId: costing.id,
          description: "Updated costing sheet",
        }
      });
    });

    revalidatePath("/dashboard/costing");
    revalidatePath(`/dashboard/costing/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Costing Save Error:", error);
    return { success: false, error: error.message || "Failed to save costing" };
  }
}

// Approve Costing
export async function approveCosting(costingId: string, orderId: string, status: ApprovalStatus, notes?: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate allowed roles (Super Admin, CEO, Accountant Admin)
  const allowedRoles = ["SUPER_ADMIN", "CEO", "ACCOUNTANT_ADMIN"];
  if (!allowedRoles.includes((session.user as any).role)) {
    return { success: false, error: "You do not have permission to approve costings." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.costing.update({
        where: { id: costingId },
        data: {
          approvalStatus: status,
      approvedById: (session.user as any).id,
          approvedAt: new Date(),
          notes: notes ? notes : undefined
        }
      });

      // Log Activity
      await tx.activityLog.create({
        data: {
          orderId,
          userId: session.user!.id,
          action: status === "APPROVED" ? "APPROVED" : "REJECTED",
          entityType: "COSTING",
          entityId: costingId,
          description: `Costing marked as ${status}`,
        }
      });
    });

    revalidatePath("/dashboard/costing");
    revalidatePath(`/dashboard/costing/${orderId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to approve costing" };
  }
}
