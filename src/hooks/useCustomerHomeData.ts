import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type HomeNotification = {
  id: string;
  title: string;
  sub?: string | null;
  createdAt: string;
  type: "info" | "warning" | "success" | "muted";
};

type SubscriptionRow = {
  id: string;
  customer_id: string;
  farmer_id: string | null;
  product_id: string | null;
  qty: number | null;
  rate?: number | null;
  status: string | null;

  shift?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  time_slot?: string | null;
  created_at?: string | null;

  milk_label?: string | null;
  breed?: string | null;
  animal_type?: string | null;
  plan_mode?: string | null;
  weekly_qty?: any | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
};

type DeliveryRow = {
  id: string;
  customer_id: string | null;
  farmer_id: string | null;
  subscription_id: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  shift?: string | null;
  status: string | null;
  qty: number | null;
  rate?: number | null;
  paid?: boolean | null;
  paid_at?: string | null;
  created_at?: string | null;
  order_id?: string | null;
};

type OrderRow = {
  id: string;
  user_id?: string | null;
  total_amount: number | null;
  payment_status: string | null;
  status: string | null;
  created_at: string | null;
};

export type CustomerHomeData = {
  loading: boolean;
  subscription: {
    row: SubscriptionRow;
    product: ProductRow | null;
    farmerName: string | null;
  } | null;
  subscriptions: Array<{
    row: SubscriptionRow;
    product: ProductRow | null;
    farmerName: string | null;
  }>;
  todayDelivery: DeliveryRow | null;
  todayDeliveries: DeliveryRow[];
  weekly: Array<{ date: string; litres: number }>;
  weeklyBySubId: Record<string, Array<{ date: string; litres: number }>>;
  notifications: HomeNotification[];
  stats: {
    todayLitres: number;
    todayShiftLabel: string;
    monthSpend: number;
    monthLabel: string;
    pendingBill: number;
    loyaltyPoints: number;
  };
};

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toLocalISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateInRange(dateISO: string, startISO?: string | null, endISO?: string | null) {
  if (!startISO) return true;
  const d = dateISO;
  const s = String(startISO).slice(0, 10);
  const e = endISO ? String(endISO).slice(0, 10) : null;
  if (d < s) return false;
  if (e && d > e) return false;
  return true;
}

function parseWeeklyQty(raw: any): Record<string, number> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

function isScheduledOnDate(
  dateISO: string,
  opts: {
    start_date?: string | null;
    end_date?: string | null;
    frequency?: string | null;
    plan_mode?: string | null;
    weekly_qty?: any | null;
    qty?: number | null;
  }
) {
  if (!isDateInRange(dateISO, opts.start_date, opts.end_date)) return false;

  const planMode = String(opts.plan_mode || "").toLowerCase();
  const weeklyObj = parseWeeklyQty(opts.weekly_qty);

  if (planMode === "weekly" && weeklyObj) {
    const day = new Date(`${dateISO}T00:00:00`).getDay();
    const key =
      day === 1
        ? "mon"
        : day === 2
        ? "tue"
        : day === 3
        ? "wed"
        : day === 4
        ? "thu"
        : day === 5
        ? "fri"
        : day === 6
        ? "sat"
        : "sun";

    return safeNum(weeklyObj[key]) > 0;
  }

  return true;
}

function litresForDate(dateISO: string, row: SubscriptionRow): number {
  const actualQty = safeNum(row.qty);
  const weeklyObj = parseWeeklyQty(row.weekly_qty);
  const planMode = String(row.plan_mode || "").toLowerCase();

  if (planMode === "weekly" && weeklyObj) {
    const day = new Date(`${dateISO}T00:00:00`).getDay();
    const key =
      day === 1
        ? "mon"
        : day === 2
        ? "tue"
        : day === 3
        ? "wed"
        : day === 4
        ? "thu"
        : day === 5
        ? "fri"
        : day === 6
        ? "sat"
        : "sun";

    return safeNum(weeklyObj[key]);
  }

  return actualQty;
}

function shiftLabelFromSubscription(shift?: string | null) {
  const s = String(shift || "").toLowerCase();
  if (s.includes("even")) return "Evening Shift";
  return "Morning Shift";
}

function deliveryStatusRank(status?: string | null) {
  const v = String(status || "").toLowerCase().trim();

  if (v === "delivered") return 3;
  if (v === "out_for_delivery") return 2;
  if (v === "scheduled") return 1;
  return 0;
}

