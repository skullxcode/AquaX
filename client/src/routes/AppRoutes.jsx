import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const Villages = lazy(() => import("@/pages/villages/Villages"));
const Schemes = lazy(() => import("@/pages/schemes/Schemes"));
const Assets = lazy(() => import("@/pages/assets/Assets"));
const Inventory = lazy(() => import("@/pages/inventory/Inventory"));
const Suppliers = lazy(() => import("@/pages/inventory/Suppliers"));
const Maintenance = lazy(() => import("@/pages/maintenance/Maintenance"));
const Consumers = lazy(() => import("@/pages/consumers/Consumers"));
const Billing = lazy(() => import("@/pages/billing/Billing"));
const Finance = lazy(() => import("@/pages/finance/Finance"));
const Reports = lazy(() => import("@/pages/reports/Reports"));
const Users = lazy(() => import("@/pages/users/Users"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading AquaX...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="villages" element={<Villages />} />
            <Route path="schemes" element={<Schemes />} />
            <Route path="asset-management" element={<Assets />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="consumers" element={<Consumers />} />
            <Route path="billing" element={<Billing />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<ProtectedRoute allowedRoles={["PANCHAYAT_ADMIN"]}><Users /></ProtectedRoute>} />
          </Route>
        </Route>
        <Route path="/unauthorized" element={<div className="mx-auto max-w-lg p-10 text-center"><h1 className="text-2xl font-bold">Access denied</h1><p className="mt-2 text-sm text-muted-foreground">Your account does not have permission to access this page.</p></div>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
