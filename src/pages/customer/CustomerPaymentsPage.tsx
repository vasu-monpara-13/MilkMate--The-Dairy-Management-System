import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import {
  CreditCard,
  Milk,
  IndianRupee,
  BadgeCheck,
  AlertTriangle,
  RefreshCcw,
  Wallet,
  Sparkles,
  ShoppingBag,
  Clock3,
  Receipt,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentRow = {
  id: string;
  source: "order" | "subscription";
  amount: number | null;
  method: string | null;
  status: string | null;
  provider_payment_id: string | null;
  created_at: string;
  title: string;
  subtitle: string;
};

type OrderPaymentRow = {
  id: string;
  total_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  user_id?: string | null;
};

type DeliveryPaymentRow = {
  id: string;
  customer_id: string | null;
  delivery_date: string | null;
  shift?: string | null;
  time_slot?: string | null;
  qty: number | null;
  rate?: number | null;
  paid: boolean | null;
  paid_at?: string | null;
  created_at?: string | null;
};

function safeNum(v: any, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function formatINR(n: number) {
  try {
    return n.toLocaleString("en-IN");
  } catch {
    return String(n);
  }
}

function prettyDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} • ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function prettyDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeShiftLabel(shift?: string | null, timeSlot?: string | null) {
  const v = String(shift || timeSlot || "").toLowerCase();
  if (v.includes("even")) return "Evening Shift";
  if (v.includes("morn")) return "Morning Shift";
  return shift || timeSlot || "Milk Shift";
}

function normalizeStatus(v?: string | null) {
  const s = String(v || "").toLowerCase().trim();

  if (["success", "paid", "completed"].includes(s)) return "paid";
  if (["failed"].includes(s)) return "failed";
  if (["refunded"].includes(s)) return "refunded";
  return "pending";
}

function statusBadge(status?: string | null) {
  const s = normalizeStatus(status);

  if (s === "paid") {
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        PAID
      </Badge>
    );
  }

  if (s === "failed") {
    return (
      <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">
        FAILED
      </Badge>
    );
  }

  if (s === "refunded") {
    return (
      <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300">
        REFUNDED
      </Badge>
    );
  }

  return <Badge variant="secondary">PENDING</Badge>;
}

function SummaryCard({
  title,
  value,
  sub,
  icon: Icon,
  glow,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  glow: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5 backdrop-blur-xl",
        "border-slate-200/70 bg-white/80 shadow-[0_12px_34px_rgba(15,23,42,0.06)]",
        "dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
      )}
    >
      <div className={cn("absolute inset-x-8 top-0 h-20 rounded-b-full blur-3xl opacity-40", glow)} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{value}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Receipt className="h-6 w-6 text-slate-500 dark:text-slate-300" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

function SourceBadge({ source }: { source: "order" | "subscription" }) {
  const isOrder = source === "order";

  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg",
        isOrder
          ? "bg-gradient-to-br from-amber-500 to-orange-600"
          : "bg-gradient-to-br from-sky-500 to-blue-700"
      )}
    >
      {isOrder ? <ShoppingBag className="h-5 w-5 text-white" /> : <Milk className="h-5 w-5 text-white" />}
    </div>
  );
}

