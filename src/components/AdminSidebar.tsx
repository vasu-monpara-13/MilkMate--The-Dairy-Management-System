import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserCog,
  MapPinned,
  Activity,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Milk,
  Sparkles,
  ShieldCheck,
  MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const adminMenu = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, sub: "Overview & insights" },
  { id: "farmers", label: "Manage Farmers", icon: UserCog, sub: "Profiles & management" },
  { id: "customers", label: "Manage Customers", icon: Users, sub: "Accounts & support" },
  { id: "areas", label: "Area & Delivery", icon: MapPinned, sub: "Regions & deliveries" },
  { id: "monitoring", label: "System Monitoring", icon: Activity, sub: "System health" },
  { id: "billing", label: "Billing Overview", icon: Receipt, sub: "Revenue & dues" },
  { id: "support-tickets", label: "Support Tickets", icon: MessageSquareText, sub: "Customer issues" },
] as const;

export type AdminMenuId = (typeof adminMenu)[number]["id"];

interface AdminSidebarProps {
  activeSection: AdminMenuId;
  onSectionChange: (section: AdminMenuId) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  activeSection,
  onSectionChange,
  collapsed: collapsedProp,
  onCollapsedChange,
}: AdminSidebarProps) {
  const [collapsedLocal, setCollapsedLocal] = useState(false);
  const [supportUnread, setSupportUnread] = useState(false);

  const collapsed =
    typeof collapsedProp === "boolean" ? collapsedProp : collapsedLocal;

  const setCollapsed = (next: boolean) => {
    onCollapsedChange?.(next);
    if (typeof collapsedProp !== "boolean") setCollapsedLocal(next);
  };

  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const userName = profile?.full_name || "Admin";
  const userEmail = profile?.email || "admin@milkmate.com";
  const userInitial = (userName?.charAt(0) || "A").toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    const fetchSupportUnread = async () => {
      try {
        const { data: tickets, error: ticketsError } = await (supabase as any)
          .from("support_tickets")
.select("id, admin_last_seen_at, status")
.in("status", ["open", "in_progress"]);

        if (ticketsError || !tickets?.length) {
          setSupportUnread(false);
          return;
        }

        const ticketIds = tickets.map((t: any) => t.id);

        const { data: latestMessages, error: msgError } = await (supabase as any)
          .from("support_ticket_messages")
          .select("ticket_id, sender_role, created_at")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: false });

        if (msgError || !latestMessages?.length) {
          setSupportUnread(false);
          return;
        }

        const latestByTicket = new Map<string, any>();
        for (const msg of latestMessages) {
          if (!latestByTicket.has(msg.ticket_id)) {
            latestByTicket.set(msg.ticket_id, msg);
          }
        }

        let hasUnread = false;

        for (const ticket of tickets) {
  const ticketStatus = String(ticket.status || "").toLowerCase();
  if (!["open", "in_progress"].includes(ticketStatus)) continue;

  const latest = latestByTicket.get(ticket.id);
  if (!latest) continue;

  const senderRole = String(latest.sender_role || "").toLowerCase();
  const latestAt = latest.created_at ? new Date(latest.created_at).getTime() : 0;
  const seenAt = ticket.admin_last_seen_at
    ? new Date(ticket.admin_last_seen_at).getTime()
    : 0;

  if (senderRole === "customer" && latestAt > seenAt) {
    hasUnread = true;
    break;
  }
}

        setSupportUnread(hasUnread);
      } catch {
        setSupportUnread(false);
      }
    };

    fetchSupportUnread();

    const channel = (supabase as any)
      .channel("admin-support-notification-dot")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_ticket_messages",
        },
        () => {
          fetchSupportUnread();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchSupportUnread();
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        //
      }
    };
  }, []);

  return (
    <motion.aside
      animate={{ width: collapsed ? 78 : 292 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-[9999] flex flex-col overflow-hidden",
        "border-r border-slate-200/70 dark:border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.68))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.72))]",
        "backdrop-blur-2xl shadow-[0_18px_60px_rgba(59,130,246,0.12)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_45%)] pointer-events-none" />

      <div className="relative shrink-0 border-b border-slate-200/70 dark:border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-500 text-white shadow-[0_10px_28px_rgba(59,130,246,0.28)]">
            <Milk className="h-5 w-5" />
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm dark:bg-white/15 dark:text-white">
              <Sparkles className="h-2.5 w-2.5" />
            </div>
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <p className="text-[15px] font-extrabold leading-none text-slate-900 dark:text-white">
                  MilkMate
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-white/55">
                  Admin Control Center
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="mt-4 rounded-2xl border border-slate-200/80 bg-white/65 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-white/75">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure admin workspace
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {adminMenu.map((item, index) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.16, delay: index * 0.03 }}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-500/14 via-indigo-500/10 to-violet-500/10 text-slate-900 ring-1 ring-blue-200/60 shadow-[0_10px_24px_rgba(59,130,246,0.12)] dark:text-white dark:ring-white/10 dark:from-blue-500/20 dark:via-blue-400/10 dark:to-emerald-400/10"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/[0.05] dark:hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-active-pill"
                  className="absolute inset-y-2 left-1 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 dark:from-blue-400 dark:to-emerald-400"
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-white/85 text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                    : "bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-slate-900 dark:bg-white/[0.04] dark:text-white/65 dark:group-hover:bg-white/[0.08] dark:group-hover:text-white"
                )}
              >
                <Icon className="h-[17px] w-[17px]" />
                {item.id === "support-tickets" && supportUnread && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                )}
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.16 }}
                    className="relative z-10 min-w-0 flex-1 overflow-hidden"
                  >
                    <div className="truncate text-[13px] font-semibold">
                      {item.label}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-white/45">
                      {item.sub}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      <div className="relative shrink-0 border-t border-slate-200/70 dark:border-white/10 p-3 space-y-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 py-2.5 text-[12px] font-medium text-slate-600 transition-all hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>

        <div className="rounded-[22px] border border-slate-200/80 bg-white/72 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_10px_28px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-extrabold text-slate-800 ring-1 ring-slate-200/70 dark:text-white dark:ring-white/10">
              {userInitial}
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.16 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                    {userName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-white/55">
                    {userEmail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!collapsed && (
              <ThemeToggle className="shrink-0 border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]" />
            )}
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
                className="mt-3"
              >
                <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Admin Account
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={cn("grid gap-2", collapsed ? "grid-cols-1" : "grid-cols-2")}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 py-2.5 text-[12px] font-semibold text-slate-700 transition-all hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <Home className="h-4 w-4" />
            {!collapsed && <span>Home</span>}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50 py-2.5 text-[12px] font-semibold text-red-600 transition-all hover:bg-red-100 hover:text-red-700 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300 dark:hover:bg-red-500/[0.12] dark:hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}