import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Beef,
  Milk,
  ShoppingBag,
  Users,
  Truck,
  Receipt,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocation, useNavigate } from "react-router-dom";

const mainMenu = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cattle", label: "Cattle Management", icon: Beef },
  { id: "milkLogs", label: "Milk Logs", icon: Droplets },
  { id: "production", label: "Milk Production", icon: Milk },
  { id: "products", label: "Dairy Products", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "milk_deliveries", label: "Milk Deliveries", icon: Truck },
] as const;

export type FarmerMenuId = (typeof mainMenu)[number]["id"];

interface FarmerSidebarProps {
  activeSection: FarmerMenuId;
  onSectionChange: (section: FarmerMenuId) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function FarmerSidebar({
  activeSection,
  onSectionChange,
  collapsed: collapsedProp,
  onCollapsedChange,
}: FarmerSidebarProps) {
  const [collapsedLocal, setCollapsedLocal] = useState(false);

  const collapsed =
    typeof collapsedProp === "boolean" ? collapsedProp : collapsedLocal;

  const setCollapsed = (next: boolean) => {
    onCollapsedChange?.(next);
    if (typeof collapsedProp !== "boolean") setCollapsedLocal(next);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isBillingRoute = location.pathname.startsWith("/farmer/billing");

  const userName = profile?.full_name || "Farmer";
  const userEmail = profile?.email || "farmer@milkmate.com";
  const userInitial = (userName || "F").charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 280 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden",
        "border-r border-slate-200/70 dark:border-white/10",
        "bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl",
        "shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* LOGO */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/70">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow">
          <Milk className="h-5 w-5" />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-white" />
        </div>

        {!collapsed && (
          <div>
            <p className="font-extrabold text-sm text-foreground">MilkMate</p>
            <p className="text-[10px] text-muted-foreground">Farmer Portal</p>
          </div>
        )}
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {mainMenu.map((item) => {
          const isActive =
            (item.id === "billing" && isBillingRoute) ||
            (item.id !== "billing" && activeSection === item.id);

          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "billing") {
                  navigate("/farmer/billing");
                  return;
                }
                onSectionChange(item.id);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                isActive
                  ? "bg-green-500/15 text-green-600 ring-1 ring-green-500/20"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />

              {!collapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* USER */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/15 text-green-700 font-bold">
            {userInitial}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          )}

          <ThemeToggle />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            {!collapsed && "Home"}
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-500/10 text-red-600 py-2 text-xs font-semibold hover:bg-red-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Logout"}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </motion.aside>
  );
}