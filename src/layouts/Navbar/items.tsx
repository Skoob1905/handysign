import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { useData } from "../../context/DataProvider";
import {
  Building2,
  Users,
  Upload,
  Receipt,
  Clock,
  UserCog,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

type BadgeKey = "staff" | "invoices" | "timesheets";

const ADMIN_BADGE_MAP: Record<string, BadgeKey> = {
  TIMESHEETS: "timesheets",
};

const CLIENT_BADGE_MAP: Record<string, BadgeKey> = {
  INVOICES: "invoices",
};

interface RouteDef {
  label: string;
  to: string;
  icon: LucideIcon;
}

const ADMIN_ROUTES: RouteDef[] = [
  { label: "STAFF", to: "/staff", icon: Users },
  { label: "CLIENTS", to: "/clients", icon: Building2 },
  { label: "UPLOAD", to: "/upload", icon: Upload },
  { label: "INVOICES", to: "/invoices", icon: Receipt },
  { label: "TIMESHEETS", to: "/timesheets", icon: Clock },
  { label: "USERS", to: "/admin", icon: UserCog },
];

const CLIENT_ROUTES: RouteDef[] = [
  { label: "STAFF", to: "/staff", icon: Users },
  { label: "INVOICES", to: "/invoices", icon: Receipt },
  { label: "SUPPORT", to: "/support", icon: HelpCircle },
];

function NavItem({
  label,
  to,
  icon: Icon,
  count,
  className,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
  count: number;
  className: (props: { isActive: boolean }) => string;
}) {
  return (
    <NavLink to={to} className={className} end>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-yellow-300 bg-yellow-100 px-1 text-[10px] font-bold text-yellow-700">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export function NavbarItems({
  className,
}: {
  className: (props: { isActive: boolean }) => string;
}) {
  const { appUser } = useAuth();
  const { counts } = useData();
  const isAdmin = appUser?.role === "admin";

  const routes = isAdmin ? ADMIN_ROUTES : CLIENT_ROUTES;
  const badgeMap = isAdmin ? ADMIN_BADGE_MAP : CLIENT_BADGE_MAP;

  return routes.map((route) => (
    <NavItem
      key={route.to}
      label={route.label}
      to={route.to}
      icon={route.icon}
      count={badgeMap[route.label] != null ? counts[badgeMap[route.label]] : 0}
      className={className}
    />
  ));
}