function pickBestDeliveryRow(rows: DeliveryRow[]) {
  if (!rows.length) return [];

  const map = new Map<string, DeliveryRow>();

  for (const row of rows) {
    const subId = String(row.subscription_id || "");
    if (!subId) continue;

    const prev = map.get(subId);

    if (!prev) {
      map.set(subId, row);
      continue;
    }

    const prevRank = deliveryStatusRank(prev.status);
    const nextRank = deliveryStatusRank(row.status);

    if (nextRank > prevRank) {
      map.set(subId, row);
      continue;
    }

    if (nextRank === prevRank) {
      const prevTime = prev.created_at ? new Date(prev.created_at).getTime() : 0;
      const nextTime = row.created_at ? new Date(row.created_at).getTime() : 0;

      if (nextTime > prevTime) {
        map.set(subId, row);
      }
    }
  }

  return Array.from(map.values());
}

function getThisWeekMonToSun() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const mon = new Date(today);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push(toLocalISODate(d));
  }

  return dates;
}

function normalizeOrderPaymentStatus(v?: string | null) {
  const s = String(v || "").toLowerCase().trim();

  if (["paid", "success", "completed"].includes(s)) return "paid";
  if (["cancelled", "canceled", "refunded"].includes(s)) return "closed";
  if (["failed"].includes(s)) return "pending";

  return "pending";
}

async function fetchOrdersForUser(userId: string) {
  const sb: any = supabase;

  const res = await sb
    .from("orders")
    .select("id,user_id,total_amount,payment_status,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (res.error) {
    return {
      rows: [] as OrderRow[],
      error: res.error.message || "Failed to load orders",
    };
  }

  return {
    rows: (res.data ?? []) as OrderRow[],
    error: null as any,
  };
}

async function fetchDeliveriesForCustomer(customerId: string) {
  const sb: any = supabase;

  const res = await sb
    .from("deliveries")
    .select(
      "id,customer_id,farmer_id,subscription_id,delivery_date,time_slot,shift,status,qty,rate,paid,paid_at,created_at,order_id"
    )
    .eq("customer_id", customerId)
    .order("delivery_date", { ascending: false });

  if (res.error) {
    return {
      rows: [] as DeliveryRow[],
      error: res.error.message || "Failed to load deliveries",
    };
  }

  return {
    rows: (res.data ?? []) as DeliveryRow[],
    error: null as any,
  };
}

async function fetchLoyaltyPoints(userId: string) {
  const sb: any = supabase;

  const r1 = await sb.from("loyalty_points").select("points").eq("user_id", userId).maybeSingle();
  if (!r1.error) return safeNum(r1.data?.points);

  const r2 = await sb.from("loyalty_points").select("points").eq("customer_id", userId).maybeSingle();
  if (!r2.error) return safeNum(r2.data?.points);

  return 0;
}

