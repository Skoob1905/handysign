import type { UserRole } from "../types/domain";
import { StaffPage } from "../pages/StaffPage";
import { AdminClientsPage } from "../pages/admin/clients";
import { AdminPage as LoginsPage } from "../pages/admin/users";
import { UserHomePage as StaffDashboard } from "../pages/staff/dashboard";
import { ProfilePage } from "../pages/ProfilePage";
import { AssignedStaffSection } from "../components/AssignedStaffSection";

const ClientStaffPage = () => (
  <div className="mx-auto max-w-2xl space-y-4">
    <AssignedStaffSection />
  </div>
);

export interface RoleRoute {
  path: string;
  element: React.ComponentType;
  label?: string;
}

export const ROLE_ROUTES: Record<UserRole, RoleRoute[]> = {
  admin: [
    { path: "/staff", element: StaffPage, label: "STAFF" },
    { path: "/clients", element: AdminClientsPage, label: "CLIENTS" },
    { path: "/logins", element: LoginsPage, label: "LOGINS" },
    { path: "/profile", element: ProfilePage, label: "PROFILE" },
  ],
  client: [
    { path: "/assigned", element: ClientStaffPage, label: "STAFF" },
    { path: "/profile", element: ProfilePage, label: "PROFILE" },
  ],
  staff: [
    { path: "/home", element: StaffDashboard, label: "DASHBOARD" },
    { path: "/profile", element: ProfilePage, label: "PROFILE" },
  ],
};
