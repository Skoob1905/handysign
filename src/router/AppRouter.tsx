import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import type { UserRole } from "../types/domain";

import { AuthGuard, RoleGuard, getLandingPage } from "./guards";
import { ROLE_ROUTES } from "../config/routes";
import { AppLayout } from "../layouts/AppLayout";
import { LoadingPage } from "../components/LoadingPage";
import { LoginPage } from "../pages/LoginPage";

const LoginRedirect = () => {
  const { firebaseUser, appUser, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (firebaseUser && appUser)
    return <Navigate to={getLandingPage(appUser.role)} replace />;
  return <LoginPage />;
};

const RootRedirect = () => {
  const { appUser } = useAuth();
  return <Navigate to={getLandingPage(appUser?.role)} replace />;
};

export const AppRouter = () => {
  const roles = Object.keys(ROLE_ROUTES) as UserRole[];

  const allRoutes = roles.flatMap((role) =>
    ROLE_ROUTES[role].map(({ path, element: Component }) => (
      <Route key={`${role}-${path}`} path={path} element={<Component />} />
    )),
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard />}>
            {allRoutes}
            <Route path="/" element={<RootRedirect />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
