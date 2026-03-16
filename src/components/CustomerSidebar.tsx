import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  MapPin,
  FileText,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Bell,
  Settings,
  HelpCircle,
  CalendarX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = {
  id: string;
  label: string;
  icon: any;
  badge?: string;
};

const mainMenu: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Dairy Products", icon: ShoppingBag },
  { id: "cart", label: "Cart", icon: ShoppingCart },
  { id: "orders", label: "My Orders", icon: FileText },
  { id: "tracking", label: "Track Delivery", icon: MapPin },
  { id: "cancel-shift", label: "Cancel Shift", icon: CalendarX },
];

const financeMenu: MenuItem[] = [
  { id: "billing", label: "Billing", icon: FileText },
  { id: "payments", label: "Payments", icon: Wallet },
];

const bottomMenu: MenuItem[] = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help & Support", icon: HelpCircle },
];

interface CustomerSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function playNotificationSound(mode: "soft" | "sharp" = "soft") {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = mode === "sharp" ? 880 : 660;

    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
    o.frequency.setValueAtTime(mode === "sharp" ? 880 : 660, now);
    o.frequency.exponentialRampToValueAtTime(mode === "sharp" ? 660 : 520, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    o.start(now);
    o.stop(now + 0.2);

    setTimeout(() => ctx.close?.(), 260);
  } catch {
    //
  }
}

const SidebarSection = ({
  title,
  items,
  activeSection,
  onItemClick,
  collapsed,
  cartCount,
  notifBadge,
  notifPulse,
  supportUnread,
}: {
  title?: string;
  items: MenuItem[];
  activeSection: string;
  onItemClick: (id: string) => void;
  collapsed: boolean;
  cartCount?: number;
  notifBadge?: string;
  notifPulse?: boolean;
  supportUnread?: boolean;
}) => (
  <div className="space-y-1">
    {title && !collapsed && (
      <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>
    )}

    {items.map((item) => {
      const isActive = activeSection === item.id;
      const isNotif = item.id === "notifications";
      const badgeText = isNotif ? notifBadge : item.badge;

      return (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-semibold transition-all duration-200",
            isActive
              ? "bg-gradient-to-r from-sky-500/90 via-indigo-500/90 to-fuchsia-500/90 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
              : "text-slate-700 hover:bg-white/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-white"
          )}
        >
          <div
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 transition-all",
              isActive
                ? "border-white/20 bg-white/15"
                : "border-white/40 bg-white/50 dark:border-white/10 dark:bg-white/[0.04]"
            )}
          >
            <item.icon className="h-[17px] w-[17px]" />

            {item.id === "help" && supportUnread && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
            )}

            {isNotif && notifPulse ? (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            ) : null}
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="flex-1 text-left truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {!collapsed && item.id === "cart" && (cartCount || 0) > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 text-white px-1.5 text-[10px] font-extrabold dark:bg-white dark:text-slate-900">
              {cartCount}
            </span>
          )}

          {!collapsed && badgeText ? (
            <span
              className={cn(
                "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-white",
                notifPulse && isNotif ? "bg-rose-500 animate-pulse" : "bg-rose-500"
              )}
            >
              {badgeText}
            </span>
          ) : null}

          {collapsed && item.id === "cart" && (cartCount || 0) > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 text-white px-1 text-[9px] font-extrabold dark:bg-white dark:text-slate-900">
              {cartCount}
            </span>
          )}

          {collapsed && isNotif && badgeText ? (
            <span
              className={cn(
                "absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold text-white",
                notifPulse ? "bg-rose-500 animate-pulse" : "bg-rose-500"
              )}
            >
              {badgeText}
            </span>
          ) : null}
        </button>
      );
    })}
  </div>
);

