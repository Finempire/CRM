import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInquiryNumber } from "@/lib/utils";
import { broadcastNotification } from "@/lib/notifications";

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

    const buyerName = formData.get("buyerName") as string;
    const contactNumber = formData.get("contactNumber") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const billingAddress = formData.get("billingAddress") as string;
    const shippingAddress = formData.get("shippingAddress") as string;
    const shipmentDate = formData.get("shipmentDate") as string;
    const quantity = formData.get("quantity") as string;
    const itemDetails = formData.get("itemDetails") as string;
    const fabricNotes = formData.get("fabricNotes") as string;
    const trimsNotes = formData.get("trimsNotes") as string;
    const printingNotes = formData.get("printingNotes") as string;
    const otherComments = formData.get("otherComments") as string;

    if (!buyerName || !itemDetails) {
      return NextResponse.json({ error: "Buyer name and item details are required" }, { status: 400 });
    }

    // Duplicate detection: same buyer + similar item + close shipment date
    const existingInquiry = await prisma.inquiry.findFirst({
      where: {
        buyerName: { equals: buyerName, mode: "insensitive" },
        itemDetails: { contains: itemDetails.substring(0, 20), mode: "insensitive" },
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

    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNumber,
        status: existingInquiry ? "REVIEWING" : "NEW", // Flag potential duplicate for review
        intakeToken: token,
        intakeSource: "QR_CODE",
        buyerName,
        contactNumber: contactNumber || null,
        contactEmail: contactEmail || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
        quantity: quantity ? parseInt(quantity) : null,
        itemDetails: itemDetails || null,
        fabricNotes: fabricNotes || null,
        trimsNotes: trimsNotes || null,
        printingNotes: printingNotes || null,
        otherComments: otherComments || null,
        duplicateOfId: existingInquiry?.id || null,
      },
    });

    // Notify internal team
    await broadcastNotification({
      roles: ["SUPER_ADMIN", "ACCOUNTANT_ADMIN", "ACCOUNTANT", "ADMIN_OPERATIONS"],
      type: "INQUIRY_RECEIVED",
      priority: "HIGH",
      title: `New Inquiry: ${inquiryNumber}`,
      message: `${buyerName} submitted an inquiry for ${itemDetails.substring(0, 50)}`,
      referenceId: inquiry.id,
      referenceType: "inquiry",
      actionUrl: `/inquiries/${inquiry.id}`,
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/intake/${token}/success?id=${inquiry.id}`, req.url)
    );
  } catch (error) {
    console.error("[Intake] Error:", error);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
