import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Droplets,
  FileText,
  BadgeCheck,
  Wallet,
  MapPin,
  ShoppingBag,
  CreditCard,
  Bell,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  PackageCheck,
  LifeBuoy,
  Layers3,
  ChevronRight,
  Milk,
  Crown,
  TrendingUp,
  Activity,
  CircleDollarSign,
  Shield,
  Package,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerHomeData } from "@/hooks/useCustomerHomeData";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "agent-id": string;
        "data-user-name"?: string;
        "data-user-role"?: string;
      };
    }
  }
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatINR(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}

function shiftLabel(s?: string | null) {
  const v = String(s || "").toLowerCase();
  if (v.includes("even")) return "Evening Shift";
  return "Morning Shift";
}

function normalizeShift(s?: string | null) {
  const v = String(s || "").toLowerCase().trim();
  if (v.includes("even")) return "evening";
  return "morning";
}

function deliveryStatusRank(status?: string | null) {
  const v = String(status || "").toLowerCase().trim();

  if (v === "delivered") return 3;
  if (v === "out_for_delivery") return 2;
  if (v === "scheduled") return 1;
  return 0;
}

function formatDeliveryStatus(status?: string | null) {
  const v = String(status || "").toLowerCase().trim();

  if (v === "out_for_delivery") return "out for delivery";
  if (v === "delivered") return "delivered";
  if (v === "scheduled") return "scheduled";

  return v || "scheduled";
}

const WEEK_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-white/45 bg-white/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(99,102,241,0.12)]",
        "dark:border-white/10 dark:bg-white/5 dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {children}
    </Card>
  );
}

function SoftPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "blue" | "violet" | "orange" | "rose";
}) {
  const tones = {
    slate: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    green:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    orange:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function PremiumStatCard({
  title,
  value,
  sub,
  note,
  icon: Icon,
  glowClass,
  iconWrapClass,
  loading,
}: {
  title: string;
  value: string;
  sub: string;
  note: string;
  icon: any;
  glowClass: string;
  iconWrapClass: string;
  loading?: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden rounded-[28px]">
      <CardContent className="relative p-5">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-full blur-3xl opacity-40",
            glowClass
          )}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {title}
            </p>

            {loading ? (
              <Skeleton className="mt-3 h-9 w-24 rounded-xl" />
            ) : (
              <div className="mt-3 text-[34px] font-black leading-none text-slate-900 dark:text-white">
                {value}
              </div>
            )}

            <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              {loading ? <Skeleton className="h-4 w-24 rounded-md" /> : sub}
            </div>

            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {note}
            </div>
          </div>

          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg",
              iconWrapClass
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </GlassCard>
  );
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      document.body.appendChild(script);
    }
  }, []);

  const customerId = user?.id ?? null;
  const home = useCustomerHomeData(customerId);

  const displayName = useMemo(() => {
    return (
      (user as any)?.user_metadata?.full_name ||
      (user as any)?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Customer"
    );
  }, [user]);

  const quickActions = useMemo(
    () => [
      {
        label: "Track Delivery",
        sub: "Live route and status",
        icon: MapPin,
        ring: "from-sky-500 to-blue-600",
        onClick: () => navigate("/customer/delivery"),
      },
      {
        label: "Modify Plans",
        sub: "Edit active subscriptions",
        icon: Sparkles,
        ring: "from-violet-500 to-fuchsia-600",
        onClick: () => navigate("/customer/modify-plan"),
      },
      {
        label: "Pause / Cancel",
        sub: "Manage delivery schedule",
        icon: Activity,
        ring: "from-rose-500 to-orange-500",
        onClick: () => navigate("/customer/cancel-shift"),
      },
      {
        label: "Billing",
        sub: "Bills and due amount",
        icon: CircleDollarSign,
        ring: "from-emerald-500 to-teal-600",
        onClick: () => navigate("/customer/billing"),
      },
      {
        label: "Shop Products",
        sub: "Browse dairy store",
        icon: ShoppingBag,
        ring: "from-amber-500 to-orange-500",
        onClick: () => navigate("/customer/products"),
      },
      {
        label: "Support",
        sub: "Help and assistance",
        icon: LifeBuoy,
        ring: "from-indigo-500 to-blue-700",
        onClick: () => navigate("/customer/support"),
      },
    ],
    [navigate]
  );

  const subsFromHook = ((home as any).subscriptions ?? []) as any[];
  const todayDeliveries = (((home as any).todayDeliveries ?? []) as any[]);

  const bestTodayDeliveryBySubId = useMemo(() => {
    const map = new Map<string, any>();

    for (const row of todayDeliveries) {
      const subId = String(row?.subscription_id || "");
      if (!subId) continue;

      const prev = map.get(subId);

      if (!prev) {
        map.set(subId, row);
        continue;
      }

      const prevRank = deliveryStatusRank(prev?.status);
      const nextRank = deliveryStatusRank(row?.status);

      if (nextRank > prevRank) {
        map.set(subId, row);
        continue;
      }

      if (nextRank === prevRank) {
        const prevTime = prev?.created_at
          ? new Date(prev.created_at).getTime()
          : 0;
        const nextTime = row?.created_at
          ? new Date(row.created_at).getTime()
          : 0;

        if (nextTime > prevTime) {
          map.set(subId, row);
        }
      }
    }

    return map;
  }, [todayDeliveries]);

  const activeSubs = useMemo(
    () =>
      subsFromHook.filter(
        (s) => String(s?.row?.status || "").toLowerCase() === "active"
      ),
    [subsFromHook]
  );

  const primarySub =
    (home as any).subscription ?? activeSubs[0] ?? subsFromHook[0] ?? null;

  const todayLitres = safeNum((home as any)?.stats?.todayLitres);
  const monthSpend = safeNum((home as any)?.stats?.monthSpend);
  const pendingBill = safeNum((home as any)?.stats?.pendingBill);
  const loyaltyPoints = safeNum((home as any)?.stats?.loyaltyPoints);

  const paymentPaid = monthSpend;
  const paymentPending = pendingBill;
  const paymentAdvance = 0;

  const weeklyBySubId = (((home as any).weeklyBySubId || {}) as Record<
    string,
    Array<{ date: string; litres: number }>
  >);

  const totalWeeklyLitres = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      const subId = String(s?.row?.id || "");
      const week = weeklyBySubId?.[subId] || [];
      return sum + week.reduce((a, b) => a + safeNum(b?.litres), 0);
    }, 0);
  }, [activeSubs, weeklyBySubId]);

  const totalDailyLitres = useMemo(() => {
    return activeSubs.reduce((sum, s) => sum + safeNum(s?.row?.qty), 0);
  }, [activeSubs]);

  const heroSummary = useMemo(() => {
    if (!activeSubs.length) {
      return {
        title: "No active milk plan",
        sub: "Start a premium subscription to unlock deliveries, billing and weekly planning.",
      };
    }

    if (activeSubs.length === 1) {
      const s = activeSubs[0];
      const name = s?.product?.name || s?.row?.milk_label || "Milk Plan";
      return {
        title: name,
        sub: `${safeNum(s?.row?.qty)}L • ${shiftLabel(
          s?.row?.shift
        )} • ${s?.farmerName || "Farmer"}`,
      };
    }

    return {
      title: `${activeSubs.length} Active Plans`,
      sub: `${totalDailyLitres}L/day total across all subscriptions`,
    };
  }, [activeSubs, totalDailyLitres]);

  const goToNotifications = () => {
    const el = document.getElementById("customer-notifications");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/customer/notifications");
  };

  const topStats = [
    {
      title: "Today's Delivery",
      value: `${todayLitres}L`,
      sub: (home as any)?.stats?.todayShiftLabel || "Today's milk",
      note: "Live from delivery engine",
      icon: Droplets,
      glowClass: "bg-sky-300/60 dark:bg-sky-500/20",
      iconWrapClass:
        "bg-gradient-to-br from-sky-500 to-blue-700 shadow-sky-500/25",
    },
    {
      title: "Monthly Spend",
      value: `₹${formatINR(monthSpend)}`,
      sub: (home as any)?.stats?.monthLabel || "This month",
      note: "Paid orders and milk",
      icon: Wallet,
      glowClass: "bg-emerald-300/60 dark:bg-emerald-500/20",
      iconWrapClass:
        "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/25",
    },
    {
      title: "Pending Bill",
      value: `₹${formatINR(pendingBill)}`,
      sub: pendingBill > 0 ? "Payment due" : "All clear",
      note: "Outstanding amount",
      icon: FileText,
      glowClass: "bg-orange-300/60 dark:bg-orange-500/20",
      iconWrapClass:
        "bg-gradient-to-br from-orange-500 to-rose-600 shadow-orange-500/25",
    },
    {
      title: "Loyalty Points",
      value: `${loyaltyPoints}`,
      sub: "Redeem at 500",
      note: "Premium customer rewards",
      icon: BadgeCheck,
      glowClass: "bg-violet-300/60 dark:bg-violet-500/20",
      iconWrapClass:
        "bg-gradient-to-br from-violet-500 to-fuchsia-700 shadow-violet-500/25",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eef6ff_0%,#f6f4ff_40%,#fff2f8_100%)] dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f1630_100%)]">
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-[24rem] w-[24rem] rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute right-[-6rem] top-24 h-[26rem] w-[26rem] rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/12" />
        <div className="absolute bottom-[-7rem] left-[25%] h-[24rem] w-[24rem] rounded-full bg-pink-300/28 blur-3xl dark:bg-pink-500/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.25),transparent_32%)] dark:bg-none" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative space-y-6 p-4 md:p-6 xl:p-8"
      >
        {/* Top Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              MilkMate Premium
            </div>

            <h1 className="mt-3 text-[34px] font-black tracking-tight text-slate-900 dark:text-white">
              Welcome back, {displayName} 👋
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Your milk subscriptions, deliveries and billing in one premium
              workspace
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={goToNotifications}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-white/60 text-slate-700 shadow-sm backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white/75 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <Button
              onClick={() => navigate("/customer/modify-plan")}
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 shadow-[0_12px_30px_rgba(79,70,229,0.35)] hover:opacity-95"
            >
              Manage Plan
            </Button>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants}>
          <GlassCard className="overflow-hidden rounded-[34px]">
            <CardContent className="relative p-6 md:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.14),transparent_24%)]" />

              <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.85fr]">
                <div className="rounded-[28px] border border-white/40 bg-white/52 p-6 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Premium customer overview
                  </div>

                  <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    {heroSummary.title}
                  </h2>

                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                    {heroSummary.sub}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-700 px-5 shadow-[0_10px_24px_rgba(59,130,246,0.26)]"
                      onClick={() => navigate("/customer/delivery")}
                    >
                      Track Delivery
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-2xl border-white/50 bg-white/70 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                      onClick={() => navigate("/customer/modify-plan")}
                    >
                      Modify Plans
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <GlassCard className="rounded-[28px]">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Active plans
                      </p>
                      <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
                        {activeSubs.length}
                      </p>
                    </CardContent>
                  </GlassCard>

                  <GlassCard className="rounded-[28px]">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Today’s milk
                      </p>
                      <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
                        {todayLitres}L
                      </p>
                    </CardContent>
                  </GlassCard>

                  <GlassCard className="rounded-[28px]">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        This week’s total
                      </p>
                      <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
                        {totalWeeklyLitres.toFixed(0)}L
                      </p>
                    </CardContent>
                  </GlassCard>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {topStats.map((item) => (
            <PremiumStatCard
              key={item.title}
              title={item.title}
              value={item.value}
              sub={item.sub}
              note={item.note}
              icon={item.icon}
              glowClass={item.glowClass}
              iconWrapClass={item.iconWrapClass}
              loading={(home as any).loading}
            />
          ))}
        </motion.div>

        {/* Delivery + Active plan panel */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]"
        >
          <GlassCard className="rounded-[34px]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <h3 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
                    Today’s Delivery Overview
                  </h3>
                </div>

                <SoftPill tone="blue">{activeSubs.length} plans</SoftPill>
              </div>

              {(home as any).loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                </div>
              ) : activeSubs.length === 0 ? (
                <div className="rounded-[28px] border border-white/40 bg-white/50 p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  No active subscription found.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSubs.map((s) => {
                    const name =
                      s?.product?.name || s?.row?.milk_label || "Milk Plan";

                    const rawShift = s?.row?.shift;
                    const subShift = shiftLabel(rawShift);
                    const normalizedSubShift = normalizeShift(rawShift);

                    const qty = safeNum(s?.row?.qty);
                    const subId = String(s?.row?.id || "");

                    const matchedDelivery = bestTodayDeliveryBySubId.get(subId);

                    const status = matchedDelivery
                      ? String(matchedDelivery.status || "scheduled").toLowerCase()
                      : "scheduled";

                    return (
                      <div
                        key={String(s?.row?.id)}
                        className="rounded-[28px] border border-white/45 bg-white/58 p-4 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(99,102,241,0.12)] dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-400/20 via-teal-300/20 to-sky-300/20 ring-1 ring-emerald-200 dark:ring-emerald-500/20">
                              <Milk className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[18px] font-black text-slate-900 dark:text-white">
                                {name}
                              </p>

                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {qty}L • {subShift}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <SoftPill tone="violet">
                                  {s?.farmerName || "Farmer"}
                                </SoftPill>

                                <SoftPill
                                  tone={
                                    status === "delivered"
                                      ? "green"
                                      : status === "cancelled" || status === "failed"
                                      ? "rose"
                                      : status === "pending" || status === "processing"
                                      ? "orange"
                                      : "blue"
                                  }
                                >
                                  {formatDeliveryStatus(status)}
                                </SoftPill>
                              </div>
                            </div>
                          </div>

                          <Button
                            className="rounded-2xl border-white/50 bg-white/70 text-slate-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/customer/modify-plan?subId=${encodeURIComponent(
                                  s?.row?.id
                                )}`
                              )
                            }
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </GlassCard>

          <GlassCard className="rounded-[34px]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                <div>
                  <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                    Active Plans
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Compact premium subscription list
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {(home as any).loading ? (
                  <>
                    <Skeleton className="h-16 w-full rounded-[22px]" />
                    <Skeleton className="h-16 w-full rounded-[22px]" />
                  </>
                ) : activeSubs.length === 0 ? (
                  <div className="rounded-[24px] border border-white/40 bg-white/50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    No active plan yet.
                  </div>
                ) : (
                  activeSubs.map((s) => {
                    const name =
                      s?.product?.name || s?.row?.milk_label || "Milk Plan";

                    const matchedDelivery = bestTodayDeliveryBySubId.get(
                      String(s?.row?.id || "")
                    );

                    const currentRate =
                      matchedDelivery?.rate != null
                        ? `₹${formatINR(safeNum(matchedDelivery.rate))}/L`
                        : s?.product?.price != null && safeNum(s?.product?.price) > 0
                        ? `₹${formatINR(safeNum(s?.product?.price))}/${
                            s?.product?.unit || "L"
                          }`
                        : "Rate not set";

                    return (
                      <div
                        key={String(s?.row?.id)}
                        className="flex items-center gap-3 rounded-[22px] border border-white/45 bg-white/58 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/20 via-violet-300/20 to-pink-300/20 ring-1 ring-sky-200 dark:ring-sky-500/20">
                          <Droplets className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {safeNum(s?.row?.qty)}L • {shiftLabel(s?.row?.shift)} •{" "}
                            {currentRate}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                <Button
                  onClick={() => navigate("/customer/modify-plan")}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_12px_30px_rgba(79,70,229,0.25)]"
                >
                  Open Modify Plan
                </Button>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={itemVariants}>
          <GlassCard className="rounded-[34px]">
            <CardContent className="p-6">
              <div className="mb-5">
                <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                  Quick Actions
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Fast shortcuts to important customer actions
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className={cn(
                      "group rounded-[26px] border border-white/45 bg-white/58 p-5 text-left shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl transition-all duration-300",
                      "hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(99,102,241,0.15)]",
                      "dark:border-white/10 dark:bg-white/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br text-white shadow-lg",
                          a.ring
                        )}
                      >
                        <a.icon className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {a.label}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {a.sub}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* This week */}
        <motion.div variants={itemVariants}>
          <GlassCard className="rounded-[34px]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <div>
                    <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                      This Week
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Weekly litres tracked separately for each subscription
                    </p>
                  </div>
                </div>

                <SoftPill tone="orange">
                  {(home as any).loading ? "Loading..." : `${activeSubs.length} plans`}
                </SoftPill>
              </div>

              {(home as any).loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full rounded-[24px]" />
                  <Skeleton className="h-28 w-full rounded-[24px]" />
                </div>
              ) : activeSubs.length === 0 ? (
                <div className="rounded-[24px] border border-white/40 bg-white/50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  No active subscriptions found.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {activeSubs.map((s) => {
                    const subId = String(s?.row?.id || "");
                    const week = weeklyBySubId?.[subId] || [];
                    const litresByIndex = WEEK_KEYS.map((_, i) =>
                      safeNum(week[i]?.litres ?? 0)
                    );
                    const total = litresByIndex.reduce((acc, x) => acc + x, 0);
                    const avg = litresByIndex.length ? total / litresByIndex.length : 0;
                    const name =
                      s?.product?.name || s?.row?.milk_label || "Milk Plan";

                    return (
                      <div
                        key={subId}
                        className="rounded-[28px] border border-white/45 bg-white/58 p-5 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-slate-900 dark:text-white">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {safeNum(s?.row?.qty)}L/day • {shiftLabel(s?.row?.shift)} •{" "}
                              {s?.farmerName || "—"}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/5"
                            onClick={() =>
                              navigate(
                                `/customer/modify-plan?subId=${encodeURIComponent(subId)}`
                              )
                            }
                          >
                            Modify
                          </Button>
                        </div>

                        <div className="mt-4 grid grid-cols-7 gap-2">
                          {WEEK_KEYS.map((day, i) => (
                            <div
                              key={day}
                              className="rounded-2xl border border-white/50 bg-white/65 p-2 text-center dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                {day}
                              </div>
                              <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                {litresByIndex[i]}L
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/50 bg-white/65 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                          <div className="text-slate-600 dark:text-slate-300">
                            Total:{" "}
                            <span className="font-black text-slate-900 dark:text-white">
                              {total.toFixed(0)}L
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-300">
                            Avg:{" "}
                            <span className="font-black text-slate-900 dark:text-white">
                              {avg.toFixed(2)}L/day
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* Notifications + payment summary */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.9fr]"
        >
          <GlassCard className="rounded-[34px]">
            <CardContent id="customer-notifications" className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                </div>

                <SoftPill tone="rose">
                  {((home as any)?.notifications?.length ?? 0)} new
                </SoftPill>
              </div>

              <div className="space-y-3">
                {(home as any).loading ? (
                  <>
                    <Skeleton className="h-16 w-full rounded-[22px]" />
                    <Skeleton className="h-16 w-full rounded-[22px]" />
                  </>
                ) : ((home as any)?.notifications?.length ?? 0) === 0 ? (
                  <div className="rounded-[24px] border border-white/40 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      No updates yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Delivery, billing and subscription updates will appear here.
                    </p>
                  </div>
                ) : (
                  (home as any).notifications.slice(0, 4).map((n: any) => (
                    <div
                      key={n.id}
                      className="rounded-[24px] border border-white/45 bg-white/58 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {n.title}
                        </p>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {n.type}
                        </span>
                      </div>

                      {n.sub ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {n.sub}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}

                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/5"
                  onClick={() => navigate("/customer/notifications")}
                >
                  Open Notifications <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard className="rounded-[34px]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                    Payment Summary
                  </h3>
                </div>

                <button
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  onClick={() => navigate("/customer/billing")}
                >
                  View <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-[24px] border border-white/45 bg-white/58 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        This Month
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        ₹{(home as any).loading ? "—" : formatINR(paymentPaid)}
                      </p>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        Paid
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/45 bg-white/58 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Pending
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        ₹{(home as any).loading ? "—" : formatINR(paymentPending)}
                      </p>
                      <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                        {paymentPending > 0 ? "Payment due" : "No pending"}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-lg">
                      <Shield className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/45 bg-white/58 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Advance Balance
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        ₹{(home as any).loading ? "—" : formatINR(paymentAdvance)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        No advance
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white shadow-lg">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      </motion.div>

      <elevenlabs-convai
        agent-id="agent_3401kmjjhwaaea0vr9qw7q49hr3t"
        data-user-name={displayName}
        data-user-role="customer"
      />
    </div>
  );
}