export default function CustomerSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: CustomerSidebarProps) {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { itemCount } = useCart();

  const [unread, setUnread] = useState(0);
  const [supportUnread, setSupportUnread] = useState(false);
  const [notifPulse, setNotifPulse] = useState(false);
  const prevUnreadRef = useRef<number>(0);

  const userName = profile?.full_name || "Customer";
  const userEmail = profile?.email || user?.email || "user@milkmate.com";
  const userInitial = (userName || "C").charAt(0).toUpperCase();

  const notifBadge = useMemo(() => {
    if (unread <= 0) return "";
    if (unread > 99) return "99+";
    return String(unread);
  }, [unread]);

  const handleItemClick = (id: string) => onSectionChange(id);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const fetchUnread = async () => {
    if (!user?.id) {
      setUnread(0);
      return;
    }

    const sb: any = supabase;

    const res = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!res.error) {
      const next = Number(res.count ?? 0);
      const prev = prevUnreadRef.current;
      prevUnreadRef.current = next;

      if (next > prev) {
        setNotifPulse(true);
        playNotificationSound("soft");
        window.setTimeout(() => setNotifPulse(false), 2500);
      }

      setUnread(next);
    }
  };

  const fetchSupportUnread = async () => {
    try {
      if (!user?.id) {
        setSupportUnread(false);
        return;
      }

      const { data: tickets, error: ticketsError } = await (supabase as any)
        .from("support_tickets")
        .select("id, customer_last_seen_at, status")
        .eq("user_id", user.id)
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
  const seenAt = ticket.customer_last_seen_at
    ? new Date(ticket.customer_last_seen_at).getTime()
    : 0;

  if (["admin", "support", "ai"].includes(senderRole) && latestAt > seenAt) {
    hasUnread = true;
    break;
  }
}

      setSupportUnread(hasUnread);
    } catch {
      setSupportUnread(false);
    }
  };

  useEffect(() => {
    fetchUnread();

    if (!user?.id) return;

    const ch = (supabase as any)
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(ch);
      } catch {
        //
      }
    };
  }, [user?.id]);

  useEffect(() => {
    fetchSupportUnread();

    if (!user?.id) return;

    const channel = (supabase as any)
      .channel("customer-support-notify")
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
          filter: `user_id=eq.${user.id}`,
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
  }, [user?.id]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 82 : 286 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/30 bg-white/45 backdrop-blur-2xl shadow-[0_18px_50px_rgba(99,102,241,0.10)] dark:border-white/10 dark:bg-slate-950/45"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-8 h-44 w-44 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute top-32 -right-10 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-32 w-32 rounded-full bg-violet-300/20 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-3 px-4 h-20 border-b border-white/30 dark:border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-white font-extrabold shadow-[0_12px_24px_rgba(99,102,241,0.22)]">
          M
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-wide text-slate-900 dark:text-white">
              MilkMate
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Customer Dashboard
            </p>
          </div>
        )}
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-3">
        <SidebarSection
          items={mainMenu}
          activeSection={activeSection}
          onItemClick={handleItemClick}
          collapsed={collapsed}
          cartCount={itemCount}
          notifBadge={notifBadge}
          notifPulse={notifPulse}
          supportUnread={supportUnread}
        />

        <SidebarSection
          title="Finance"
          items={financeMenu}
          activeSection={activeSection}
          onItemClick={handleItemClick}
          collapsed={collapsed}
          notifBadge={notifBadge}
          notifPulse={notifPulse}
          supportUnread={supportUnread}
        />

        <SidebarSection
          title="More"
          items={bottomMenu}
          activeSection={activeSection}
          onItemClick={handleItemClick}
          collapsed={collapsed}
          cartCount={itemCount}
          notifBadge={notifBadge}
          notifPulse={notifPulse}
          supportUnread={supportUnread}
        />
      </nav>

      <div className="relative border-t border-white/30 dark:border-white/10 p-3 space-y-2.5">
        <div
          className={cn(
            "rounded-2xl border border-white/40 bg-white/55 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]",
            collapsed ? "flex justify-center p-2.5" : "flex items-center gap-3 p-2.5"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/90 to-indigo-500/90 text-white text-sm font-extrabold">
            {userInitial}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                {userName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {userEmail}
              </p>
            </div>
          )}
        </div>

        <div className={cn("flex gap-1.5", collapsed && "flex-col")}>
          <button
            onClick={() => navigate("/")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/40 bg-white/55 py-2 text-xs font-semibold text-slate-800 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Home className="h-4 w-4" />
            {!collapsed && <span>Home</span>}
          </button>

          <ThemeToggle
            variant="sidebar"
            className="rounded-xl border border-white/40 bg-white/55 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
          />

          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 text-rose-600 py-2 text-xs font-semibold hover:bg-rose-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}