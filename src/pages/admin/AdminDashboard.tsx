import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCog,
  MapPinned,
  Activity,
  Receipt,
  RefreshCw,
  Search,
  Milk,
  Truck,
  IndianRupee,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  BellRing,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Waves,
  Database,
  UserPlus,
  MessageSquareText,
} from "lucide-react";

import AdminSidebar, { AdminMenuId } from "@/components/AdminSidebar";
import { cn } from "@/lib/utils";

import AdminSupportTicketsPage from "@/pages/admin/AdminSupportTicketsPage";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner";


import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const BRAND_BLUE = "#2563eb";
const BRAND_GREEN = "#16a34a";
const BRAND_ORANGE = "#f97316";
const BRAND_SLATE = "#94a3b8";
const BRAND_VIOLET = "#7c3aed";

type ProfileLite = {
  id?: string | null;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type OrderLite = {
  id: string;
  user_id?: string | null;
  total_amount?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
};

type SubscriptionLite = {
  id: string;
  customer_id?: string | null;
  farmer_id?: string | null;
  qty?: number | null;
  status?: string | null;
  shift?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
};

type DeliveryLite = {
  id: string;
  farmer_id?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  delivery_date?: string | null;
  qty?: number | null;
  rate?: number | null;
  shift?: string | null;
  status?: string | null;
  created_at?: string | null;
  paid?: boolean | null;
  paid_at?: string | null;
};

type PaymentLite = {
  id: string;
  invoice_id?: string | null;
  customer_id?: string | null;
  payer_id?: string | null;
  amount?: number | null;
  method?: string | null;
  payment_method?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type MilkLogLite = {
  id: string;
  farmer_id?: string | null;
  log_date?: string | null;
  milk_l?: number | null;
  created_at?: string | null;
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString("en-IN", { month: "short" });
}

function monthRange(monthKeyValue: string) {
  const [year, month] = monthKeyValue.split("-").map(Number);
  const start = new Date(year, (month || 1) - 1, 1);
  const end = new Date(year, month || 1, 0);

  return {
    start: isoDate(start),
    end: isoDate(end),
  };
}

function profileMatchId(p: ProfileLite) {
  return p.user_id || p.id || "";
}

function getProfileDisplay(profile?: ProfileLite | null) {
  if (!profile) return { name: "Unknown User", short: "—" };

  return {
    name: profile.full_name || profile.email || profile.mobile_number || "Unknown User",
    short: profile.user_id || profile.id || "—",
  };
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(v?: string | null) {
  const s = String(v || "");
  return s ? `#${s.slice(0, 8)}` : "—";
}

function shortUser(v?: string | null) {
  const s = String(v || "");
  return s ? `${s.slice(0, 8)}…` : "—";
}

function statusTone(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "paid" || s === "delivered" || s === "active") {
    return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
  }

  if (s === "scheduled" || s === "pending") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  }

  if (s === "cancelled" || s === "canceled" || s === "failed") {
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  }

  if (s === "refunded") {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20";
  }

  return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminMenuId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionLite[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryLite[]>([]);
  const [payments, setPayments] = useState<PaymentLite[]>([]);
  const [milkLogs, setMilkLogs] = useState<MilkLogLite[]>([]);

  const [search, setSearch] = useState("");

  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedFarmer, setSelectedFarmer] = useState<ProfileLite | null>(null);
  const [farmerDrawerOpen, setFarmerDrawerOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [billingLoading, setBillingLoading] = useState(false);


  const billingMonthDeliveries = useMemo(() => {
  const { start, end } = monthRange(billingMonth);

  return deliveries.filter((d) => {
    const deliveryDate = String(d.delivery_date || "").slice(0, 10);
    return (
      String(d.status || "").toLowerCase() === "delivered" &&
      deliveryDate >= start &&
      deliveryDate <= end
    );
  });
}, [deliveries, billingMonth]);

 const profilesByAnyId = useMemo(() => {
    const map = new Map<string, ProfileLite>();

    profiles.forEach((p) => {
      if (p.id) map.set(String(p.id), p);
      if (p.user_id) map.set(String(p.user_id), p);
    });

    return map;
  }, [profiles]);

const groupedSubscriptionBilling = useMemo(() => {
  
  const map = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      amount: number;
      paidAmount: number;
      pendingAmount: number;
      latestPaidAt: string | null;
      rows: DeliveryLite[];
      pendingRows: DeliveryLite[];
      status: string;

      firstDeliveryDate?: string | null;
      lastDeliveryDate?: string | null;
    }
  >();

  

  const activeMonth = billingMonth; // same month input jo UI me use ho raha hai
  const { start, end } = monthRange(activeMonth);

  

  const billingMonthDeliveries = deliveries.filter((d) => {
    const deliveryDate = String(d.delivery_date || "").slice(0, 10);
    const status = String(d.status || "").toLowerCase().trim();

    return (
      !!d.customer_id &&
      status === "delivered" &&
      deliveryDate >= start &&
      deliveryDate <= end
    );
  });

  for (const d of billingMonthDeliveries) {
    const customerId = String(d.customer_id || "");
    if (!customerId) continue;

    const customerProfile = profilesByAnyId.get(customerId);
    const customerName =
      customerProfile?.full_name ||
      customerProfile?.email ||
      customerProfile?.mobile_number ||
      "Unknown Customer";

    const amount = safeNum(d.qty) * safeNum(d.rate);
    const isPaid = Boolean(d.paid) === true;

    if (!map.has(customerId)) {
      map.set(customerId, {
        customerId,
        customerName,
        amount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        latestPaidAt: null,
        rows: [],
        pendingRows: [],
        status: "pending",
      });
    }

    const item = map.get(customerId)!;
    item.rows.push(d);
    item.amount += amount;

    if (isPaid) {
      item.paidAmount += amount;

      const currentPaidAt = d.paid_at || null;
      if (
        currentPaidAt &&
        (!item.latestPaidAt ||
          new Date(currentPaidAt).getTime() > new Date(item.latestPaidAt).getTime())
      ) {
        item.latestPaidAt = currentPaidAt;
      }
    } else {
      item.pendingAmount += amount;
      item.pendingRows.push(d);
    }
  }

  return Array.from(map.values()).map((item) => {
  const status =
    item.pendingAmount <= 0 && item.paidAmount > 0
      ? "paid"
      : item.pendingAmount > 0 && item.paidAmount > 0
      ? "partial"
      : "pending";

  const firstDeliveryDate = item.rows
    .map((r) => r.delivery_date)
    .filter(Boolean)
    .sort()[0] ?? null;

  const lastDeliveryDate = item.rows
    .map((r) => r.delivery_date)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] ?? null;

  return {
    ...item,
    status,
    firstDeliveryDate,
    lastDeliveryDate,
  };
});
}, [deliveries, billingMonth, profilesByAnyId]);



  const storeOrdersRevenue = useMemo(() => {
    return orders
      .filter((o) => String(o.payment_status || "").toLowerCase() === "paid")
      .reduce((acc, o) => acc + safeNum(o.total_amount), 0);
  }, [orders]);

  const subscriptionRevenue = useMemo(() => {
  return deliveries
    .filter(
      (d) =>
        String(d.status || "").toLowerCase() === "delivered" &&
        Boolean(d.paid) === true
    )
    .reduce((acc, d) => acc + safeNum(d.qty) * safeNum(d.rate), 0);
}, [deliveries]);

  const subscriptionPendingAmount = useMemo(() => {
  return deliveries
    .filter(
      (d) =>
        String(d.status || "").toLowerCase() === "delivered" &&
        Boolean(d.paid) === false
    )
    .reduce((acc, d) => acc + safeNum(d.qty) * safeNum(d.rate), 0);
}, [deliveries]);

  const totalPaidRevenue = useMemo(() => {
    return storeOrdersRevenue + subscriptionRevenue;
  }, [storeOrdersRevenue, subscriptionRevenue]);

 const pendingAmount = useMemo(() => {
  const ordersPending = orders
    .filter((o) => String(o.payment_status || "").toLowerCase() !== "paid")
    .reduce((acc, o) => acc + safeNum(o.total_amount), 0);

  return ordersPending + subscriptionPendingAmount;
}, [orders, subscriptionPendingAmount]);

  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("today");
  const [deliverySearch, setDeliverySearch] = useState("");

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="admin-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_24%),linear-gradient(180deg,#f8fbff,#eef4ff_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_24%),linear-gradient(180deg,#020617,#0f172a_58%,#111827)]">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "pl-[78px]" : "pl-[292px]"
        )}
      >
        {children}
      </div>
    </div>
  );

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,full_name,email,mobile_number,role,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProfileLite[];
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("id,user_id,total_amount,payment_status,payment_method,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as OrderLite[];
  }

  async function fetchSubscriptions() {
    const { data, error } = await supabase
      .from("customer_subscriptions")
      .select("id,customer_id,farmer_id,qty,status,shift,start_date,end_date,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as SubscriptionLite[];
  }

  async function fetchDeliveries() {
  try {
    const { data, error } = await supabase
      .from("deliveries")
      .select(
        "id,farmer_id,customer_id,subscription_id,delivery_date,qty,rate,shift,status,created_at,paid,paid_at"
      )
      .order("delivery_date", { ascending: false })
      .limit(3000);

    if (error) {
      console.error("DELIVERIES ERROR:", error);
      return [];
    }

    return (data ?? []) as DeliveryLite[];
  } catch (err) {
    console.error("fetchDeliveries catch:", err);
    return [];
  }
}

  async function fetchPayments() {
    const { data, error } = await supabase
      .from("invoice_payments")
      .select("id,invoice_id,customer_id,payer_id,amount,method,payment_method,status,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return [] as PaymentLite[];
    return (data ?? []) as PaymentLite[];
  }

 async function fetchMilkLogs() {
  const { data, error } = await supabase
    .from("cattle_milk_logs")
    .select("id, farmer_id, cattle_id, log_date, shift, milk_l, created_at")
    .order("log_date", { ascending: false })
    .limit(3000);

  console.log("fetchMilkLogs data:", data);
  console.log("fetchMilkLogs error:", error);

  if (error) {
    toast({
      title: "Milk logs fetch failed",
      description: error.message,
      variant: "destructive",
    });
    return [] as MilkLogLite[];
  }

  return (data ?? []) as MilkLogLite[];
}

  async function fetchAll() {
    setRefreshing(true);
    try {
      const [pData, oData, sData, dData, payData, milkData] = await Promise.all([
        fetchProfiles(),
        fetchOrders(),
        fetchSubscriptions(),
        fetchDeliveries(),
        fetchPayments(),
        fetchMilkLogs(),
      ]);

      setProfiles(pData);
      setOrders(oData);
      setSubscriptions(sData);
      setDeliveries(dData);
      setPayments(payData);
      setMilkLogs(milkData);
    } catch (e: any) {
      toast({
        title: "Admin fetch failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const farmers = useMemo(
    () => profiles.filter((p) => String(p.role || "").toLowerCase() === "farmer"),
    [profiles]
  );

 

  const customers = useMemo(
    () => profiles.filter((p) => String(p.role || "").toLowerCase() === "customer"),
    [profiles]
  );

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => String(s.status || "").toLowerCase().trim() === "active"),
    [subscriptions]
  );

  const cancelledSubscriptions = useMemo(
    () =>
      subscriptions.filter((s) => {
        const st = String(s.status || "").toLowerCase().trim();
        return st === "cancelled" || st === "canceled";
      }),
    [subscriptions]
  );

  const today = useMemo(() => isoDate(new Date()), []);

  const todayDeliveries = useMemo(
    () => deliveries.filter((d) => String(d.delivery_date || "").slice(0, 10) === today),
    [deliveries, today]
  );

  const deliveredToday = useMemo(
    () => todayDeliveries.filter((d) => String(d.status || "").toLowerCase() === "delivered").length,
    [todayDeliveries]
  );

  const cancelledToday = useMemo(
  () =>
    todayDeliveries.filter((d) => {
      const s = String(d.status || "").toLowerCase();
      return s === "cancelled" || s === "canceled";
    }).length,
  [todayDeliveries]
);

const totalLitresToday = useMemo(
  () => todayDeliveries.reduce((acc, d) => acc + safeNum(d.qty), 0),
  [todayDeliveries]
);

const todayDeliveryRevenue = useMemo(
  () => todayDeliveries.reduce((acc, d) => acc + safeNum(d.qty) * safeNum(d.rate), 0),
  [todayDeliveries]
);

const recentDeliveries = useMemo(() => deliveries.slice(0, 25), [deliveries]);

  const scheduledToday = useMemo(
    () => todayDeliveries.filter((d) => String(d.status || "").toLowerCase() === "scheduled").length,
    [todayDeliveries]
  );

const filteredDeliveries = useMemo(() => {
  let data = deliveries;

  const today = isoDate(new Date());

  if (deliveryDateFilter === "today") {
    data = data.filter(
      (d) => String(d.delivery_date || "").slice(0, 10) === today
    );
  }

  if (deliveryDateFilter === "week") {
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    data = data.filter((d) => {
      if (!d.delivery_date) return false;
      return now - new Date(d.delivery_date).getTime() <= WEEK;
    });
  }

  if (deliveryDateFilter === "month") {
    const now = Date.now();
    const MONTH = 30 * 24 * 60 * 60 * 1000;

    data = data.filter((d) => {
      if (!d.delivery_date) return false;
      return now - new Date(d.delivery_date).getTime() <= MONTH;
    });
  }

  if (deliveryStatusFilter !== "all") {
    data = data.filter(
      (d) =>
        String(d.status || "").toLowerCase() === deliveryStatusFilter
    );
  }

  if (deliverySearch.trim()) {
    const q = deliverySearch.toLowerCase();

    data = data.filter((d) => {
      const farmer = profilesByAnyId.get(String(d.farmer_id || ""));
      const customer = profilesByAnyId.get(String(d.customer_id || ""));

      return (
        farmer?.full_name?.toLowerCase().includes(q) ||
        customer?.full_name?.toLowerCase().includes(q)
      );
    });
  }

  return data.slice(0, 25);
}, [
  deliveries,
  deliveryStatusFilter,
  deliveryDateFilter,
  deliverySearch,
  profilesByAnyId,
]);

const filteredDeliveredCount = useMemo(
  () =>
    filteredDeliveries.filter(
      (d) => String(d.status || "").toLowerCase() === "delivered"
    ).length,
  [filteredDeliveries]
);

const filteredScheduledCount = useMemo(
  () =>
    filteredDeliveries.filter(
      (d) => String(d.status || "").toLowerCase() === "scheduled"
    ).length,
  [filteredDeliveries]
);

const filteredCancelledCount = useMemo(
  () =>
    filteredDeliveries.filter((d) => {
      const s = String(d.status || "").toLowerCase();
      return s === "cancelled" || s === "canceled";
    }).length,
  [filteredDeliveries]
);

const filteredFailedCount = useMemo(
  () =>
    filteredDeliveries.filter(
      (d) => String(d.status || "").toLowerCase() === "failed"
    ).length,
  [filteredDeliveries]
);

const filteredDeliveryLitres = useMemo(
  () => filteredDeliveries.reduce((acc, d) => acc + safeNum(d.qty), 0),
  [filteredDeliveries]
);

const filteredDeliveryRevenue = useMemo(
  () =>
    filteredDeliveries.reduce(
      (acc, d) => acc + safeNum(d.qty) * safeNum(d.rate),
      0
    ),
  [filteredDeliveries]
);

const filteredDeliverySuccessRate = useMemo(() => {
  if (filteredDeliveries.length === 0) return 0;
  return Math.round((filteredDeliveredCount / filteredDeliveries.length) * 100);
}, [filteredDeliveries, filteredDeliveredCount]);

const avgDeliverySize = useMemo(() => {
  if (filteredDeliveries.length === 0) return 0;
  return filteredDeliveryLitres / filteredDeliveries.length;
}, [filteredDeliveries, filteredDeliveryLitres]);

const revenuePerLitre = useMemo(() => {
  if (filteredDeliveryLitres === 0) return 0;
  return filteredDeliveryRevenue / filteredDeliveryLitres;
}, [filteredDeliveryRevenue, filteredDeliveryLitres]);

const deliveryTrend7d = useMemo(() => {
  const rows = [];
  const todayDate = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);

    const rowsForDay = deliveries.filter(
      (x) => String(x.delivery_date || "").slice(0, 10) === key
    );

    rows.push({
      date: key.slice(5),
      deliveries: rowsForDay.length,
      litres: rowsForDay.reduce((acc, x) => acc + safeNum(x.qty), 0),
      revenue: rowsForDay.reduce(
        (acc, x) => acc + safeNum(x.qty) * safeNum(x.rate),
        0
      ),
    });
  }

  return rows;
}, [deliveries]);

const deliveryStatusMix = useMemo(
  () => [
    { name: "Delivered", value: filteredDeliveredCount },
    { name: "Scheduled", value: filteredScheduledCount },
    { name: "Cancelled", value: filteredCancelledCount },
    { name: "Failed", value: filteredFailedCount },
  ],
  [
    filteredDeliveredCount,
    filteredScheduledCount,
    filteredCancelledCount,
    filteredFailedCount,
  ]
);

const monitoringLatestActivity = useMemo(() => {
  const timestamps = [
    ...profiles.map((x) => x.created_at).filter(Boolean),
    ...orders.map((x) => x.created_at).filter(Boolean),
    ...subscriptions.map((x) => x.created_at).filter(Boolean),
    ...deliveries.map((x) => x.created_at || x.delivery_date).filter(Boolean),
    ...payments.map((x) => x.paid_at || x.created_at).filter(Boolean),
    ...milkLogs.map((x) => x.created_at || x.log_date).filter(Boolean),
  ];

  if (timestamps.length === 0) return null;

  const latest = timestamps
    .map((x) => new Date(x).getTime())
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => b - a)[0];

  return latest || null;
}, [profiles, orders, subscriptions, deliveries, payments, milkLogs]);

