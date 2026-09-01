import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { SecondaryNavbar } from "./SecondaryNavbar";
import { GlobalBanner } from "./GlobalBanner";
import { ProfileDropdown } from "./ProfileDropdown";
import { useAuth } from "../context/AuthProvider";
import { Navbar } from "./Navbar/Navbar";

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { appUser } = useAuth();
  const { pathname } = useLocation();

  const showSecondaryNavbar =
    appUser?.role === "admin" &&
    ["/staff", "/clients"].includes(pathname);

  return (
    <div className="flex min-h-screen flex-col app-bg">
      <GlobalBanner />

      <div className="flex flex-1 min-h-0">
        <Navbar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div
          className="flex flex-1 flex-col"
          style={{ backgroundColor: "var(--header-bg)" }}
        >
          <header
            className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border-b px-4 sm:px-6"
            style={{
              backgroundColor: "var(--header-bg)",
              borderColor: "transparent",
              borderImage: "linear-gradient(90deg, #99f6e4, #93c5fd, #99f6e4) 1",
            }}
          >
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] md:hidden"
              >
                <Menu className="size-5" />
              </button>
            </div>

            <div className="flex items-center justify-center">
              {showSecondaryNavbar && <SecondaryNavbar />}
            </div>

            <div className="flex items-center justify-end">
              <ProfileDropdown />
            </div>
          </header>

          <main
            className="flex flex-1 flex-col px-4 py-3 sm:py-6"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