export function useCustomerHomeData(customerId?: string | null): CustomerHomeData {
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<CustomerHomeData["subscription"]>(null);
  const [subscriptions, setSubscriptions] = useState<CustomerHomeData["subscriptions"]>([]);
  const [todayDelivery, setTodayDelivery] = useState<DeliveryRow | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<DeliveryRow[]>([]);
  const [weekly, setWeekly] = useState<Array<{ date: string; litres: number }>>([]);
  const [weeklyBySubId, setWeeklyBySubId] = useState<
    Record<string, Array<{ date: string; litres: number }>>
  >({});
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);
  const [todayLitres, setTodayLitres] = useState(0);
  const [todayShiftLabel, setTodayShiftLabel] = useState("Morning Shift");
  const [monthSpend, setMonthSpend] = useState(0);
  const [pendingBill, setPendingBill] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleString(undefined, { month: "short", year: "numeric" });
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!customerId) {
        if (!mounted) return;
        setLoading(false);
        setSubscription(null);
        setSubscriptions([]);
        setTodayDelivery(null);
        setTodayDeliveries([]);
        setWeekly([]);
        setWeeklyBySubId({});
        setNotifications([]);
        setTodayLitres(0);
        setTodayShiftLabel("Morning Shift");
        setMonthSpend(0);
        setPendingBill(0);
        setLoyaltyPoints(0);
        return;
      }

      try {
        setLoading(true);

        const { data: subRowsRaw, error: subErr } = await (supabase as any)
          .from("customer_subscriptions")
          .select("*")
          .eq("customer_id", customerId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (subErr) throw subErr;

        const subRows: SubscriptionRow[] = (Array.isArray(subRowsRaw) ? subRowsRaw : []) as any;
        const enriched: CustomerHomeData["subscriptions"] = [];

        for (const row of subRows) {
          let product: ProductRow | null = null;

          if (row.product_id) {
            const { data: prodRaw } = await (supabase as any)
              .from("products")
              .select("id,name,price,unit,image_url")
              .eq("id", row.product_id)
              .maybeSingle();

            if (prodRaw) product = prodRaw as any;
          }

          if (!product && row.milk_label) {
            product = {
              id: "",
              name: row.milk_label,
              price: null,
              unit: "L",
              image_url: null,
            };
          }

          let farmerName: string | null = null;

          if (row.farmer_id) {
            const { data: p1 } = await (supabase as any)
              .from("profiles")
              .select("full_name")
              .eq("user_id", row.farmer_id)
              .maybeSingle();

            farmerName = (p1 as any)?.full_name ?? null;

            if (!farmerName) {
              const { data: p2 } = await (supabase as any)
                .from("profiles")
                .select("full_name")
                .eq("id", row.farmer_id)
                .maybeSingle();

              farmerName = (p2 as any)?.full_name ?? null;
            }
          }

          enriched.push({ row, product, farmerName });
        }

        if (!mounted) return;

        setSubscriptions(enriched);
        setSubscription(enriched[0] ?? null);

        const todayISO = toLocalISODate(new Date());

        const { data: todayRaw } = await (supabase as any)
          .from("deliveries")
          .select(
            "id,customer_id,farmer_id,subscription_id,delivery_date,time_slot,shift,status,qty,rate,paid,paid_at,created_at,order_id"
          )
          .eq("customer_id", customerId)
          .eq("delivery_date", todayISO)
          .order("created_at", { ascending: false });

        const todayRows: DeliveryRow[] = (Array.isArray(todayRaw) ? todayRaw : []) as any;
const activeSubIds = new Set(enriched.map((x) => x.row.id));

const rawTodayRowsForActiveSubs = todayRows.filter((r) =>
  activeSubIds.has(String(r.subscription_id || ""))
);

const todayRowsForActiveSubs = pickBestDeliveryRow(rawTodayRowsForActiveSubs);

const actualTodayLitres = todayRowsForActiveSubs
  .filter((r) => String(r.status || "").toLowerCase() === "delivered")
  .reduce((s, r) => s + safeNum(r.qty), 0);

        const fallbackTodayLitres = enriched.reduce((sum, x) => {
          if (
            isScheduledOnDate(todayISO, {
              start_date: x.row.start_date,
              end_date: x.row.end_date,
              frequency: x.row.frequency,
              plan_mode: x.row.plan_mode,
              weekly_qty: x.row.weekly_qty,
              qty: x.row.qty,
            })
          ) {
            return sum + litresForDate(todayISO, x.row);
          }
          return sum;
        }, 0);

        const resolvedTodayLitres =
          todayRowsForActiveSubs.length > 0 && actualTodayLitres > 0
            ? actualTodayLitres
            : fallbackTodayLitres;

        setTodayDelivery(todayRowsForActiveSubs[0] ?? null);
        setTodayDeliveries(todayRowsForActiveSubs);
        setTodayLitres(resolvedTodayLitres);
        setTodayShiftLabel(
          todayRowsForActiveSubs[0]?.shift
            ? shiftLabelFromSubscription(todayRowsForActiveSubs[0]?.shift)
            : shiftLabelFromSubscription(enriched[0]?.row?.shift)
        );

        const weekDates = getThisWeekMonToSun();
        const weekStart = weekDates[0];
        const weekEnd = weekDates[6];
        const outBySub: Record<string, Array<{ date: string; litres: number }>> = {};

        for (const h of enriched) {
          const subId = h.row.id;

          const { data: wRaw } = await (supabase as any)
            .from("deliveries")
            .select("delivery_date,qty,status")
            .eq("customer_id", customerId)
            .eq("subscription_id", subId)
            .eq("status", "delivered")
            .gte("delivery_date", weekStart)
            .lte("delivery_date", weekEnd);

         const rows = (Array.isArray(wRaw) ? wRaw : []) as Array<{
            delivery_date: any;
            qty: any;
            status: any;
          }>;

          const m = new Map<string, number>();
          for (const d of weekDates) m.set(d, 0);

          for (const r of rows) {
            const key = String(r.delivery_date || "").slice(0, 10);
            if (!m.has(key)) continue;
            m.set(key, (m.get(key) || 0) + safeNum(r.qty));
          }

          const todayISO = toLocalISODate(new Date());

            outBySub[subId] = weekDates.map((d) => {

              const actual = m.get(d) || 0;

              // FUTURE DAY → always 0
              if (d > todayISO) {
                return { date: d, litres: 0 };
              }

              // PAST or TODAY
              if (actual > 0) {
                return { date: d, litres: actual };
              }

              // delivered nahi hua
              return { date: d, litres: 0 };

            });
        }

        setWeeklyBySubId(outBySub);
        setWeekly(
          outBySub[enriched[0]?.row?.id || ""] ||
            weekDates.map((d) => ({ date: d, litres: 0 }))
        );

        const first = new Date();
        first.setDate(1);
        first.setHours(0, 0, 0, 0);
        const firstOfMonthISO = first.toISOString();

        const { rows: allOrders, error: ordersErr } = await fetchOrdersForUser(customerId);
        const { rows: allDeliveries, error: deliveriesErr } = await fetchDeliveriesForCustomer(
          customerId
        );

        let paidOrdersThisMonth = 0;
        if (!ordersErr) {
          paidOrdersThisMonth = allOrders
            .filter((o) => {
              const created = o.created_at ? new Date(o.created_at).toISOString() : "";
              return created >= firstOfMonthISO;
            })
            .filter((o) => normalizeOrderPaymentStatus(o.payment_status) === "paid")
            .reduce((s, o) => s + safeNum(o.total_amount), 0);
        }

        let paidMilkBillsThisMonth = 0;
        if (!deliveriesErr) {
          paidMilkBillsThisMonth = allDeliveries
            .filter((d) => String(d.delivery_date || "").slice(0, 7) === todayISO.slice(0, 7))
            .filter((d) => String(d.status || "").toLowerCase() === "delivered")
            .filter((d) => d.paid === true)
            .reduce((s, d) => s + safeNum(d.qty) * safeNum(d.rate), 0);
        }

        let pendingOrdersAll = 0;
        if (!ordersErr) {
          pendingOrdersAll = allOrders
            .filter((o) => normalizeOrderPaymentStatus(o.payment_status) === "pending")
            .reduce((s, o) => s + safeNum(o.total_amount), 0);
        }

        let pendingMilkBillsAll = 0;
        if (!deliveriesErr) {
          pendingMilkBillsAll = allDeliveries
            .filter((d) => String(d.delivery_date || "").slice(0, 10) <= todayISO)
            .filter((d) => String(d.status || "").toLowerCase() === "delivered")
            .filter((d) => d.paid === false)
            .reduce((s, d) => s + safeNum(d.qty) * safeNum(d.rate), 0);
        }

        setMonthSpend(Math.round(paidOrdersThisMonth + paidMilkBillsThisMonth));
        setPendingBill(Math.round(pendingOrdersAll + pendingMilkBillsAll));

        const lp = await fetchLoyaltyPoints(customerId);
        setLoyaltyPoints(lp);

        const { data: notifRaw } = await (supabase as any)
          .from("notifications")
          .select("id,title,body,type,created_at")
          .eq("user_id", customerId)
          .order("created_at", { ascending: false })
          .limit(6);

        const notifRows = (Array.isArray(notifRaw) ? notifRaw : []) as any[];

        const mappedNotifs: HomeNotification[] =
          notifRows.length > 0
            ? notifRows.map((n) => ({
                id: String(n.id),
                title: String(n.title || "Notification"),
                sub: n.body ?? null,
                createdAt: String(n.created_at || new Date().toISOString()),
                type:
                  String(n.type || "").includes("success")
                    ? "success"
                    : String(n.type || "").includes("warning")
                    ? "warning"
                    : "info",
              }))
            : [
                {
                  id: "fallback-sub",
                  title: enriched.length > 0 ? "Subscription active" : "No active subscription",
                  sub:
                    enriched.length > 0
                      ? "Your dashboard is ready."
                      : "Start a plan to enable deliveries.",
                  createdAt: new Date().toISOString(),
                  type: enriched.length > 0 ? "success" : "warning",
                },
              ];

        if (!mounted) return;
        setNotifications(mappedNotifs);
        setLoading(false);
      } catch (e: any) {
        console.error("useCustomerHomeData error:", e?.message ?? e);

        if (!mounted) return;

        setLoading(false);
        setSubscription(null);
        setSubscriptions([]);
        setTodayDelivery(null);
        setTodayDeliveries([]);
        setWeekly([]);
        setWeeklyBySubId({});
        setTodayLitres(0);
        setTodayShiftLabel("Morning Shift");
        setMonthSpend(0);
        setPendingBill(0);
        setLoyaltyPoints(0);
        setNotifications([
          {
            id: "err",
            title: "Dashboard data failed to load",
            sub: e?.message ?? "Unknown error",
            createdAt: new Date().toISOString(),
            type: "warning",
          },
        ]);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [customerId]);

  return {
    loading,
    subscription,
    subscriptions,
    todayDelivery,
    todayDeliveries,
    weekly,
    weeklyBySubId,
    notifications,
    stats: {
      todayLitres,
      todayShiftLabel,
      monthSpend,
      monthLabel,
      pendingBill,
      loyaltyPoints,
    },
  };
}