const monitoringHealthScore = useMemo(() => {
  let score = 100;
  if (profiles.length === 0) score -= 20;
  if (deliveries.length === 0) score -= 15;
  if (subscriptions.length === 0) score -= 15;
  if (milkLogs.length === 0) score -= 10;
  if (pendingAmount > totalPaidRevenue && pendingAmount > 0) score -= 15;
  if (todayDeliveries.length > 0 && filteredDeliverySuccessRate < 70) score -= 10;
  return Math.max(0, score);
}, [
  profiles.length,
  deliveries.length,
  subscriptions.length,
  milkLogs.length,
  pendingAmount,
  totalPaidRevenue,
  todayDeliveries.length,
  filteredDeliverySuccessRate,
]);

const monitoringHealthLabel = useMemo(() => {
  if (monitoringHealthScore >= 85) return "Excellent";
  if (monitoringHealthScore >= 70) return "Healthy";
  if (monitoringHealthScore >= 50) return "Attention";
  return "Critical";
}, [monitoringHealthScore]);

const monitoringThroughput7d = useMemo(() => {
  const rows = [];
  const todayDate = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);

    rows.push({
      date: key.slice(5),
      orders: orders.filter((x) => String(x.created_at || "").slice(0, 10) === key).length,
      deliveries: deliveries.filter((x) => String(x.delivery_date || "").slice(0, 10) === key).length,
      payments: payments.filter((x) => String(x.paid_at || x.created_at || "").slice(0, 10) === key).length,
    });
  }

  return rows;
}, [orders, deliveries, payments]);

