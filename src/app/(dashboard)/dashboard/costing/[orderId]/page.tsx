import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { CostingForm } from "@/components/costing/CostingForm";
import { Calculator, ArrowLeft } from "lucide-react";

export const metadata = { title: "Order Costing" };

export default async function OrderCostingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      orderLines: true,
      costing: { include: { lineItems: true } }
    }
  });

  if (!order) redirect("/dashboard/costing");

  const totalQuantity = order.orderLines.reduce((acc, line) => acc + line.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-2">
        <Link href="/dashboard/costing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to Costing
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Calculator className="text-primary" /> Costing Sheet
          </h1>
          <p className="text-muted-foreground mt-1">
            Order <span className="font-semibold text-foreground">{order.orderNumber}</span> • Buyer <span className="font-semibold text-foreground">{order.buyer.name}</span> • Total Quantity: {totalQuantity}
          </p>
        </div>
        
        {order.costing && (
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
            order.costing.approvalStatus === 'APPROVED' ? 'bg-green-100 border-green-200 text-green-700' : 
            order.costing.approvalStatus === 'REJECTED' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-yellow-100 border-yellow-200 text-yellow-700'
          }`}>
            {order.costing.approvalStatus}
          </div>
        )}
      </div>

      <CostingForm orderId={orderId} initialCosting={order.costing} totalQuantity={totalQuantity} userRole={(session.user as any).role} />
    </div>
  );
}
