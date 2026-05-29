import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { ROLE_ROUTES } from "../config/routes";
import { LoadingPage } from "../components/LoadingPage";
import type { UserRole } from "../types/domain";

export const getLandingPage = (role?: UserRole): string => {
  if (!role) return "/login";
  const allowed = ROLE_ROUTES[role];
  if (allowed.length > 0) return allowed[0].path;
  return "/login";
};

export const AuthGuard = () => {
  const { firebaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage />;
  if (!firebaseUser)
    return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
};

export const RoleGuard = () => {
  const { appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage />;
  if (!appUser) return <Navigate to="/login" replace />;

  const allowedPaths = ROLE_ROUTES[appUser.role].map((r) => r.path);

  if (!allowedPaths.includes(location.pathname)) {
    return <Navigate to={getLandingPage(appUser.role)} replace />;
  }

  return <Outlet />;
};
