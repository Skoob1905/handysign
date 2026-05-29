import { useAuth } from "../context/AuthProvider";
import { AdminStaffPage } from "./admin/staff";

const ClientStaffPage = () => (
  <div className="text-sm text-[var(--muted-foreground)]">Staff — coming soon.</div>
);

export const StaffPage = () => {
  const { appUser } = useAuth();
  if (appUser?.role === "admin") return <AdminStaffPage />;
  return <ClientStaffPage />;
};
