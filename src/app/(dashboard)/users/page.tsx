import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users as UsersIcon, Search, Shield, Edit2, Trash2 } from "lucide-react";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "User Management" };

interface SearchParams {
  search?: string;
  role?: string;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUserRole = (session.user as any).role as UserRole;
  if (!["SUPER_ADMIN", "ACCOUNTANT_ADMIN"].includes(currentUserRole)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const where = {
    deletedAt: null,
    ...(sp.search && {
      OR: [
        { name: { contains: sp.search } },
        { email: { contains: sp.search } },
      ],
    }),
    ...(sp.role && { role: sp.role as UserRole }),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const totalUsers = await prisma.user.count({ where: { deletedAt: null } });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{totalUsers} active users across the platform</p>
        </div>
        <Link href="/users/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm">
          <Plus size={16} /> New User
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4">
        <form className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            name="role"
            defaultValue={sp.role ?? ""}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-48"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Filter
          </button>
          <Link href="/users" className="px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted">
            Clear
          </Link>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="py-20 text-center">
            <UsersIcon size={48} className="mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="font-semibold text-foreground">No users found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Role & Permissions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`status-chip text-xs ${ROLE_COLORS[user.role]}`}>
                        <Shield size={12} className="mr-0.5" />
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {user.department ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/users/${user.id}/edit`} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 size={15} />
                        </Link>
                        {user.id !== session.user?.id && (
                          <button className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