const monitoringStatusDistribution = useMemo(() => {
  const paidOrders = orders.filter((x) => String(x.payment_status || "").toLowerCase() === "paid").length;
  const pendingOrders = orders.filter((x) => String(x.payment_status || "").toLowerCase() !== "paid").length;
  const activeSubs = subscriptions.filter((x) => String(x.status || "").toLowerCase() === "active").length;
  const cancelledSubs = subscriptions.filter((x) => {
    const s = String(x.status || "").toLowerCase();
    return s === "cancelled" || s === "canceled";
  }).length;

  return [
    { name: "Paid Orders", value: paidOrders },
    { name: "Pending Orders", value: pendingOrders },
    { name: "Active Subs", value: activeSubs },
    { name: "Cancelled Subs", value: cancelledSubs },
  ];
}, [orders, subscriptions]);

  const revenueMonthly = useMemo(() => {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const ordersRevenue30d = orders
    .filter((o) => {
      if (!o.created_at) return false;
      const t = new Date(o.created_at).getTime();
      return (
        now - t <= THIRTY_DAYS &&
        String(o.payment_status || "").toLowerCase() === "paid"
      );
    })
    .reduce((acc, o) => acc + safeNum(o.total_amount), 0);

  const subscriptionsRevenue30d = deliveries
    .filter((d) => {
      const dt = d.paid_at || d.created_at;
      if (!dt) return false;
      const t = new Date(dt).getTime();
      return (
        now - t <= THIRTY_DAYS &&
        String(d.status || "").toLowerCase() === "delivered" &&
        Boolean(d.paid) === true
      );
    })
    .reduce((acc, d) => acc + safeNum(d.qty) * safeNum(d.rate), 0);

  return ordersRevenue30d + subscriptionsRevenue30d;
}, [orders, deliveries]);

  const pendingPayments = useMemo(() => {
  const ordersPending = orders
    .filter((o) => {
      const s = String(o.payment_status || "").toLowerCase();
      return s !== "paid";
    })
    .reduce((acc, o) => acc + safeNum(o.total_amount), 0);

  const subscriptionsPending = deliveries
    .filter((d) => {
      return (
        String(d.status || "").toLowerCase() === "delivered" &&
        Boolean(d.paid) === false
      );
    })
    .reduce((acc, d) => acc + safeNum(d.qty) * safeNum(d.rate), 0);

  return ordersPending + subscriptionsPending;
}, [orders, deliveries]);

  const activeAreas = useMemo(() => {
    const farmerIds = new Set(
      activeSubscriptions.map((s) => String(s.farmer_id || "")).filter(Boolean)
    );
    return farmerIds.size;
  }, [activeSubscriptions]);

  const supplyVsDemand7d = useMemo(() => {
    const rows: { date: string; supply: number; demand: number }[] = [];
    const todayDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const key = isoDate(d);

      const supply = milkLogs
        .filter((m) => String(m.log_date || "").slice(0, 10) === key)
        .reduce((acc, m) => acc + safeNum(m.milk_l), 0);

      const demand = deliveries
        .filter((x) => String(x.delivery_date || "").slice(0, 10) === key)
        .reduce((acc, x) => acc + safeNum(x.qty), 0);

      rows.push({
        date: key.slice(5),
        supply,
        demand,
      });
    }

    return rows;
  }, [milkLogs, deliveries]);

  const milkProductionTrend7d = useMemo(() => {
    const rows: { date: string; milk: number }[] = [];
    const todayDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const key = isoDate(d);

      const milk = milkLogs
        .filter((m) => String(m.log_date || "").slice(0, 10) === key)
        .reduce((acc, m) => acc + safeNum(m.milk_l), 0);

      rows.push({
        date: key.slice(5),
        milk,
      });
    }

    return rows;
  }, [milkLogs]);

  const topFarmersByMilk = useMemo(() => {
  const byFarmer = new Map<string, number>();

  milkLogs.forEach((m) => {
    const farmerId = String(m.farmer_id || "").trim();
    if (!farmerId) return;
    byFarmer.set(farmerId, (byFarmer.get(farmerId) || 0) + safeNum(m.milk_l));
  });

  return Array.from(byFarmer.entries())
    .map(([farmerId, milk]) => {
      const profile = profiles.find((p) => String(p.id) === farmerId || String(p.user_id) === farmerId);

      return {
        farmer:
          profile?.full_name?.trim() ||
          profile?.email?.split("@")[0] ||
          `Farmer ${farmerId.slice(0, 4)}`,
        milk: Math.round(milk),
      };
    })
    .sort((a, b) => b.milk - a.milk)
    .slice(0, 5);
}, [milkLogs, profiles]);

  const customerGrowth6m = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
    }

    return keys.map((k) => {
      const total = customers.filter((c) => {
        if (!c.created_at) return false;
        return monthKey(new Date(c.created_at)) === k;
      }).length;

      return {
        month: monthLabelFromKey(k),
        customers: total,
      };
    });
  }, [customers]);

  const revenueTrend = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
    }

    return keys.map((k) => {
      const orderRevenue = orders
        .filter((o) => {
          if (!o.created_at) return false;
          return (
            monthKey(new Date(o.created_at)) === k &&
            String(o.payment_status || "").toLowerCase() === "paid"
          );
        })
        .reduce((acc, o) => acc + safeNum(o.total_amount), 0);

      const subscriptionBillingRevenue = payments
        .filter((p) => {
          const dt = p.paid_at || p.created_at;
          if (!dt) return false;
          return (
            monthKey(new Date(dt)) === k &&
            String(p.status || "").toLowerCase() === "paid"
          );
        })
        .reduce((acc, p) => acc + safeNum(p.amount), 0);

      return {
        month: monthLabelFromKey(k),
        revenue: Math.round(orderRevenue + subscriptionBillingRevenue),
      };
    });
  }, [orders, payments]);

  const subscriptionStatusPie = useMemo(() => {
    const active = activeSubscriptions.length;
    const cancelled = cancelledSubscriptions.length;
    const other = Math.max(subscriptions.length - active - cancelled, 0);

    return [
      { name: "Active", value: active },
      { name: "Cancelled", value: cancelled },
      { name: "Other", value: other },
    ];
  }, [subscriptions, activeSubscriptions.length, cancelledSubscriptions.length]);

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  const recentInvoicePayments = useMemo(() => {
  return deliveries
    .filter(
      (d) =>
        String(d.status || "").toLowerCase() === "delivered" &&
        safeNum(d.qty) > 0
    )
    .sort((a, b) => {
      const ad = new Date(a.delivery_date || a.created_at || 0).getTime();
      const bd = new Date(b.delivery_date || b.created_at || 0).getTime();
      return bd - ad;
    });
}, [deliveries]);

  const recentOrderPayments = useMemo(
    () => orders.filter((o) => safeNum(o.total_amount) > 0),
    [orders]
  );

  const latestSubscriptions = useMemo(() => subscriptions.slice(0, 6), [subscriptions]);

  const recentPayments = useMemo(() => {
    if (payments.length > 0) return payments.slice(0, 6);
    return orders
      .filter((o) => safeNum(o.total_amount) > 0)
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        amount: o.total_amount,
        payment_method: o.payment_method,
        status: o.payment_status,
        created_at: o.created_at,
      })) as PaymentLite[];
  }, [payments, orders]);

  const farmerMilkStats = useMemo(() => {
    const map = new Map<string, number>();

    milkLogs.forEach((m) => {
      const id = String(m.farmer_id || "");
      if (!id) return;
      map.set(id, (map.get(id) || 0) + safeNum(m.milk_l));
    });

    return map;
  }, [milkLogs]);

  const customerSubscriptionStats = useMemo(() => {
    const map = new Map<string, { total: number; active: number; cancelled: number }>();

    subscriptions.forEach((s) => {
      const customerId = String(s.customer_id || "");
      if (!customerId) return;

      const prev = map.get(customerId) || { total: 0, active: 0, cancelled: 0 };
      const status = String(s.status || "").toLowerCase().trim();

      prev.total += 1;
      if (status === "active") prev.active += 1;
      if (status === "cancelled" || status === "canceled") prev.cancelled += 1;

      map.set(customerId, prev);
    });

    return map;
  }, [subscriptions]);

  const farmerDrawerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        milk: number;
        deliveries: number;
        activeSubscriptions: number;
        revenue: number;
      }
    >();

    milkLogs.forEach((m) => {
      const farmerId = String(m.farmer_id || "");
      if (!farmerId) return;

      const prev = map.get(farmerId) || {
        milk: 0,
        deliveries: 0,
        activeSubscriptions: 0,
        revenue: 0,
      };

      prev.milk += safeNum(m.milk_l);
      map.set(farmerId, prev);
    });

    deliveries.forEach((d) => {
      const farmerId = String(d.farmer_id || "");
      if (!farmerId) return;

      const prev = map.get(farmerId) || {
        milk: 0,
        deliveries: 0,
        activeSubscriptions: 0,
        revenue: 0,
      };

      prev.deliveries += 1;
      prev.revenue += safeNum(d.qty) * safeNum(d.rate);
      map.set(farmerId, prev);
    });

    subscriptions.forEach((s) => {
      const farmerId = String(s.farmer_id || "");
      if (!farmerId) return;

      const prev = map.get(farmerId) || {
        milk: 0,
        deliveries: 0,
        activeSubscriptions: 0,
        revenue: 0,
      };

      const status = String(s.status || "").toLowerCase().trim();
      if (status === "active") prev.activeSubscriptions += 1;

      map.set(farmerId, prev);
    });

    return map;
  }, [milkLogs, deliveries, subscriptions]);

  const filteredFarmers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter((p) => {
      const name = (p.full_name ?? "").toLowerCase();
      const email = (p.email ?? "").toLowerCase();
      const mobile = (p.mobile_number ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || mobile.includes(q);
    });
  }, [farmers, search]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((p) => {
      const name = (p.full_name ?? "").toLowerCase();
      const email = (p.email ?? "").toLowerCase();
      const mobile = (p.mobile_number ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || mobile.includes(q);
    });
  }, [customers, search]);

  const alerts = useMemo(() => {
    const result: { title: string; value: string; tone: "red" | "amber" | "green" }[] = [];

    if (pendingPayments > 0) {
      result.push({
        title: "Pending payment pressure",
        value: `₹${Math.round(pendingPayments).toLocaleString("en-IN")} outstanding`,
        tone: "red",
      });
    }

    if (todayDeliveries.length > 0) {
      result.push({
        title: "Today's delivery load",
        value: `${todayDeliveries.length} deliveries queued today`,
        tone: "amber",
      });
    }

    if (activeSubscriptions.length > 0) {
      result.push({
        title: "Live subscriptions running",
        value: `${activeSubscriptions.length} active customer plans`,
        tone: "green",
      });
    }

    if (result.length === 0) {
      result.push({
        title: "System looks stable",
        value: "No major operational alert found",
        tone: "green",
      });
    }

    return result;
  }, [pendingPayments, todayDeliveries.length, activeSubscriptions.length]);

  async function updateRole(profile: ProfileLite, role: "farmer" | "customer") {
    try {
      const sb: any = supabase;
      const payload = { role };

      if (profile.user_id) {
        const { error } = await sb.from("profiles").update(payload).eq("user_id", profile.user_id);
        if (error) throw error;
      } else if (profile.id) {
        const { error } = await sb.from("profiles").update(payload).eq("id", profile.id);
        if (error) throw error;
      } else {
        throw new Error("Profile identifier missing");
      }

      setProfiles((prev) =>
        prev.map((p) => (profileMatchId(p) === profileMatchId(profile) ? { ...p, role } : p))
      );

      toast({
        title: "Role updated",
        description: `User is now ${role}`,
      });
    } catch (e: any) {
      toast({
        title: "Role update failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  }

const updateGroupedSubscriptionBillingStatus = async (
  
  customerId: string,
  nextStatus: "paid" | "pending"
) => {
  console.log("MARK PAID CLICKED", customerId, billingMonth);
  const { start, end } = monthRange(billingMonth);

  const payload =
    nextStatus === "paid"
      ? {
          paid: true,
          paid_at: new Date().toISOString(),
        }
      : {
          paid: false,
          paid_at: null,
        };

  const sb = supabase as any;

  const { error } = await sb
    .from("deliveries")
    .update(payload)
    .eq("customer_id", customerId)
    .gte("delivery_date", start)
    .lte("delivery_date", end)
    .eq("status", "delivered");

  if (error) {
    console.error("updateGroupedSubscriptionBillingStatus error:", error);
    toast({
      title: "Error",
      description: error.message || "Delivery payment update failed",
      variant: "destructive",
    });
    return;
  }

  setDeliveries((prev) =>
    prev.map((d) => {
      const deliveryDate = String(d.delivery_date || "").slice(0, 10);
      const inRange = deliveryDate >= start && deliveryDate <= end;

      if (
        String(d.customer_id || "") === customerId &&
        String(d.status || "").toLowerCase() === "delivered" &&
        inRange
      ) {
        return {
          ...d,
          paid: nextStatus === "paid",
          paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
        };
      }

      return d;
    })
  );

  toast({
    title: "Success",
    description:
      nextStatus === "paid"
        ? "Customer deliveries marked as paid"
        : "Customer deliveries marked as pending",
  });
};

  async function updatePaymentStatus(
    paymentId: string,
    status: "paid" | "pending" | "refunded",
    source: "invoice_payments" | "orders"
  ) {
    try {
      const sb: any = supabase;

      if (source === "invoice_payments") {
        const { error } = await sb
          .from("invoice_payments")
          .update({ status })
          .eq("id", paymentId);

        if (error) throw error;

        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status } : p))
        );
      } else {
        const orderStatus = status === "refunded" ? "failed" : status;

        const { error } = await sb
          .from("orders")
          .update({ payment_status: orderStatus })
          .eq("id", paymentId);

        if (error) throw error;

        setOrders((prev) =>
          prev.map((o) =>
            o.id === paymentId ? { ...o, payment_status: orderStatus } : o
          )
        );
      }

      toast({
        title: "Payment updated",
        description: `Payment marked as ${status}`,
      });
    } catch (e: any) {
      toast({
        title: "Payment update failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  }

  
  
//   const refreshInvoiceTotals = async (invoiceId: string) => {
//   const sb: any = supabase;

// const { error } = await sb.rpc("generate_monthly_invoices", {
//   p_month: billingMonth,
// });

//   if (error) {
//     console.error("refresh_invoice_totals error:", error);
//   }
// };

  const generateInvoicesForMonth = async () => {
  try {
    setBillingLoading(true);

    await fetchAll();

    toast({
      title: "Success",
      description: `Delivered unpaid rows refreshed for ${billingMonth}`,
    });
  } catch (e: any) {
    console.error(e);
    toast({
      title: "Error",
      description: e?.message || "Refresh failed",
      variant: "destructive",
    });
  } finally {
    setBillingLoading(false);
  }
};

const updateInvoicePaymentStatus = async (
  customerId: string,
  nextStatus: "paid" | "pending" | "refunded"
) => {
  try {
    const { start, end } = monthRange(billingMonth);

    const targetRows = deliveries.filter((d) => {
      const deliveryDate = String(d.delivery_date || "").slice(0, 10);
      return (
        String(d.customer_id || "") === String(customerId) &&
        String(d.status || "").toLowerCase() === "delivered" &&
        deliveryDate >= start &&
        deliveryDate <= end
      );
    });

    if (!targetRows.length) {
      toast({
        title: "No rows found",
        description: "No delivered rows found for this customer in selected month.",
        variant: "destructive",
      });
      return;
    }

    const ids = targetRows.map((r) => r.id);

    const patch =
      nextStatus === "paid"
        ? { paid: true, paid_at: new Date().toISOString() }
        : { paid: false, paid_at: null };

    const sb = supabase as any;

    const { error } = await sb
      .from("deliveries")
      .update(patch)
      .in("id", ids);

    if (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Payment update failed",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description:
        nextStatus === "paid"
          ? "Customer deliveries marked paid"
          : nextStatus === "pending"
          ? "Customer deliveries marked pending"
          : "Customer deliveries refunded to pending",
    });

    await fetchAll();
  } catch (e: any) {
    console.error(e);
    toast({
      title: "Error",
      description: e?.message || "Payment update failed",
      variant: "destructive",
    });
  }
};


  const selectedFarmerStats = selectedFarmer
    ? farmerDrawerStats.get(profileMatchId(selectedFarmer)) || {
        milk: 0,
        deliveries: 0,
        activeSubscriptions: 0,
        revenue: 0,
      }
    : {
        milk: 0,
        deliveries: 0,
        activeSubscriptions: 0,
        revenue: 0,
      };

  const kpis = useMemo(
    () => [
      {
        label: "Total Farmers",
        value: String(farmers.length),
        icon: UserCog,
        tint: "from-blue-500/15 to-cyan-500/5",
      },
      {
        label: "Total Customers",
        value: String(customers.length),
        icon: Users,
        tint: "from-indigo-500/15 to-blue-500/5",
      },
      {
        label: "Active Subs",
        value: String(activeSubscriptions.length),
        icon: Milk,
        tint: "from-green-500/15 to-emerald-500/5",
      },
      {
        label: "Today Deliveries",
        value: String(todayDeliveries.length),
        icon: Truck,
        tint: "from-orange-500/15 to-amber-500/5",
      },
      {
        label: "Revenue (30d)",
        value: `₹${Math.round(revenueMonthly).toLocaleString("en-IN")}`,
        icon: IndianRupee,
        tint: "from-violet-500/15 to-fuchsia-500/5",
      },
      {
        label: "Pending Payments",
        value: `₹${Math.round(pendingPayments).toLocaleString("en-IN")}`,
        icon: AlertTriangle,
        tint: "from-rose-500/15 to-red-500/5",
      },
    ],
    [
      farmers.length,
      customers.length,
      activeSubscriptions.length,
      todayDeliveries.length,
      revenueMonthly,
      pendingPayments,
    ]
  );

  if (loading) {
    return (
      <Shell>
        <div className="p-6 lg:p-10">Loading admin…</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="p-5 lg:p-8 space-y-6">
        <div className="relative overflow-hidden rounded-[32px] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl p-6 shadow-[0_20px_80px_rgba(59,130,246,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.15),transparent_28%),radial-gradient(circle_at_center,rgba(34,197,94,0.08),transparent_30%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                MilkMate Control Center
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-white/65">
                Full system analytics, delivery insights, billing visibility and customer management in one premium control panel.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <TopChip icon={ShieldCheck} label={`${farmers.length} farmers live`} />
                <TopChip icon={Users} label={`${customers.length} customers`} />
                <TopChip icon={Milk} label={`${activeSubscriptions.length} active plans`} />
                <TopChip icon={Wallet} label={`₹${Math.round(totalPaidRevenue).toLocaleString("en-IN")} total revenue`} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchAll}
                disabled={refreshing}
                className="gap-2 rounded-2xl border-blue-200/70 bg-white/70 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <ThemeToggle className="hidden sm:flex border-blue-200/70 bg-white/70 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" />
            </div>
          </div>
        </div>

        {activeSection === "dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              <AdminActionCard title="Manage Farmers" desc="Profiles, approvals and role control." icon={UserCog} />
              <AdminActionCard title="Manage Customers" desc="Customer accounts and engagement." icon={Users} />
              <AdminActionCard title="Area & Delivery" desc="Delivery activity and regional view." icon={MapPinned} />
              <AdminActionCard title="System Monitoring" desc="Live platform visibility." icon={Activity} />
              <AdminActionCard title="Billing Overview" desc="Invoices, payments and dues." icon={Receipt} />
              <AdminActionCard title="Milk Analytics" desc="Supply vs demand insights." icon={Milk} />
              <AdminActionCard title="Support Tickets" desc="Handle customer issues, replies, status and support operations." icon={MessageSquareText}
/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              {kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.03 }}
                >
                  <PremiumStatCard
                    label={k.label}
                    value={k.value}
                    icon={k.icon}
                    tint={k.tint}
                  />
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <ChartShell
                className="xl:col-span-8"
                title="Revenue Trend (6 Months)"
                subtitle="Combined paid revenue from store orders + subscription billing."
                icon={TrendingUp}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFillLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BRAND_BLUE} stopOpacity={0.34} />
                          <stop offset="95%" stopColor={BRAND_BLUE} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={BRAND_BLUE}
                        fill="url(#revFillLight)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>

              <ChartShell
                className="xl:col-span-4"
                title="Subscription Status"
                subtitle="Active vs cancelled plans."
                icon={BarChart3}
              >
                <div className="h-80">
                  {subscriptionStatusPie.some((x) => safeNum(x.value) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subscriptionStatusPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="44%"
                          innerRadius={58}
                          outerRadius={98}
                          paddingAngle={4}
                          label
                        >
                          {subscriptionStatusPie.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={
                                idx === 0
                                  ? BRAND_GREEN
                                  : idx === 1
                                  ? BRAND_ORANGE
                                  : BRAND_SLATE
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState
                      icon={BarChart3}
                      title="No subscription data"
                      subtitle="Create customer plans to unlock this chart."
                    />
                  )}
                </div>
              </ChartShell>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <ChartShell
                className="xl:col-span-7"
                title="Milk Supply vs Demand (7 Days)"
                subtitle="Supply from milk logs vs customer delivery demand."
                icon={Waves}
              >
                <div className="h-80">
                  {supplyVsDemand7d.some((x) => safeNum(x.supply) > 0 || safeNum(x.demand) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplyVsDemand7d}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="supply"
                          name="Supply (L)"
                          fill={BRAND_GREEN}
                          radius={[10, 10, 0, 0]}
                        />
                        <Bar
                          dataKey="demand"
                          name="Demand (L)"
                          fill={BRAND_BLUE}
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState
                      icon={Milk}
                      title="No milk activity yet"
                      subtitle="Start adding milk logs and delivery records to see supply vs demand."
                    />
                  )}
                </div>
              </ChartShell>

              <div className="xl:col-span-5 grid grid-cols-1 gap-4">
                <SectionCard title="Operational Snapshot" subtitle="Quick system numbers for admin." icon={Activity}>
                  <div className="space-y-3">
                    <SnapshotRow label="Active Areas" value={String(activeAreas)} />
                    <SnapshotRow label="Today Deliveries" value={String(todayDeliveries.length)} />
                    <SnapshotRow label="Delivered Today" value={String(deliveredToday)} />
                    <SnapshotRow label="Scheduled Today" value={String(scheduledToday)} />
                    <SnapshotRow label="Milk Logs Loaded" value={String(milkLogs.length)} />
                    <SnapshotRow label="Payment Records" value={String(payments.length)} />
                  </div>
                </SectionCard>

                <SectionCard title="Admin Alerts" subtitle="Important operational signals." icon={BellRing}>
                  <div className="space-y-3">
                    {alerts.map((a, i) => (
                      <AlertRow key={i} title={a.title} value={a.value} tone={a.tone} />
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <ChartShell
                className="xl:col-span-4"
                title="Milk Production Trend"
                subtitle="Total milk logged in last 7 days."
                icon={Milk}
              >
                <div className="h-72">
                  {milkProductionTrend7d.some((x) => safeNum(x.milk) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={milkProductionTrend7d}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="milk"
                          name="Milk (L)"
                          stroke={BRAND_GREEN}
                          strokeWidth={3}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState
                      icon={Database}
                      title="No production trend yet"
                      subtitle="Milk log activity will appear here."
                    />
                  )}
                </div>
              </ChartShell>

              <ChartShell
                className="xl:col-span-4"
                title="Top Farmers by Milk"
                subtitle="Top milk contributors from logs."
                icon={UserCog}
              >
                <div className="h-72">
                  {topFarmersByMilk.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topFarmersByMilk} layout="vertical" margin={{ left: 8, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.16} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="farmer" width={90} />
                        <Tooltip />
                        <Bar dataKey="milk" name="Milk (L)" fill={BRAND_VIOLET} radius={[0, 10, 10, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState
                      icon={UserCog}
                      title="No farmer production data"
                      subtitle="Farmer milk contribution will show here."
                    />
                  )}
                </div>
              </ChartShell>

              <ChartShell
                className="xl:col-span-4"
                title="Customer Growth"
                subtitle="New customer accounts per month."
                icon={UserPlus}
              >
                <div className="h-72">
                  {customerGrowth6m.some((x) => safeNum(x.customers) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={customerGrowth6m}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="customers"
                          name="Customers"
                          stroke={BRAND_BLUE}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState
                      icon={Users}
                      title="No customer growth yet"
                      subtitle="New customer signup trend will appear here."
                    />
                  )}
                </div>
              </ChartShell>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <SectionCard
                className="xl:col-span-4"
                title="Latest Subscriptions"
                subtitle="Newest customer plans in the system."
                icon={Milk}
              >
                <div className="space-y-3">
                  {latestSubscriptions.length === 0 ? (
                    <PremiumEmptyState
                      icon={Milk}
                      title="No subscriptions found"
                      subtitle="Customer plans will appear here once created."
                      compact
                    />
                  ) : (
                    latestSubscriptions.map((s) => (
                      <MiniFeedRow
                        key={s.id}
                        title={shortId(s.id)}
                        subtitle={`${safeNum(s.qty)}L • ${s.shift || "shift —"}`}
                        meta={`${s.status || "—"} • ${fmtDate(s.created_at)}`}
                        badge={s.status || "—"}
                      />
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                className="xl:col-span-4"
                title="Recent Payments"
                subtitle="Latest payment activity."
                icon={CreditCard}
              >
                <div className="space-y-3">
                  {recentPayments.length === 0 ? (
                    <PremiumEmptyState
                      icon={CreditCard}
                      title="No payment records yet"
                      subtitle="Payments will appear here when customers pay invoices."
                      compact
                    />
                  ) : (
                    recentPayments.map((p) => (
                      <MiniFeedRow
                        key={p.id}
                        title={`₹${Math.round(safeNum(p.amount)).toLocaleString("en-IN")}`}
                        subtitle={`${p.payment_method || p.method || "Method —"} • ${shortUser(p.customer_id || p.payer_id)}`}
                        meta={`${p.status || "—"} • ${fmtDateTime(p.created_at)}`}
                        badge={p.status || "—"}
                      />
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                className="xl:col-span-4"
                title="Quick Summary"
                subtitle="Top-level business counters."
                icon={CheckCircle2}
              >
                <div className="grid grid-cols-2 gap-3">
                  <MiniSummaryBox
                    label="Total Paid Revenue"
                    value={`₹${Math.round(totalPaidRevenue).toLocaleString("en-IN")}`}
                  />
                  <MiniSummaryBox
                    label="Subscription Revenue"
                    value={`₹${Math.round(subscriptionRevenue).toLocaleString("en-IN")}`}
                  />
                  <MiniSummaryBox
                    label="Store Orders Revenue"
                    value={`₹${Math.round(storeOrdersRevenue).toLocaleString("en-IN")}`}
                  />
                  <MiniSummaryBox
                    label="Pending Amount"
                    value={`₹${Math.round(pendingAmount).toLocaleString("en-IN")}`}
                  />
                  <MiniSummaryBox
                    label="Active Subs"
                    value={activeSubscriptions.length}
                  />
                  <MiniSummaryBox
                    label="Cancelled Subs"
                    value={cancelledSubscriptions.length}
                  />
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Recent Orders" subtitle="Latest 8 orders from the system." icon={Receipt}>
              {recentOrders.length === 0 ? (
                <PremiumEmptyState
                  icon={Receipt}
                  title="No orders found"
                  subtitle="Order activity will appear here."
                />
              ) : (
                <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Order</th>
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Payment</th>
                        <th className="text-left py-3 px-4">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="border-b last:border-b-0">
                          <td className="py-3 px-4 font-medium">{shortId(o.id)}</td>
                          <td className="py-3 px-4">
                            {(() => {
                              const customerProfile = profilesByAnyId.get(String(o.user_id || ""));
                              const display = getProfileDisplay(customerProfile);

                              return (
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground truncate">
                                    {display.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {shortUser(display.short)}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            ₹{Math.round(safeNum(o.total_amount)).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(o.payment_status))}>
                              {o.payment_status || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4">{fmtDateTime(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        )}

        {activeSection === "farmers" && (
          <SectionCard title="Manage Farmers" subtitle="Live data from profiles where role = farmer." icon={UserCog}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div />
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 w-[260px]"
                  placeholder="Search farmer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredFarmers.length === 0 ? (
              <PremiumEmptyState
                icon={UserCog}
                title="No farmers found"
                subtitle="Try a different search query."
              />
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Farmer</th>
                      <th className="text-left py-3 px-4">Contact</th>
                      <th className="text-left py-3 px-4">Joined</th>
                      <th className="text-left py-3 px-4">Milk Logged</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFarmers.map((u) => {
                      const milk = farmerMilkStats.get(profileMatchId(u)) || 0;

                      return (
                        <tr key={profileMatchId(u)} className="border-b last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{u.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {shortUser(profileMatchId(u))}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div>{u.email ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.mobile_number ?? "—"}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-sm">{fmtDate(u.created_at)}</td>

                          <td className="py-3 px-4 font-semibold">{Math.round(milk)} L</td>

                          <td className="py-3 px-4">
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold bg-green-500/10 text-green-700 border-green-500/20">
                              Active
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedFarmer(u);
                                  setFarmerDrawerOpen(true);
                                }}
                              >
                                View
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRole(u, "customer")}
                              >
                                Move to Customer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {activeSection === "customers" && (
          <SectionCard title="Manage Customers" subtitle="Live data from profiles where role = customer." icon={Users}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div />
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 w-[260px]"
                  placeholder="Search customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <PremiumEmptyState
                icon={Users}
                title="No customers found"
                subtitle="Try a different search query."
              />
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">Contact</th>
                      <th className="text-left py-3 px-4">Joined</th>
                      <th className="text-left py-3 px-4">Running Subs</th>
                      <th className="text-left py-3 px-4">Cancelled Subs</th>
                      <th className="text-right py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((u) => {
                      const stats = customerSubscriptionStats.get(profileMatchId(u)) || {
                        total: 0,
                        active: 0,
                        cancelled: 0,
                      };

                      return (
                        <tr key={profileMatchId(u)} className="border-b last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{u.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {shortUser(profileMatchId(u))}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div>{u.email ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.mobile_number ?? "—"}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-sm">{fmtDate(u.created_at)}</td>

                          <td className="py-3 px-4">
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400">
                              {stats.active}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400">
                              {stats.cancelled}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRole(u, "farmer")}
                            >
                              Promote to Farmer
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

                {activeSection === "areas" && (
          <SectionCard
            title="Area & Delivery"
            subtitle="Live delivery operations, filters, analytics and revenue visibility."
            icon={MapPinned}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 mb-6">
              <MiniMetric title="Today Deliveries" value={todayDeliveries.length} />
              <MiniMetric title="Delivered Today" value={deliveredToday} />
              <MiniMetric title="Scheduled Today" value={scheduledToday} />
              <MiniMetric title="Cancelled Today" value={cancelledToday} />
              <MiniMetric title="Success Rate" value={`${filteredDeliverySuccessRate}%`} />
              <MiniMetric title="Avg Delivery Size" value={`${avgDeliverySize.toFixed(2)} L`} />
              <MiniMetric title="Revenue / Litre" value={`₹${revenuePerLitre.toFixed(2)}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniMetric title="Filtered Litres" value={`${Math.round(filteredDeliveryLitres)} L`} />
              <MiniMetric title="Filtered Revenue" value={`₹${Math.round(filteredDeliveryRevenue).toLocaleString("en-IN")}`} />
              <MiniMetric title="Rows in View" value={filteredDeliveries.length} />
            </div>

            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant={deliveryStatusFilter === "all" ? "default" : "outline"} onClick={() => setDeliveryStatusFilter("all")}>All</Button>
                  <Button variant={deliveryStatusFilter === "delivered" ? "default" : "outline"} onClick={() => setDeliveryStatusFilter("delivered")}>Delivered</Button>
                  <Button variant={deliveryStatusFilter === "scheduled" ? "default" : "outline"} onClick={() => setDeliveryStatusFilter("scheduled")}>Scheduled</Button>
                  <Button variant={deliveryStatusFilter === "cancelled" ? "default" : "outline"} onClick={() => setDeliveryStatusFilter("cancelled")}>Cancelled</Button>
                  <Button variant={deliveryStatusFilter === "failed" ? "default" : "outline"} onClick={() => setDeliveryStatusFilter("failed")}>Failed</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={deliveryDateFilter === "today" ? "default" : "outline"} onClick={() => setDeliveryDateFilter("today")}>Today</Button>
                  <Button variant={deliveryDateFilter === "week" ? "default" : "outline"} onClick={() => setDeliveryDateFilter("week")}>7 Days</Button>
                  <Button variant={deliveryDateFilter === "month" ? "default" : "outline"} onClick={() => setDeliveryDateFilter("month")}>30 Days</Button>
                </div>
              </div>

              <div className="relative w-full xl:w-[320px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search farmer or customer"
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
              <ChartShell className="xl:col-span-8" title="Delivery Trend (7 Days)" subtitle="Daily deliveries and litres moved through the network." icon={Truck}>
                <div className="h-72">
                  {deliveryTrend7d.some((x) => x.deliveries > 0 || x.litres > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deliveryTrend7d}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="deliveries" name="Deliveries" fill={BRAND_BLUE} radius={[10, 10, 0, 0]} />
                        <Bar dataKey="litres" name="Litres" fill={BRAND_GREEN} radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState icon={Truck} title="No delivery trend yet" subtitle="Create delivery records to unlock operational charts." compact />
                  )}
                </div>
              </ChartShell>

              <ChartShell className="xl:col-span-4" title="Delivery Status Mix" subtitle="Distribution of current filtered delivery rows." icon={BarChart3}>
                <div className="h-72">
                  {deliveryStatusMix.some((x) => safeNum(x.value) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deliveryStatusMix} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={50} outerRadius={86} paddingAngle={3} label>
                          {deliveryStatusMix.map((_, idx) => (
                            <Cell key={idx} fill={idx === 0 ? BRAND_GREEN : idx === 1 ? BRAND_BLUE : idx === 2 ? BRAND_ORANGE : BRAND_VIOLET} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState icon={BarChart3} title="No status mix yet" subtitle="Filtered delivery statuses will appear here." compact />
                  )}
                </div>
              </ChartShell>
            </div>

            {filteredDeliveries.length === 0 ? (
              <PremiumEmptyState icon={Truck} title="No deliveries found" subtitle="Adjust filters or create new delivery records to populate this view." />
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Delivery ID</th>
                      <th className="text-left py-3 px-4">Delivery Date</th>
                      <th className="text-left py-3 px-4">Farmer</th>
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">Shift</th>
                      <th className="text-left py-3 px-4">Qty</th>
                      <th className="text-left py-3 px-4">Rate</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeliveries.map((d) => {
                      const farmerProfile = profilesByAnyId.get(String(d.farmer_id || ""));
                      const customerProfile = profilesByAnyId.get(String(d.customer_id || ""));
                      const farmerDisplay = getProfileDisplay(farmerProfile);
                      const customerDisplay = getProfileDisplay(customerProfile);
                      const amount = safeNum(d.qty) * safeNum(d.rate);

                      return (
                        <tr key={d.id} className="border-b last:border-b-0">
                          <td className="py-3 px-4 font-medium">{shortId(d.id)}</td>
                          <td className="py-3 px-4">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground">{fmtDate(d.delivery_date)}</div>
                              <div className="text-xs text-muted-foreground">{fmtDateTime(d.created_at)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{farmerDisplay.name}</div>
                              <div className="text-xs text-muted-foreground">{shortUser(farmerDisplay.short)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{customerDisplay.name}</div>
                              <div className="text-xs text-muted-foreground">{shortUser(customerDisplay.short)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4"><span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20">{d.shift || "—"}</span></td>
                          <td className="py-3 px-4 font-medium">{safeNum(d.qty)} L</td>
                          <td className="py-3 px-4">₹{Math.round(safeNum(d.rate)).toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4 font-semibold">₹{Math.round(amount).toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(d.status))}>{d.status || "—"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {activeSection === "monitoring" && (
          <SectionCard
            title="System Monitoring"
            subtitle="Operational health, throughput, data freshness and system load."
            icon={Activity}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
              <MiniMetric title="Health Score" value={`${monitoringHealthScore}%`} />
              <MiniMetric title="Health Status" value={monitoringHealthLabel} />
              <MiniMetric title="Profiles" value={profiles.length} />
              <MiniMetric title="Orders" value={orders.length} />
              <MiniMetric title="Deliveries" value={deliveries.length} />
              <MiniMetric title="Payments" value={payments.length} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniMetric title="Active Farmers" value={farmers.length} />
              <MiniMetric title="Active Customers" value={customers.length} />
              <MiniMetric title="Latest Activity" value={monitoringLatestActivity ? fmtDateTime(new Date(monitoringLatestActivity).toISOString()) : "—"} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
              <ChartShell className="xl:col-span-8" title="Platform Throughput (7 Days)" subtitle="Daily orders, deliveries and payments flowing through the platform." icon={TrendingUp}>
                <div className="h-72">
                  {monitoringThroughput7d.some((x) => x.orders > 0 || x.deliveries > 0 || x.payments > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monitoringThroughput7d}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="orders" name="Orders" stroke={BRAND_BLUE} strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke={BRAND_GREEN} strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="payments" name="Payments" stroke={BRAND_VIOLET} strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState icon={TrendingUp} title="No throughput yet" subtitle="As orders, deliveries and payments happen, this chart will light up." compact />
                  )}
                </div>
              </ChartShell>

              <ChartShell className="xl:col-span-4" title="Status Distribution" subtitle="Operational mix of paid orders and subscription states." icon={BarChart3}>
                <div className="h-72">
                  {monitoringStatusDistribution.some((x) => safeNum(x.value) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={monitoringStatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={50} outerRadius={86} paddingAngle={3} label>
                          {monitoringStatusDistribution.map((_, idx) => (
                            <Cell key={idx} fill={idx === 0 ? BRAND_GREEN : idx === 1 ? BRAND_ORANGE : idx === 2 ? BRAND_BLUE : BRAND_VIOLET} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <PremiumEmptyState icon={BarChart3} title="No status distribution yet" subtitle="Order and subscription activity will show the current system mix." compact />
                  )}
                </div>
              </ChartShell>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <SectionCard className="xl:col-span-7" title="Live Operations Board" subtitle="Operational counters the admin team can use right now." icon={Database}>
                <div className="space-y-3">
                  <SnapshotRow label="Total Profiles" value={String(profiles.length)} />
                  <SnapshotRow label="Farmers / Customers" value={`${farmers.length} / ${customers.length}`} />
                  <SnapshotRow label="Subscriptions" value={String(subscriptions.length)} />
                  <SnapshotRow label="Milk Logs" value={String(milkLogs.length)} />
                  <SnapshotRow label="Today Deliveries" value={String(todayDeliveries.length)} />
                  <SnapshotRow label="Total Revenue" value={`₹${Math.round(totalPaidRevenue).toLocaleString("en-IN")}`} />
                  <SnapshotRow label="Pending Amount" value={`₹${Math.round(pendingAmount).toLocaleString("en-IN")}`} />
                </div>
              </SectionCard>

              <SectionCard className="xl:col-span-5" title="System Alerts" subtitle="Automatic operational warnings and healthy signals." icon={BellRing}>
                <div className="space-y-3">
                  <AlertRow title="Monitoring Health" value={`${monitoringHealthLabel} • ${monitoringHealthScore}% score`} tone={monitoringHealthScore >= 85 ? "green" : monitoringHealthScore >= 60 ? "amber" : "red"} />
                  <AlertRow title="Payment Exposure" value={`₹${Math.round(pendingAmount).toLocaleString("en-IN")} still pending`} tone={pendingAmount == 0 ? "green" : pendingAmount < totalPaidRevenue ? "amber" : "red"} />
                  <AlertRow title="Delivery Reliability" value={`${filteredDeliverySuccessRate}% success in current filtered delivery view`} tone={filteredDeliverySuccessRate >= 85 ? "green" : filteredDeliverySuccessRate >= 60 ? "amber" : "red"} />
                </div>
              </SectionCard>
            </div>
          </SectionCard>
        )}

{activeSection === "billing" && (
          <SectionCard title="Billing Overview" subtitle="Subscription invoice payments and store order payments." icon={Receipt}>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Subscription Invoice Generator</p>
                <p className="text-xs text-muted-foreground">
                  Generate monthly invoices from deliveries table.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-[180px]"
                />
                <Button onClick={generateInvoicesForMonth}>
                  Generate Invoice
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <MiniMetric
                  title="Total Paid Revenue"
                  value={`₹${Math.round(totalPaidRevenue).toLocaleString("en-IN")}`}
                />
                <MiniMetric
                  title="Subscription Revenue"
                  value={`₹${Math.round(subscriptionRevenue).toLocaleString("en-IN")}`}
                />
                <MiniMetric
                  title="Store Orders Revenue"
                  value={`₹${Math.round(storeOrdersRevenue).toLocaleString("en-IN")}`}
                />
                <MiniMetric
                  title="Pending Amount"
                  value={`₹${Math.round(pendingAmount).toLocaleString("en-IN")}`}
                />
                <MiniMetric
                  title="Invoice Payments"
                  value={groupedSubscriptionBilling.length}
                />
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Subscription Billing</h3>
                  <p className="text-sm text-muted-foreground">
                    Real invoice payment records from invoice_payments table.
                  </p>
                </div>

                {groupedSubscriptionBilling.length === 0 ? (
                  <PremiumEmptyState
                    icon={CreditCard}
                    title="No invoice payments found"
                    subtitle="Subscription billing payments will appear here."
                    compact
                  />
                ) : (
                  <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Payment ID</th>
                          <th className="text-left py-3 px-4">Customer</th>
                          <th className="text-left py-3 px-4">Amount</th>
                          <th className="text-left py-3 px-4">Method</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Payment Date</th>
                          <th className="text-right py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
  {groupedSubscriptionBilling.map((p) => (
    <tr key={p.customerId} className="border-b last:border-b-0">
      <td className="py-3 px-4 font-medium">
        #{p.customerId.slice(0, 8)}
      </td>

      <td className="py-3 px-4">
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {p.customerName}
          </div>
          <div className="text-xs text-muted-foreground">
            {shortUser(p.customerId)}
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        ₹{Math.round(safeNum(p.amount)).toLocaleString("en-IN")}
      </td>

      <td className="py-3 px-4">cash</td>

      <td className="py-3 px-4">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
            statusTone(p.status)
          )}
        >
          {p.status}
        </span>
      </td>

      <td className="py-3 px-4">
        <div className="min-w-0">
          <div className="font-medium text-foreground">
            <div className="font-medium text-foreground">
  {p.firstDeliveryDate
    ? `${fmtDate(p.firstDeliveryDate)} - ${fmtDate(p.lastDeliveryDate)}`
    : "No deliveries"}
</div>

<div className="text-xs text-muted-foreground">
  {p.status === "paid"
    ? `Paid on ${fmtDateTime(p.latestPaidAt)}`
    : "Pending payment"}
</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {p.latestPaidAt ? fmtDateTime(p.latestPaidAt) : "No paid date"}
          </div>
        </div>
      </td>

      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateGroupedSubscriptionBillingStatus(p.customerId, "paid")}
            disabled={billingLoading}
          >
            Mark Paid
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => updateGroupedSubscriptionBillingStatus(p.customerId, "pending")}
            disabled={billingLoading}
          >
            Mark Pending
          </Button>

          {/* <Button
            size="sm"
            variant="outline"
            onClick={() => updateGroupedSubscriptionBillingStatus(p.customerId, "refunded")}
            disabled={billingLoading}
          >
            Refund
          </Button> */}
        </div>
      </td>
    </tr>
  ))}
</tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Store Orders Payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Payment status for one-time product/store orders from orders table.
                  </p>
                </div>

                {recentOrderPayments.length === 0 ? (
                  <PremiumEmptyState
                    icon={Receipt}
                    title="No store orders found"
                    subtitle="Store order payments will appear here."
                    compact
                  />
                ) : (
                  <div className="overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Order ID</th>
                          <th className="text-left py-3 px-4">Customer</th>
                          <th className="text-left py-3 px-4">Amount</th>
                          <th className="text-left py-3 px-4">Method</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Order Date</th>
                          <th className="text-right py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrderPayments.map((o) => (
                          <tr key={o.id} className="border-b last:border-b-0">
                            <td className="py-3 px-4 font-medium">{shortId(o.id)}</td>
                            <td className="py-3 px-4">
                              {(() => {
                                const customerProfile = profilesByAnyId.get(String(o.user_id || ""));
                                const display = getProfileDisplay(customerProfile);

                                return (
                                  <div className="min-w-0">
                                    <div className="font-medium text-foreground truncate">
                                      {display.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {shortUser(display.short)}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              ₹{Math.round(safeNum(o.total_amount)).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4">{o.payment_method || "—"}</td>
                            <td className="py-3 px-4">
                              <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(o.payment_status))}>
                                {o.payment_status || "—"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="min-w-0">
                                <div className="font-medium text-foreground">
                                  {fmtDate(o.created_at)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDateTime(o.created_at)}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePaymentStatus(o.id, "paid", "orders")}
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePaymentStatus(o.id, "pending", "orders")}
                                >
                                  Mark Pending
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePaymentStatus(o.id, "refunded", "orders")}
                                >
                                  Refund
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {activeSection === "support-tickets" && (
  <AdminSupportTicketsPage />
)}
      </div>

      {farmerDrawerOpen && selectedFarmer && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-[2px]">
          <div className="h-full w-full max-w-md border-l border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Farmer Profile
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-foreground">
                  {selectedFarmer.full_name ?? "—"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFarmer.email ?? "—"}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setFarmerDrawerOpen(false);
                  setSelectedFarmer(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MiniSummaryBox
                label="Milk Logged"
                value={`${Math.round(selectedFarmerStats.milk)} L`}
              />
              <MiniSummaryBox
                label="Deliveries"
                value={selectedFarmerStats.deliveries}
              />
              <MiniSummaryBox
                label="Active Subs"
                value={selectedFarmerStats.activeSubscriptions}
              />
              <MiniSummaryBox
                label="Revenue"
                value={`₹${Math.round(selectedFarmerStats.revenue).toLocaleString("en-IN")}`}
              />
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4">
                <p className="text-xs text-muted-foreground">Farmer ID</p>
                <p className="mt-1 font-semibold text-foreground">
                  {profileMatchId(selectedFarmer) || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4">
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedFarmer.mobile_number ?? "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="mt-1 font-semibold text-foreground">
                  {fmtDate(selectedFarmer.created_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4">
                <p className="text-xs text-muted-foreground">Account Type</p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedFarmer.role ?? "farmer"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ---------- UI ---------- */

function TopChip({
  icon: Icon,
  label,
}: {
  icon: any;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-white/10 bg-white/65 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-white/80 shadow-sm">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function AdminActionCard({
  title,
  desc,
  icon: Icon,
}: {
  title: string;
  desc: string;
  icon: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full rounded-[24px] border border-white/40 dark:border-white/10 bg-white/75 dark:bg-slate-900/55 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
        <CardContent className="p-5">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-blue-500/10 ring-1 ring-blue-500/15">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-4 font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PremiumStatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: any;
  tint: string;
}) {
  return (
    <Card className={cn("rounded-[24px] border border-white/40 dark:border-white/10 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-gradient-to-br", tint)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{value}</p>
          </div>

          <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-background/70 ring-1 ring-border/50 shadow-sm">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartShell({
  title,
  subtitle,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden rounded-[28px] border border-white/40 dark:border-white/10 bg-white/78 dark:bg-slate-900/58 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all", className)}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-slate-100/80 dark:bg-muted/60 ring-1 ring-border/40">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden rounded-[28px] border border-white/40 dark:border-white/10 bg-white/78 dark:bg-slate-900/58 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all", className)}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-slate-100/80 dark:bg-muted/60 ring-1 ring-border/40">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <Separator className="mb-4" />
        {children}
      </CardContent>
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-5">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function MiniFeedRow({
  title,
  subtitle,
  meta,
  badge,
}: {
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          <p className="text-xs text-muted-foreground mt-2">{meta}</p>
        </div>

        {badge ? (
          <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusTone(badge))}>
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MiniSummaryBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-background/60 p-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function PremiumEmptyState({
  icon: Icon,
  title,
  subtitle,
  compact = false,
}: {
  icon: any;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-300/70 dark:border-white/10 bg-gradient-to-br from-white/70 to-blue-50/50 dark:from-muted/20 dark:to-background/70 flex flex-col items-center justify-center text-center",
        compact ? "min-h-[180px] p-6" : "min-h-[240px] p-8"
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/15">
        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function AlertRow({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "red" | "amber" | "green";
}) {
  const classes =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
      : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300";

  return (
    <div className={cn("rounded-2xl border p-4", classes)}>
      <p className="font-semibold">{title}</p>
      <p className="text-sm mt-1 opacity-90">{value}</p>
    </div>
  );
}