import { NavLink } from "react-router-dom";
import { ROLE_ROUTES } from "../config/routes";
import type { UserRole } from "../types/domain";

export interface NavItem {
  path: string;
  label: string;
}

export function getNavItems(role: string): NavItem[] {
  const routes = ROLE_ROUTES[role as UserRole];
  if (!routes) return [];
  return routes
    .filter((r) => r.label)
    .map(({ path, label }) => ({ path, label: label! }));
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[var(--primary)] text-white"
      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
  }`;

export const RoleNav = ({ role }: { role: string }) => {
  const items = getNavItems(role);
  if (items.length === 0) return null;

  return (
    <nav className="flex gap-2 rounded-2xl bg-white p-2">
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} className={tabClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