export default function CustomerPaymentsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paymentsSource, setPaymentsSource] = useState<"payments" | "orders+deliveries">("orders+deliveries");

  const fetchPayments = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const sb: any = supabase;

    try {
      const payRes = await sb
        .from("payments")
        .select("id, amount, method, status, provider_payment_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!payRes.error && Array.isArray(payRes.data) && payRes.data.length > 0) {
        const mapped: PaymentRow[] = (payRes.data ?? []).map((p: any) => ({
          id: `payment-${p.id}`,
          source: "order",
          amount: p.amount,
          method: p.method,
          status: p.status,
          provider_payment_id: p.provider_payment_id,
          created_at: p.created_at,
          title: `Payment #${String(p.id).slice(0, 8)}`,
          subtitle: "Recorded from payments table",
        }));

        setRows(mapped);
        setPaymentsSource("payments");
        setLoading(false);
        return;
      }

      const [ordRes, deliveryRes] = await Promise.all([
        sb
          .from("orders")
          .select("id,total_amount,payment_method,payment_status,razorpay_payment_id,created_at,user_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        sb
          .from("deliveries")
          .select("id,customer_id,delivery_date,shift,time_slot,qty,rate,paid,paid_at,created_at")
          .eq("customer_id", user.id)
          .eq("paid", true)
          .order("paid_at", { ascending: false }),
      ]);

      if (ordRes.error || deliveryRes.error) {
        throw new Error(ordRes.error?.message || deliveryRes.error?.message || "Failed to load payments");
      }

      const orderRows: PaymentRow[] = ((ordRes.data ?? []) as OrderPaymentRow[]).map((o) => ({
        id: `order-${o.id}`,
        source: "order",
        amount: o.total_amount,
        method: o.payment_method,
        status: o.payment_status,
        provider_payment_id: o.razorpay_payment_id,
        created_at: o.created_at,
        title: `Order Payment #${String(o.id).slice(0, 8)}`,
        subtitle: `Store order • ${prettyDate(o.created_at)}`,
      }));

      const subscriptionRows: PaymentRow[] = ((deliveryRes.data ?? []) as DeliveryPaymentRow[]).map((d) => ({
        id: `delivery-${d.id}`,
        source: "subscription",
        amount: safeNum(d.qty) * safeNum(d.rate),
        method: "razorpay",
        status: d.paid ? "paid" : "pending",
        provider_payment_id: d.id,
        created_at: d.paid_at || d.created_at || d.delivery_date || new Date().toISOString(),
        title: `Milk Bill #${String(d.id).slice(0, 8)}`,
        subtitle: `${normalizeShiftLabel(d.shift, d.time_slot)} • ${safeNum(d.qty)}L • ${prettyDate(
          d.delivery_date
        )}`,
      }));

      const merged = [...orderRows, ...subscriptionRows].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
      });

      setRows(merged);
      setPaymentsSource("orders+deliveries");
    } catch (e: any) {
      setError(e?.message || "Failed to load payments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.id || !mounted) return;
      await fetchPayments();
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const summary = useMemo(() => {
    const paidRows = rows.filter((r) => normalizeStatus(r.status) === "paid");
    const failedRows = rows.filter((r) => normalizeStatus(r.status) === "failed");
    const refundedRows = rows.filter((r) => normalizeStatus(r.status) === "refunded");

    return {
      totalCount: rows.length,
      totalAmount: rows.reduce((a, r) => a + safeNum(r.amount), 0),
      paidAmount: paidRows.reduce((a, r) => a + safeNum(r.amount), 0),
      failedAmount: failedRows.reduce((a, r) => a + safeNum(r.amount), 0),
      refundedAmount: refundedRows.reduce((a, r) => a + safeNum(r.amount), 0),
    };
  }, [rows]);

  const successRows = rows.filter((r) => normalizeStatus(r.status) === "paid");
  const failedRows = rows.filter((r) => normalizeStatus(r.status) === "failed");
  const refundedRows = rows.filter((r) => normalizeStatus(r.status) === "refunded");

  const renderList = (list: PaymentRow[]) => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-[24px]" />
          <Skeleton className="h-28 w-full rounded-[24px]" />
          <Skeleton className="h-28 w-full rounded-[24px]" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      );
    }

    if (!list.length) {
      return (
        <EmptyState
          title="No payments found"
          sub="Your successful, failed, or refunded transactions will appear here."
        />
      );
    }

    return (
      <div className="space-y-4">
        {list.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "overflow-hidden rounded-[28px] border backdrop-blur-xl",
              "border-slate-200/70 bg-white/80 shadow-[0_12px_34px_rgba(15,23,42,0.06)]",
              "dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
            )}
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <SourceBadge source={p.source} />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-black text-slate-900 dark:text-slate-100">
                        {p.title}
                      </h3>
                      {statusBadge(p.status)}
                    </div>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.subtitle}</p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Method:{" "}
                        <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                          {p.method || "—"}
                        </span>
                      </span>

                      <span>
                        Date:{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {prettyDateTime(p.created_at)}
                        </span>
                      </span>

                      {p.provider_payment_id ? (
                        <span>
                          Ref:{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {String(p.provider_payment_id).slice(0, 12)}...
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-right dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Amount
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                    ₹{formatINR(safeNum(p.amount))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#edf5ff_0%,#f7f7ff_42%,#fff4fb_100%)] p-4 md:p-6 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f1630_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 h-[22rem] w-[22rem] rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-12 right-[-5rem] h-[24rem] w-[24rem] rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-[-8rem] left-[25%] h-[22rem] w-[22rem] rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
      </div>

      <div className="relative space-y-6">
        <Card className="overflow-hidden rounded-[34px] border-slate-200/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
          <CardHeader className="border-b border-slate-200/70 bg-white/45 dark:border-slate-700/70 dark:bg-slate-900/55">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Payments Workspace
                </div>

                <CardTitle className="mt-4 text-[30px] font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Payments History
                </CardTitle>

                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Orders + milk bill payments in one premium history center.
                  {paymentsSource === "orders+deliveries" ? " (Using orders + deliveries source)" : " (Using payments table)"}
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800"
                onClick={fetchPayments}
                disabled={loading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total Transactions"
                value={loading ? "—" : String(summary.totalCount)}
                sub="All payment entries"
                icon={CreditCard}
                glow="bg-sky-300/40 dark:bg-sky-500/15"
              />

              <SummaryCard
                title="Paid Amount"
                value={loading ? "—" : `₹${formatINR(Math.round(summary.paidAmount))}`}
                sub="Successful collections"
                icon={BadgeCheck}
                glow="bg-emerald-300/40 dark:bg-emerald-500/15"
              />

              <SummaryCard
                title="Failed Amount"
                value={loading ? "—" : `₹${formatINR(Math.round(summary.failedAmount))}`}
                sub="Failed transactions"
                icon={AlertTriangle}
                glow="bg-rose-300/40 dark:bg-rose-500/15"
              />

              <SummaryCard
                title="Total Value"
                value={loading ? "—" : `₹${formatINR(Math.round(summary.totalAmount))}`}
                sub="Payments history total"
                icon={Wallet}
                glow="bg-violet-300/40 dark:bg-violet-500/15"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-5">
          <TabsList className="grid h-auto w-full max-w-4xl grid-cols-2 gap-2 rounded-2xl bg-white/75 p-2 backdrop-blur-xl md:grid-cols-4 dark:bg-slate-900/75">
            <TabsTrigger value="all" className="rounded-xl">
              All
            </TabsTrigger>
            <TabsTrigger value="success" className="rounded-xl">
              Success
            </TabsTrigger>
            <TabsTrigger value="failed" className="rounded-xl">
              Failed
            </TabsTrigger>
            <TabsTrigger value="refunded" className="rounded-xl">
              Refunded
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderList(rows)}</TabsContent>
          <TabsContent value="success">{renderList(successRows)}</TabsContent>
          <TabsContent value="failed">{renderList(failedRows)}</TabsContent>
          <TabsContent value="refunded">{renderList(refundedRows)}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}