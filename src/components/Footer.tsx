declare const __APP_VERSION__: string;

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { config } from "../config";
import { getNavItems } from "../utils/nav";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-xs transition hover:text-[var(--primary)] ${
    isActive
      ? "text-[var(--primary)] font-semibold"
      : "text-[var(--muted-foreground)]"
  }`;

export const Footer = () => {
  const { appUser } = useAuth();
  const navItems = getNavItems(appUser?.role ?? "");

  return (
    <footer
      className="border-t border-[var(--border)] py-3"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <a
              href={config.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--primary)]"
            >
              {config.name}
            </a>
            <span>v{__APP_VERSION__}</span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-3 max-w-6xl border-t border-[var(--border)] px-4 pt-3 text-center text-[11px] text-[var(--muted-foreground)]">
        Designed &amp; Created by Ruby Digital Services
      </div>
    </footer>
  );
};
