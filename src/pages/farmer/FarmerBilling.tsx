// src/pages/farmer/FarmerBilling.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import FarmerSidebar, { FarmerMenuId } from "@/components/FarmerSidebar";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";

import {
  CalendarDays,
  Download,
  RefreshCcw,
  Search,
  Receipt,
  IndianRupee,
  Users,
  Droplets,
  ChevronRight,
  Wallet,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type DeliveryRow = {
  id: string;
  farmer_id: string;
  customer_id: string;
  subscription_id: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  qty: number | null;
  rate: number | null;
  status: string | null;
  created_at: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
};

type StatusFilter = "delivered" | "pending" | "all";

const BRAND_GREEN = "#0ccf3d";
const FUTURE_BLUE = "#3b82f6";
const FUTURE_AMBER = "#f59e0b";
const FUTURE_VIOLET = "#8b5cf6";

function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function BillingStatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/85 backdrop-blur-sm shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: accent }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}
          >
            <Icon className="h-5 w-5" />
          </div>

          <Badge variant="secondary" className="rounded-full">
            Live
          </Badge>
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FarmerBilling() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const activeSection: FarmerMenuId = "billing";

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  }, []);
  const defaultTo = useMemo(() => toISODate(today), [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("delivered");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const mounted = useRef(false);

  const loadBilling = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = (supabase as any)
        .from("deliveries")
        .select(
          "id, farmer_id, customer_id, subscription_id, delivery_date, time_slot, qty, rate, status, created_at"
        )
        .eq("farmer_id", user.id)
        .gte("delivery_date", from)
        .lte("delivery_date", to)
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter === "delivered") {
        query = query.eq("status", "delivered");
      } else if (statusFilter === "pending") {
        query = query.in("status", ["pending", "confirmed", "out_for_delivery"]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as DeliveryRow[];
      setDeliveries(rows);
      setLastUpdated(new Date().toISOString());

      const customerIds = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean)));
      if (!customerIds.length) {
        setProfilesById({});
        return;
      }

      const { data: profs, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email, mobile_number")
        .in("user_id", customerIds);

      if (pErr) throw pErr;

      const map: Record<string, ProfileRow> = {};
      for (const p of (profs ?? []) as ProfileRow[]) map[p.user_id] = p;
      setProfilesById(map);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Billing load failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
      setDeliveries([]);
      setProfilesById({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (mounted.current) return;
    mounted.current = true;
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, statusFilter]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return deliveries;

    return deliveries.filter((d) => {
      const p = profilesById[d.customer_id];
      const hay = [
        d.delivery_date ?? "",
        d.time_slot ?? "",
        d.status ?? "",
        String(d.qty ?? ""),
        String(d.rate ?? ""),
        p?.full_name ?? "",
        p?.email ?? "",
        p?.mobile_number ?? "",
        d.customer_id,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [deliveries, profilesById, q]);

  const customerGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        customer_id: string;
        name: string;
        email: string;
        phone: string;
        litres: number;
        amount: number;
        count: number;
        deliveredCount: number;
        pendingCount: number;
        rows: DeliveryRow[];
      }
    >();

    for (const d of filtered) {
      const qty = safeNum(d.qty);
      const rate = safeNum(d.rate);
      const amount = qty * rate;

      const prof = profilesById[d.customer_id];
      const name = (prof?.full_name || "Customer").trim() || "Customer";
      const email = prof?.email || "";
      const phone = prof?.mobile_number || "";

      const cur =
        map.get(d.customer_id) ??
        ({
          customer_id: d.customer_id,
          name,
          email,
          phone,
          litres: 0,
          amount: 0,
          count: 0,
          deliveredCount: 0,
          pendingCount: 0,
          rows: [],
        } as any);

      cur.litres += qty;
      cur.amount += amount;
      cur.count += 1;
      cur.rows.push(d);

      if ((d.status || "") === "delivered") cur.deliveredCount += 1;
      else cur.pendingCount += 1;

      cur.name = name;
      cur.email = email;
      cur.phone = phone;

      map.set(d.customer_id, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filtered, profilesById]);

  const totals = useMemo(() => {
    const litres = customerGroups.reduce((s, c) => s + c.litres, 0);
    const amount = customerGroups.reduce((s, c) => s + c.amount, 0);
    const customers = customerGroups.length;
    const deliveriesCount = filtered.length;

    const deliveredAmount = filtered
      .filter((d) => d.status === "delivered")
      .reduce((s, d) => s + safeNum(d.qty) * safeNum(d.rate), 0);

    const pendingAmount = filtered
      .filter((d) => d.status !== "delivered")
      .reduce((s, d) => s + safeNum(d.qty) * safeNum(d.rate), 0);

    return {
      litres,
      amount,
      customers,
      deliveriesCount,
      deliveredAmount,
      pendingAmount,
    };
  }, [customerGroups, filtered]);

  const selected = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerGroups.find((c) => c.customer_id === selectedCustomerId) ?? null;
  }, [customerGroups, selectedCustomerId]);

  const openDetails = (customer_id: string) => {
    setSelectedCustomerId(customer_id);
    setOpen(true);
  };

  const exportAllCSV = () => {
    const header = [
      "customer_id",
      "customer_name",
      "customer_email",
      "customer_phone",
      "delivery_date",
      "time_slot",
      "status",
      "qty",
      "rate",
      "amount",
      "subscription_id",
      "delivery_id",
    ];

    const lines = [header.join(",")];

    for (const d of filtered) {
      const p = profilesById[d.customer_id];
      const qty = safeNum(d.qty);
      const rate = safeNum(d.rate);
      const amount = qty * rate;

      const row = [
        d.customer_id,
        (p?.full_name ?? "").replaceAll(",", " "),
        (p?.email ?? "").replaceAll(",", " "),
        (p?.mobile_number ?? "").replaceAll(",", " "),
        (d.delivery_date ?? "").replaceAll(",", " "),
        (d.time_slot ?? "").replaceAll(",", " "),
        (d.status ?? "").replaceAll(",", " "),
        String(d.qty ?? ""),
        String(d.rate ?? ""),
        amount.toFixed(2),
        (d.subscription_id ?? "").replaceAll(",", " "),
        d.id,
      ];

      lines.push(row.join(","));
    }

    const filename = `billing_${from}_to_${to}.csv`;
    downloadTextFile(filename, lines.join("\n"));
    toast({ title: "CSV exported", description: `Downloaded: ${filename}` });
  };

  const exportCustomerCSV = (custId: string) => {
    const c = customerGroups.find((x) => x.customer_id === custId);
    if (!c) return;

    const header = [
      "delivery_date",
      "time_slot",
      "status",
      "qty",
      "rate",
      "amount",
      "subscription_id",
      "delivery_id",
    ];

    const lines = [header.join(",")];

    for (const d of c.rows) {
      const qty = safeNum(d.qty);
      const rate = safeNum(d.rate);
      const amount = qty * rate;

      lines.push(
        [
          (d.delivery_date ?? "").replaceAll(",", " "),
          (d.time_slot ?? "").replaceAll(",", " "),
          (d.status ?? "").replaceAll(",", " "),
          String(d.qty ?? ""),
          String(d.rate ?? ""),
          amount.toFixed(2),
          (d.subscription_id ?? "").replaceAll(",", " "),
          d.id,
        ].join(",")
      );
    }

    const filename = `billing_${(c.name || "customer").replaceAll(" ", "_")}_${from}_to_${to}.csv`;
    downloadTextFile(filename, lines.join("\n"));
    toast({ title: "CSV exported", description: `Downloaded: ${filename}` });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <FarmerSidebar
        activeSection={activeSection}
        onSectionChange={() => {
          window.location.href = "/farmer";
        }}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      <div className={cn("relative p-4 md:p-6 lg:p-8 space-y-6", collapsed ? "ml-[68px]" : "ml-[280px]")}>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-card/90 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(12,207,61,0.12),transparent_28%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-3xl flex items-center justify-center text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND_GREEN}, ${FUTURE_BLUE})`,
                    }}
                  >
                    <Receipt className="h-6 w-6" />
                  </div>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                      Billing
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Futuristic farmer billing powered by deliveries
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-0 bg-emerald-500/15 text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Auto billing active
                  </Badge>

                  <Badge variant="secondary" className="rounded-full">
                    <CalendarDays className="h-3.5 w-3.5 mr-2" />
                    {from} → {to}
                  </Badge>

                  <Badge variant="secondary" className="rounded-full">
                    <Clock3 className="h-3.5 w-3.5 mr-2" />
                    Updated: {fmtTime(lastUpdated)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={loadBilling}
                  disabled={loading}
                >
                  <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={exportAllCSV}
                  disabled={!filtered.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-[28px] border-border/60 bg-card/85 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  className="pl-9 rounded-2xl"
                  placeholder="Search customer / phone / date / status..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input
                    className="rounded-2xl w-[155px]"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input
                    className="rounded-2xl w-[155px]"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-10 rounded-2xl border border-input bg-background px-3 text-sm"
                >
                  <option value="delivered">Delivered only</option>
                  <option value="pending">Pending / in-progress</option>
                  <option value="all">All statuses</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BillingStatCard
            title="Total Amount"
            value={`₹${formatINR(Math.round(totals.amount))}`}
            sub="Σ(qty × rate)"
            icon={IndianRupee}
            accent={BRAND_GREEN}
          />

          <BillingStatCard
            title="Delivered Amount"
            value={`₹${formatINR(Math.round(totals.deliveredAmount))}`}
            sub="Completed billing value"
            icon={CheckCircle2}
            accent={FUTURE_BLUE}
          />

          <BillingStatCard
            title="Pending Amount"
            value={`₹${formatINR(Math.round(totals.pendingAmount))}`}
            sub="Not yet fully delivered"
            icon={AlertCircle}
            accent={FUTURE_AMBER}
          />

          <BillingStatCard
            title="Customers"
            value={String(totals.customers)}
            sub={`${totals.deliveriesCount} deliveries • ${totals.litres.toFixed(1)}L`}
            icon={Users}
            accent={FUTURE_VIOLET}
          />
        </div>

        {/* Micro stats */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="rounded-[28px] border-border/60 bg-card/85 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Billing Source</div>
                  <div className="text-xs text-muted-foreground">
                    Real calculations based on deliveries table
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/60 bg-card/85 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Total Litres</div>
                  <div className="text-xs text-muted-foreground">
                    {totals.litres.toFixed(1)}L across selected range
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/60 bg-card/85 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Status Scope</div>
                  <div className="text-xs text-muted-foreground">
                    {statusFilter === "delivered"
                      ? "Delivered rows only"
                      : statusFilter === "pending"
                      ? "Pending + in-progress rows"
                      : "All delivery statuses"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer list */}
        <Card className="rounded-[32px] border-border/60 bg-card/90 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base text-foreground">Customer Bills</CardTitle>
            <Badge variant="secondary" className="rounded-full">
              {loading ? "Loading..." : `${customerGroups.length} customers`}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-24 w-full rounded-3xl" />
              </div>
            ) : customerGroups.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border p-12 text-center bg-secondary/20">
                <p className="font-semibold text-foreground">No billing data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No deliveries found for selected filters.
                </p>
              </div>
            ) : (
              customerGroups.map((c, idx) => (
                <motion.div
                  key={c.customer_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-5 hover:shadow-sm transition"
                >
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      background:
                        idx === 0
                          ? "radial-gradient(circle at top right, rgba(12,207,61,0.10), transparent 28%)"
                          : "radial-gradient(circle at top right, rgba(59,130,246,0.06), transparent 28%)",
                    }}
                  />

                  <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-foreground truncate">
                          {c.name}
                        </div>

                        {idx === 0 && (
                          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 border-0">
                            Top bill
                          </Badge>
                        )}

                        {c.phone ? (
                          <Badge variant="secondary" className="rounded-full">
                            {c.phone}
                          </Badge>
                        ) : null}

                        {c.email ? (
                          <Badge variant="outline" className="rounded-full">
                            {c.email}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Deliveries</div>
                          <div className="mt-1 font-semibold text-foreground">{c.count}</div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Litres</div>
                          <div className="mt-1 font-semibold text-foreground">{c.litres.toFixed(1)}L</div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Delivered</div>
                          <div className="mt-1 font-semibold text-foreground">{c.deliveredCount}</div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Pending</div>
                          <div className="mt-1 font-semibold text-foreground">{c.pendingCount}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Customer Amount</div>
                        <div className="mt-1 text-2xl font-extrabold text-foreground">
                          ₹{formatINR(Math.round(c.amount))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:justify-end">
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => exportCustomerCSV(c.customer_id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>

                        <Button
                          className="rounded-2xl"
                          onClick={() => openDetails(c.customer_id)}
                          style={{ backgroundColor: BRAND_GREEN, color: "white" }}
                        >
                          View details <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[980px] rounded-[32px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" style={{ color: BRAND_GREEN }} />
                {selected ? `Bill Details — ${selected.name}` : "Bill Details"}
              </DialogTitle>
            </DialogHeader>

            {!selected ? (
              <div className="text-sm text-muted-foreground">No customer selected.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Total Amount</div>
                    <div className="mt-1 text-xl font-bold">₹{formatINR(Math.round(selected.amount))}</div>
                    <div className="text-xs text-muted-foreground mt-1">Σ(qty × rate)</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Total Litres</div>
                    <div className="mt-1 text-xl font-bold">{selected.litres.toFixed(1)}L</div>
                    <div className="text-xs text-muted-foreground mt-1">{selected.count} deliveries</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Contact</div>
                    <div className="mt-1 text-sm font-semibold">{selected.phone || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">{selected.email || "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Status Mix</div>
                    <div className="mt-1 text-sm font-semibold">
                      {selected.deliveredCount} delivered • {selected.pendingCount} pending
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Based on current filter range</div>
                  </div>
                </div>

                <Separator />

                <div className="rounded-2xl border border-border/60 overflow-hidden">
                 <div className="p-4 flex items-center justify-between">
  <div>
    <div className="text-sm font-semibold text-foreground">Delivery Lines</div>
    <div className="text-xs text-muted-foreground">
      Date • shift/time • qty • rate • amount
    </div>
  </div>

  <div className="flex gap-2">

    <Button
      variant="outline"
      className="rounded-2xl"
      onClick={() => exportCustomerCSV(selected.customer_id)}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>

    <Button
      className="rounded-2xl"
      onClick={() => {
        if (!selected) return;

        const items = selected.rows.map((r) => ({
          delivery_date: r.delivery_date,
          time_slot: r.time_slot,
          qty: Number(r.qty || 0),
          rate: Number(r.rate || 0),
          amount: Number(r.qty || 0) * Number(r.rate || 0),
        }));

        generateInvoicePDF(
          `INV-${Date.now()}`,
          selected.name,
          selected.phone,
          selected.email,
          items,
          selected.litres,
          selected.amount
        );
      }}
    >
      Download Invoice
    </Button>

  </div>
</div>

                  <Separator />

                  <div className="max-h-[380px] overflow-auto">
                    <div className="min-w-[820px]">
                      <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-bold text-muted-foreground bg-muted/20">
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Time</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-right">Rate</div>
                        <div className="col-span-2 text-right">Amount</div>
                      </div>

                      {selected.rows.map((d) => {
                        const qty = safeNum(d.qty);
                        const rate = safeNum(d.rate);
                        const amount = qty * rate;

                        return (
                          <div
                            key={d.id}
                            className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-border/60 text-sm"
                          >
                            <div className="col-span-2">{d.delivery_date ?? "—"}</div>
                            <div className="col-span-2">{d.time_slot ?? "—"}</div>
                            <div className="col-span-2">
                              <Badge variant="secondary" className="rounded-full">
                                {(d.status || "—").toString()}
                              </Badge>
                            </div>
                            <div className="col-span-2 text-right font-semibold">{qty.toFixed(1)}</div>
                            <div className="col-span-2 text-right">₹{formatINR(Math.round(rate))}</div>
                            <div className="col-span-2 text-right font-semibold">
                              ₹{formatINR(Math.round(amount))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {statusFilter !== "delivered" ? (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-2xl border border-amber-200 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
                    >
                      Note: You are viewing more than delivered rows. Final business billing is usually based on{" "}
                      <b>Delivered only</b>.
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  setOpen(false);
                  toast({
                    title: "Next step",
                    description:
                      "Next we can add Paid/Unpaid invoice tracking with invoice + payments tables.",
                  });
                }}
                style={{ backgroundColor: BRAND_GREEN, color: "white" }}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}