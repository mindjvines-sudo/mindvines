import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { adminNavigation } from "@/config/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { listRecentAuditLogs } from "@/services/audit.service";
import { countNewEnquiries } from "@/services/enquiry.service";
import { logout } from "../actions";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const canReadEnquiries = can(user.role, "read", "enquiries");
  const [recentLogs, newEnquiries] = await Promise.all([
    listRecentAuditLogs(10),
    canReadEnquiries ? countNewEnquiries() : Promise.resolve(0),
  ]);
  const visibleNav = adminNavigation.filter((item) => can(user.role, "read", item.resource));

  const recentActivity = recentLogs.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    entity: log.entity,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <AdminShell
      user={user}
      visibleNav={visibleNav}
      logoutAction={logout}
      recentActivity={recentActivity}
      badges={{ "/admin/enquiries": newEnquiries }}
      canEditSettings={can(user.role, "update", "settings")}
    >
      {children}
    </AdminShell>
  );
}
