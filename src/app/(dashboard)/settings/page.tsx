import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "System Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const canEdit = ["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(role);
  if (!canEdit && role !== "CEO") redirect("/dashboard");

  // Load all settings into a key-value map
  const settingRows = await prisma.systemSetting.findMany({ orderBy: { group: "asc" } });
  const settings: Record<string, string> = {};
  settingRows.forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage global platform configurations</p>
        </div>
      </div>

      <SettingsForm settings={settings} canEdit={canEdit} />
    </div>
  );
}
