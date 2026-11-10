import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/useAuth";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading AquaX...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children || <Outlet />;
};

export default ProtectedRoute;
