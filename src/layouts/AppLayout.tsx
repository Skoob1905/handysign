import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { logoutUser } from "../services/authService";
import { useAuth } from "../context/AuthProvider";
import { Button } from "../components/ui";
import { RoleNav } from "../utils/nav";
import { Footer } from "../components/Footer";
import { config } from "../config";

export const AppLayout = () => {
  const { appUser } = useAuth();
  const role = appUser?.role;

  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.style.display = "none";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] backdrop-blur"
        style={{ backgroundColor: "var(--header-bg)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center sm:grid sm:grid-cols-[1fr_auto_1fr]">
            <a
              href={config.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="justify-self-start"
            >
              <img
                src={config.navbar}
                alt={config.name}
                className="max-h-5 w-auto shrink-0 object-contain sm:max-h-6 md:max-h-7"
              />
            </a>
            <RoleNav role={role} />
            <div className="ml-auto flex items-center gap-2 sm:justify-self-end sm:ml-0">
              <Button
                type="button"
                className="rounded-lg"
                onClick={() => void logoutUser()}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3 sm:py-6">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
