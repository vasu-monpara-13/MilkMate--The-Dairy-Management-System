// D:\milkmate_super_fixed - Copy1\src\pages\CustomerDashboard.tsx
import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import CustomerSidebar from "@/components/CustomerSidebar";
import { CartProvider } from "@/contexts/CartContext";

import CustomerHome from "@/pages/shop/CustomerHome";
import ProductsPage from "@/pages/shop/ProductsPage";
import CartPage from "@/pages/shop/CartPage";
import CheckoutPage from "@/pages/shop/CheckoutPage";
import OrderSuccessPage from "@/pages/shop/OrderSuccessPage";
import OrdersPage from "@/pages/shop/OrdersPage";
import OrderDetailPage from "@/pages/shop/OrderDetailPage";

import CustomerBillingPage from "@/pages/customer/CustomerBillingPage";
import CustomerPaymentsPage from "@/pages/customer/CustomerPaymentsPage";
import CustomerNotificationsPage from "@/pages/customer/CustomerNotificationsPage";
import CustomerSettingsPage from "@/pages/customer/CustomerSettingsPage";
import CustomerSupportPage from "@/pages/customer/CustomerSupportPage";
import CustomerCancelShiftPage from "@/pages/customer/CustomerCancelShiftPage";
import ModifyPlanPage from "@/pages/customer/ModifyPlanPage";
import CustomerSubscriptionPage from "@/pages/customer/CustomerSubscriptionPage";

import DeliveryTracking from "@/pages/DeliveryTracking";


const EXPANDED_W = 272;
const COLLAPSED_W = 76;

export default function CustomerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const path = location.pathname;

  const activeSection =
    path.includes("/products")
      ? "products"
      : path.includes("/cart")
      ? "cart"
      : path.includes("/checkout")
      ? "cart"
      : path.includes("/orders")
      ? "orders"
      : path.includes("/delivery")
      ? "tracking"
      : path.includes("/cancel-shift")
      ? "cancel-shift"
      : path.includes("/billing")
      ? "billing"
      : path.includes("/payments")
      ? "payments"
      : path.includes("/notifications")
      ? "notifications"
      : path.includes("/settings")
      ? "settings"
      : path.includes("/support")
      ? "help"
      : "dashboard";

  const handleSectionChange = (section: string) => {
    const routes: Record<string, string> = {
      dashboard: "/customer",
      products: "/customer/products",
      cart: "/customer/cart",
      orders: "/customer/orders",
      tracking: "/customer/delivery",
      "cancel-shift": "/customer/cancel-shift",
      billing: "/customer/billing",
      payments: "/customer/payments",
      notifications: "/customer/notifications",
      settings: "/customer/settings",
      help: "/customer/support",
    };

    const to = routes[section];
    if (to) navigate(to);
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.12),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#f6f7ff_42%,#fff7fb_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.14),transparent_28%),linear-gradient(135deg,#081120_0%,#0b1220_45%,#130f1f_100%)]">
        <CustomerSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />

        <main
          className="min-h-screen transition-[margin-left] duration-300"
          style={{ marginLeft: collapsed ? COLLAPSED_W : EXPANDED_W }}
        >
          <div className="w-full px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <Routes>
              <Route index element={<CustomerHome />} />

              <Route path="products" element={<ProductsPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />

              <Route path="order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />

              <Route path="delivery" element={<DeliveryTracking embedded />} />
              <Route path="cancel-shift" element={<CustomerCancelShiftPage />} />

              <Route path="billing" element={<CustomerBillingPage />} />
              <Route path="payments" element={<CustomerPaymentsPage />} />
              <Route path="notifications" element={<CustomerNotificationsPage />} />
              <Route path="settings" element={<CustomerSettingsPage />} />
              <Route path="support" element={<CustomerSupportPage />} />

              <Route path="modify-plan" element={<ModifyPlanPage />} />
              <Route path="subscription" element={<CustomerSubscriptionPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </CartProvider>
  );
}
