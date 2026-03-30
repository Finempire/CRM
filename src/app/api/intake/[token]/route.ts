import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInquiryNumber } from "@/lib/utils";
import { broadcastNotification } from "@/lib/notifications";
import { randomBytes } from "crypto";

function generateClientToken(): string {
  return randomBytes(20).toString("hex"); // 40-char hex token
}

interface InquiryItemInput {
  itemName: string;
  styleDescription?: string;
  quantity?: string;
  fabricNotes?: string;
  trimsNotes?: string;
  printingNotes?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const form = await prisma.intakeForm.findUnique({
      where: { token, isActive: true },
    });

    if (!form) {
      return NextResponse.json({ error: "Invalid or expired form link" }, { status: 404 });
    }

    const formData = await req.formData();

    const buyerName      = formData.get("buyerName") as string;
    const contactNumber  = formData.get("contactNumber") as string;
    const contactEmail   = formData.get("contactEmail") as string;
    const billingAddress = formData.get("billingAddress") as string;
    const shippingAddress = formData.get("shippingAddress") as string;
    const shipmentDate   = formData.get("shipmentDate") as string;
    const otherComments  = formData.get("otherComments") as string;
    const itemsJson      = formData.get("items") as string;

    if (!buyerName) {
      return NextResponse.json({ error: "Buyer name is required" }, { status: 400 });
    }

    // Parse items array
    let items: InquiryItemInput[] = [];
    try {
      items = itemsJson ? JSON.parse(itemsJson) : [];
    } catch {
      return NextResponse.json({ error: "Invalid items data" }, { status: 400 });
    }

    const validItems = items.filter((i) => i.itemName?.trim());
    if (validItems.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Duplicate detection: same buyer + same first item name + close shipment date
    const firstItemName = validItems[0].itemName;
    const existingInquiry = await prisma.inquiry.findFirst({
      where: {
        buyerName: { equals: buyerName, mode: "insensitive" },
        items: { some: { itemName: { contains: firstItemName.substring(0, 20), mode: "insensitive" } } },
        shipmentDate: shipmentDate
          ? {
              gte: new Date(new Date(shipmentDate).getTime() - 7 * 24 * 60 * 60 * 1000),
              lte: new Date(new Date(shipmentDate).getTime() + 7 * 24 * 60 * 60 * 1000),
            }
          : undefined,
        status: { notIn: ["REJECTED"] },
      },
    });

    const inquiryNumber = generateInquiryNumber();

    // Total quantity across all items
    const totalQty = validItems.reduce((s, i) => s + (parseInt(i.quantity ?? "0") || 0), 0);

    // Summary for itemDetails (legacy field, kept for display convenience)
    const itemSummary = validItems.map((i) => i.itemName).join(", ");

    const clientToken = generateClientToken();

    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNumber,
        status: existingInquiry ? "REVIEWING" : "NEW",
        clientToken,
        intakeToken: token,
        intakeSource: "QR_CODE",
        buyerName,
        contactNumber: contactNumber || null,
        contactEmail: contactEmail || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
        quantity: totalQty || null,
        itemDetails: itemSummary,           // kept for backwards compat
        otherComments: otherComments || null,
        duplicateOfId: existingInquiry?.id || null,
        // Create all items in the same transaction
        items: {
          create: validItems.map((i) => ({
            itemName: i.itemName.trim(),
            styleDescription: i.styleDescription?.trim() || null,
            quantity: i.quantity ? parseInt(i.quantity) || null : null,
            fabricNotes: i.fabricNotes?.trim() || null,
            trimsNotes: i.trimsNotes?.trim() || null,
            printingNotes: i.printingNotes?.trim() || null,
          })),
        },
      },
    });

    // Notify internal team
    await broadcastNotification({
      roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"],
      type: "INQUIRY_RECEIVED",
      priority: "HIGH",
      title: `New Inquiry: ${inquiryNumber}`,
      message: `${buyerName} submitted an inquiry — ${validItems.length} item${validItems.length > 1 ? "s" : ""}: ${itemSummary.substring(0, 60)}`,
      referenceId: inquiry.id,
      referenceType: "inquiry",
      actionUrl: `/inquiries/${inquiry.id}`,
    });

    // Return JSON (client handles redirect)
    return NextResponse.json({ inquiryId: inquiry.id, inquiryNumber, clientToken });
  } catch (error) {
    console.error("[Intake] Error:", error);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
