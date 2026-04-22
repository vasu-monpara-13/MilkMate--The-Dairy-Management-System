// D:\milkmate_super_fixed - Copy1\src\App.tsx
import React from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DeliveryTracking from "./pages/DeliveryTracking";
import NotFound from "./pages/NotFound";

import CattleMilkLogs from "@/pages/farmer/CattleMilkLogs";
import FarmerBilling from "@/pages/farmer/FarmerBilling";

import AdminSupportTicketsPage from "@/pages/admin/AdminSupportTicketsPage";

import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";";

const queryClient = new QueryClient();

const NavbarWrapper = () => {
  const location = useLocation();
  const hideNavbar =
    location.pathname.startsWith("/customer") ||
    location.pathname.startsWith("/farmer") ||
    location.pathname.startsWith("/admin");

  if (hideNavbar) return null;
  return <Navbar />;
};

// Redirect logged-in users away from login/signup
const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && role) {
    if (role === "customer") return <Navigate to="/customer" replace />;
    if (role === "farmer") return <Navigate to="/farmer" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// Auto-redirect from home if logged in
const HomeRedirect = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && role) {
    if (role === "customer") return <Navigate to="/customer" replace />;
    if (role === "farmer") return <Navigate to="/farmer" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <AuthProvider>
            <NavbarWrapper />

            <Routes>
              <Route path="/" element={<HomeRedirect />} />

              <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
              
              <Route
                path="/login"
                element={
                  <AuthRedirect>
                    <Login />
                  </AuthRedirect>
                }
              />
              <Route
                path="/signup"
                element={
                  <AuthRedirect>
                    <SignUp />
                  </AuthRedirect>
                }
              />

              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/farmer"
                element={
                  <ProtectedRoute allowedRoles={["farmer"]}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ✅ CUSTOMER: CustomerDashboard already handles nested routes */}
              <Route
                path="/customer/*"
                element={
                  <ProtectedRoute allowedRoles={["customer"]}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRoles={["customer", "farmer", "admin"]}>
                    <DeliveryTracking />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/farmer/billing"
                element={
                  <ProtectedRoute allowedRoles={["farmer"]}>
                    <FarmerBilling />
                  </ProtectedRoute>
                }
              />

              <Route path="/farmer/cattle-milk/:cattleId" element={<CattleMilkLogs />} />
             {/* <Route path="/farmer/cattle-milk" element={<CattleMilkLogs />} /> */}

              <Route path="*" element={<NotFound />} />

              <Route path="support-tickets" element={<AdminSupportTicketsPage />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
