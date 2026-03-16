// src/pages/customer/ModifyPlanPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  Sparkles,
  CalendarDays,
  Droplets,
  Sun,
  Clock3,
  Layers3,
  ChevronRight,
  ShieldCheck,
  Trash2,
  RotateCcw,
  Save,
} from "lucide-react";

type PlanMode = "fixed" | "weekly";

type SubRow = {
  id: string;
  customer_id: string;
  farmer_id: string | null;
  product_id: string | null;
  qty: number | null;
  weekly_qty: any | null;
  status: string | null;
  shift: string | null;
  plan_mode: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at?: string | null;
  created_at?: string | null;

  milk_label?: string | null;
  breed?: string | null;
  animal_type?: string | null;

  products?: {
    id?: string | null;
    name: string | null;
    image_url?: string | null;
  } | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
};

function isoDate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtINR(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}

function safeUrl(url?: string | null) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function parseWeeklyQtyObject(raw: any): Record<string, number> {
  if (!raw) {
    return {
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0,
    };
  }

  if (typeof raw === "object") {
    return {
      mon: safeNum(raw.mon),
      tue: safeNum(raw.tue),
      wed: safeNum(raw.wed),
      thu: safeNum(raw.thu),
      fri: safeNum(raw.fri),
      sat: safeNum(raw.sat),
      sun: safeNum(raw.sun),
    };
  }

  if (typeof raw === "string") {
    try {
      const obj = JSON.parse(raw);
      return {
        mon: safeNum(obj?.mon),
        tue: safeNum(obj?.tue),
        wed: safeNum(obj?.wed),
        thu: safeNum(obj?.thu),
        fri: safeNum(obj?.fri),
        sat: safeNum(obj?.sat),
        sun: safeNum(obj?.sun),
      };
    } catch {
      return {
        mon: 0,
        tue: 0,
        wed: 0,
        thu: 0,
        fri: 0,
        sat: 0,
        sun: 0,
      };
    }
  }

  return {
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
    sun: 0,
  };
}

function weekdayKeyFromDate(dateISO: string) {
  const day = new Date(`${dateISO}T00:00:00`).getDay();
  if (day === 1) return "mon";
  if (day === 2) return "tue";
  if (day === 3) return "wed";
  if (day === 4) return "thu";
  if (day === 5) return "fri";
  if (day === 6) return "sat";
  return "sun";
}

function buildDeliveryDates(
  startISO: string,
  endISO: string,
  planMode: PlanMode,
  qty: number,
  weekly: Record<string, number>
) {
  const rows: Array<{ delivery_date: string; qty: number }> = [];

  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoDate(d);

    if (planMode === "fixed") {
      if (qty > 0) {
        rows.push({
          delivery_date: iso,
          qty: safeNum(qty),
        });
      }
      continue;
    }

    const key = weekdayKeyFromDate(iso);
    const litres = safeNum(weekly[key]);
    if (litres > 0) {
      rows.push({
        delivery_date: iso,
        qty: litres,
      });
    }
  }

  return rows;
}

function parseShiftAndTime(rawShift?: string | null) {
  const raw = String(rawShift || "").trim();
  const lower = raw.toLowerCase();
  const base: "morning" | "evening" = lower.includes("even") ? "evening" : "morning";
  const parts = raw.split("@");
  const time = parts.length > 1 ? String(parts[1] || "").trim().slice(0, 5) : "";
  return { shift: base, time };
}

function buildShiftWithTime(shift: "morning" | "evening", time: string) {
  const t = String(time || "").trim().slice(0, 5);
  if (!t) return shift;
  return `${shift}@${t}`;
}

function parseWeeklyQty(raw: any): Record<string, number> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") return obj;
    } catch {
      return null;
    }
  }
  return null;
}

function useQueryParam(name: string) {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search).get(name), [loc.search, name]);
}

function buildMilkLabelFromSub(sub?: SubRow | null) {
  const breed = String(sub?.breed || "").trim();
  const animalType = String(sub?.animal_type || "").trim().toLowerCase();

  if (!breed) return "";

  if (animalType === "buffalo") return `${breed} Buffalo Milk`;
  if (animalType === "cow") return `${breed} Cow Milk`;

  return `${breed} Milk`;
}

function getSubDisplayName(sub?: any, product?: any) {
  if (product?.name) return product.name;

  if (sub?.milk_label) return sub.milk_label;

  if (sub?.breed && sub?.animal_type) {
    const animalType = String(sub.animal_type).toLowerCase();
    return `${sub.breed} ${animalType === "buffalo" ? "Buffalo" : "Cow"} Milk`;
  }

  if (sub?.breed) return `${sub.breed} Milk`;

  return `Subscription #${sub?.id?.slice(0, 6)}`;
}

function getRateText(product?: ProductRow | null) {
  if (product?.price != null && safeNum(product.price) > 0) {
    return `₹${fmtINR(Number(product.price))} / ${product?.unit ?? "L"}`;
  }
  return "Daily rate applies";
}

function getShiftLabel(shift: "morning" | "evening") {
  return shift === "evening" ? "Evening Shift" : "Morning Shift";
}

export default function ModifyPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedFromUrl = useQueryParam("subId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [subs, setSubs] = useState<SubRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [product, setProduct] = useState<ProductRow | null>(null);

  const [planMode, setPlanMode] = useState<PlanMode>("fixed");
  const [qty, setQty] = useState<number>(2);
  const [weekly, setWeekly] = useState<Record<string, number>>({
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
    sun: 0,
  });

  const [shiftSlot, setShiftSlot] = useState<"morning" | "evening">("morning");
  const [deliveryTime, setDeliveryTime] = useState<string>("06:30");

  const [effectiveFrom, setEffectiveFrom] = useState<string>(isoDate(new Date()));
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>("");

  const initialRef = useRef<any>(null);

  const weeklyTotal = useMemo(() => {
    if (planMode === "fixed") return safeNum(qty) * 7;
    return DAYS.reduce((s, d) => s + safeNum(weekly[d.key]), 0);
  }, [planMode, qty, weekly]);

  const currentDisplayName = useMemo(() => getSubDisplayName(sub, sub?.products),[sub]);
  const currentRateText = useMemo(() => getRateText(product), [product]);
  const previewShiftLabel = useMemo(() => getShiftLabel(shiftSlot), [shiftSlot]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!user?.id) return;

      setLoading(true);
      setErr(null);

      try {
        const sb: any = supabase;

        const { data, error } = await sb
  .from("customer_subscriptions")
  .select(`
    *,
    products:products!customer_subscriptions_product_fk (
      id,
      name,
      image_url
    )
  `)
  .eq("customer_id", user.id)
  .eq("status", "active")
  .order("created_at", { ascending: false });

        if (error) throw error;

        const rows = (data || []) as SubRow[];

        if (!mounted) return;

        setSubs(rows);

        const urlId = selectedFromUrl ? String(selectedFromUrl) : null;
        const picked =
          (urlId && rows.find((r) => r.id === urlId)) ||
          rows[0] ||
          null;

        if (!picked) {
          setSub(null);
          setSelectedId(null);
          setLoading(false);
          navigate("/customer/subscription?new=1", { replace: true });
          return;
        }

        setSelectedId(picked.id);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.message ?? "Failed to load subscriptions");
        setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [user?.id, navigate, selectedFromUrl]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!user?.id || !selectedId) return;

      setLoading(true);
      setErr(null);

      try {
        const sb: any = supabase;

        const selected = subs.find((r) => r.id === selectedId) || null;
        if (!selected) {
          setLoading(false);
          return;
        }

        if (!mounted) return;

        setSub(selected);
        navigate(`/customer/modify-plan?subId=${encodeURIComponent(selected.id)}`, { replace: true });

        if (selected.product_id) {
          const { data: prod } = await sb
            .from("products")
            .select("id,name,price,unit,image_url")
            .eq("id", selected.product_id)
            .maybeSingle();

          if (!mounted) return;
          setProduct((prod as any) ?? null);
        } else {
          setProduct(null);
        }

        const mode =
          String(selected.plan_mode || "fixed").toLowerCase() === "weekly" ? "weekly" : "fixed";
        setPlanMode(mode);

        const baseQty = safeNum(selected.qty, 2);
        setQty(baseQty);

        const weeklyObj = parseWeeklyQty(selected.weekly_qty);

        setWeekly({
          mon: safeNum(weeklyObj?.mon, mode === "fixed" ? baseQty : 0),
          tue: safeNum(weeklyObj?.tue, mode === "fixed" ? baseQty : 0),
          wed: safeNum(weeklyObj?.wed, mode === "fixed" ? baseQty : 0),
          thu: safeNum(weeklyObj?.thu, mode === "fixed" ? baseQty : 0),
          fri: safeNum(weeklyObj?.fri, mode === "fixed" ? baseQty : 0),
          sat: safeNum(weeklyObj?.sat, mode === "fixed" ? baseQty : 0),
          sun: safeNum(weeklyObj?.sun, mode === "fixed" ? baseQty : 0),
        });

        const st = parseShiftAndTime(selected.shift);
        setShiftSlot(st.shift);
        setDeliveryTime(st.time || (st.shift === "morning" ? "06:30" : "18:30"));

        setEffectiveFrom(String(selected.start_date || isoDate(new Date())).slice(0, 10));
        const hasEnd = !!selected.end_date;
        setHasEndDate(hasEnd);
        setEndDate(hasEnd ? String(selected.end_date).slice(0, 10) : "");

        initialRef.current = {
          planMode: mode,
          qty: baseQty,
          weekly: {
            mon: safeNum(weeklyObj?.mon, 0),
            tue: safeNum(weeklyObj?.tue, 0),
            wed: safeNum(weeklyObj?.wed, 0),
            thu: safeNum(weeklyObj?.thu, 0),
            fri: safeNum(weeklyObj?.fri, 0),
            sat: safeNum(weeklyObj?.sat, 0),
            sun: safeNum(weeklyObj?.sun, 0),
          },
          shiftSlot: st.shift,
          deliveryTime: st.time || (st.shift === "morning" ? "06:30" : "18:30"),
          effectiveFrom: String(selected.start_date || isoDate(new Date())).slice(0, 10),
          hasEndDate: hasEnd,
          endDate: hasEnd ? String(selected.end_date).slice(0, 10) : "",
        };

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.message ?? "Failed to load selected subscription");
        setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [selectedId, subs, navigate, user?.id]);

  const regenerateFutureDeliveries = async (subscriptionId: string, payload: any) => {
    const sb: any = supabase;

    const todayISO = isoDate(new Date());
    const rangeStart = payload.start_date > todayISO ? payload.start_date : todayISO;

    const rangeEnd =
      payload.end_date && String(payload.end_date).trim()
        ? String(payload.end_date).slice(0, 10)
        : isoDate(new Date(Date.now() + 6 * 86400000)); // next 30 days

    if (rangeEnd < rangeStart) return;

    // 1) delete only future deliveries for this subscription
    const { error: deleteErr } = await sb
      .from("deliveries")
      .delete()
      .eq("subscription_id", subscriptionId)
      .gte("delivery_date", rangeStart);

    if (deleteErr) throw deleteErr;

    const weeklyObj =
      payload.plan_mode === "weekly"
        ? parseWeeklyQtyObject(payload.weekly_qty)
        : {
            mon: safeNum(payload.qty),
            tue: safeNum(payload.qty),
            wed: safeNum(payload.qty),
            thu: safeNum(payload.qty),
            fri: safeNum(payload.qty),
            sat: safeNum(payload.qty),
            sun: safeNum(payload.qty),
          };

    const deliveryRows = buildDeliveryDates(
      rangeStart,
      rangeEnd,
      payload.plan_mode,
      safeNum(payload.qty),
      weeklyObj
    );

    if (deliveryRows.length === 0) return;

    const insertPayload = deliveryRows.map((r) => ({
      farmer_id: sub?.farmer_id ?? null,
      customer_id: sub?.customer_id ?? null,
      subscription_id: subscriptionId,
      delivery_date: r.delivery_date,
      time_slot: shiftSlot,
      status: "scheduled",
      qty: r.qty,
      order_id: null,
      address_id: null,
    }));

    const { error: insertErr } = await sb.from("deliveries").insert(insertPayload);
    if (insertErr) throw insertErr;
  };

  const discardChanges = () => {
    const init = initialRef.current;
    if (!init) return;
    setPlanMode(init.planMode);
    setQty(init.qty);
    setWeekly(init.weekly);
    setShiftSlot(init.shiftSlot);
    setDeliveryTime(init.deliveryTime);
    setEffectiveFrom(init.effectiveFrom);
    setHasEndDate(init.hasEndDate);
    setEndDate(init.endDate);
    setErr(null);
  };

  const quickApplyCopyFixedToWeekly = () => {
    setWeekly({
      mon: qty,
      tue: qty,
      wed: qty,
      thu: qty,
      fri: qty,
      sat: qty,
      sun: qty,
    });
  };

  const onSave = async () => {
    if (!sub?.id) return;

    if (!effectiveFrom) return setErr("Please select Effective From date.");
    if (hasEndDate && endDate && endDate < effectiveFrom) {
      return setErr("End date cannot be before Effective From.");
    }
    if (!deliveryTime) return setErr("Please select delivery time.");
    if (planMode === "fixed" && safeNum(qty) <= 0) {
      return setErr("Daily quantity must be greater than 0.");
    }

    if (planMode === "weekly") {
      const total = DAYS.reduce((s, d) => s + safeNum(weekly[d.key]), 0);
      if (total <= 0) return setErr("Weekly pattern total must be greater than 0.");
    }

    setSaving(true);
    setErr(null);

    try {
      const sb: any = supabase;

      const weeklyQtyValue =
        planMode === "weekly"
          ? JSON.stringify(weekly)
          : JSON.stringify({
              mon: qty,
              tue: qty,
              wed: qty,
              thu: qty,
              fri: qty,
              sat: qty,
              sun: qty,
            });

      const shiftWithTime = buildShiftWithTime(shiftSlot, deliveryTime);

      const payload: any = {
        plan_mode: planMode,
        qty: safeNum(qty),
        weekly_qty: weeklyQtyValue,
        shift: shiftWithTime,
        start_date: effectiveFrom,
        end_date: hasEndDate ? (endDate || null) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("customer_subscriptions").update(payload).eq("id", sub.id);
      if (error) throw error;

      await regenerateFutureDeliveries(sub.id, payload);

      setSub((prev) => (prev ? ({ ...prev, ...payload } as any) : prev));
      setSubs((prev) => prev.map((x) => (x.id === sub.id ? ({ ...x, ...payload } as any) : x)));

      initialRef.current = {
        planMode,
        qty,
        weekly,
        shiftSlot,
        deliveryTime,
        effectiveFrom,
        hasEndDate,
        endDate: hasEndDate ? endDate : "",
      };

      navigate("/customer");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const cancelSubscription = async () => {
    if (!sub?.id) return;

    const ok = window.confirm(
      "Are you sure you want to cancel this subscription?\n\nIt will stop deliveries from today."
    );
    if (!ok) return;

    setSaving(true);
    setErr(null);

    try {
      const sb: any = supabase;

      const payload: any = {
        status: "cancelled",
        end_date: isoDate(new Date()),
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("customer_subscriptions").update(payload).eq("id", sub.id);
      if (error) throw error;
      


      const nextSubs = subs.filter((x) => x.id !== sub.id);
      setSubs(nextSubs);

      if (nextSubs.length > 0) {
        setSelectedId(nextSubs[0].id);
      } else {
        navigate("/customer/subscription?new=1", { replace: true });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to cancel subscription");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-6xl px-4">
          <Skeleton className="h-12 w-72 rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[520px] lg:col-span-2 rounded-3xl" />
            <Skeleton className="h-[520px] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const img = safeUrl(product?.image_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-0 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative p-4 md:p-6 lg:p-8 space-y-6">
        {/* Hero */}
        <Card className="rounded-[34px] overflow-hidden border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
          <CardContent className="relative p-6 md:p-8">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-400 blur-3xl" />
              <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-violet-400 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <Badge className="rounded-full bg-white/10 text-white border-white/10 hover:bg-white/10">
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Premium subscription control
                </Badge>

                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    Modify Your Plan
                  </h1>
                  <p className="mt-2 text-sm md:text-base text-white/80">
                    Update quantity, weekly pattern, delivery shift and schedule with a luxury control panel.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-2xl bg-white text-slate-900 hover:bg-white/90"
                  onClick={() => navigate("/customer")}
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => navigate("/customer/subscription?new=1")}
                >
                  Add New Subscription
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription selector */}
        <Card className="rounded-[30px] border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Select Subscription</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose which active subscription you want to modify.
            </p>
          </CardHeader>

          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subs.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                No active subscriptions found.
              </div>
            ) : (
              subs.map((s) => {
                const selected = s.id === selectedId;
                const st = parseShiftAndTime(s.shift);
                const displayName = getSubDisplayName(s, null);

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "text-left rounded-[24px] border p-4 transition-all duration-300",
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                        : "border-border hover:bg-accent/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {displayName}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {safeNum(s.qty)}L/day • {st.shift} {st.time ? `@ ${st.time}` : ""}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Start: {String(s.start_date || "—").slice(0, 10)}
                          {s.end_date ? ` • End: ${String(s.end_date).slice(0, 10)}` : ""}
                        </div>
                      </div>

                      {selected ? (
                        <Badge className="rounded-full">Selected</Badge>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Selected product summary */}
        <Card className="rounded-[30px] border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Selected Subscription</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="h-24 w-28 overflow-hidden rounded-[24px] border bg-muted/30 shrink-0">
              {img ? (
                <img
                  src={img}
                  alt={currentDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-xl text-foreground truncate">
                {currentDisplayName}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                {currentRateText}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300">
                  <Droplets className="mr-1 h-3.5 w-3.5" />
                  {safeNum(sub?.qty)}L/day
                </Badge>

                <Badge className="rounded-full bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300">
                  <Sun className="mr-1 h-3.5 w-3.5" />
                  {previewShiftLabel}
                </Badge>

                <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {deliveryTime}
                </Badge>

                <Badge variant="secondary" className="rounded-full">
                  {sub?.status ?? "active"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {err ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Settings */}
          <Card className="xl:col-span-2 rounded-[30px] border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Plan Settings</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Refine your daily or weekly delivery pattern with premium controls.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <Tabs value={planMode} onValueChange={(v) => setPlanMode(v as PlanMode)}>
                <TabsList className="grid grid-cols-2 w-full rounded-2xl">
                  <TabsTrigger value="fixed" className="rounded-2xl">
                    Fixed Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="rounded-2xl">
                    Weekly Pattern
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fixed" className="space-y-4 pt-5">
                  <div className="rounded-[24px] border border-border bg-card p-4">
                    <Label>Daily Quantity (Litres)</Label>
                    <Input
                      className="mt-2 rounded-2xl"
                      type="number"
                      min={0}
                      step={1}
                      value={qty}
                      onChange={(e) => setQty(safeNum(e.target.value, 0))}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Same litres will be delivered every scheduled day.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-border bg-card p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm">Quick Apply</p>
                      <p className="text-xs text-muted-foreground">
                        Copy fixed quantity to the full weekly template.
                      </p>
                    </div>

                    <Button variant="outline" className="rounded-2xl" onClick={quickApplyCopyFixedToWeekly}>
                      Apply
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="weekly" className="space-y-4 pt-5">
                  <div className="rounded-[24px] border border-border bg-card p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                      {DAYS.map((d) => (
                        <div key={d.key} className="space-y-2">
                          <Label className="text-xs">{d.label}</Label>
                          <Input
                            className="rounded-2xl"
                            type="number"
                            min={0}
                            step={1}
                            value={safeNum(weekly[d.key])}
                            onChange={(e) =>
                              setWeekly((prev) => ({
                                ...prev,
                                [d.key]: safeNum(e.target.value, 0),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Weekly mode lets you customize litres day by day.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[24px] border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Label>Delivery Shift</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={shiftSlot === "morning" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setShiftSlot("morning")}
                    >
                      Morning
                    </Button>
                    <Button
                      type="button"
                      variant={shiftSlot === "evening" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setShiftSlot("evening")}
                    >
                      Evening
                    </Button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    <Label>Delivery Time</Label>
                  </div>

                  <Input
                    className="rounded-2xl"
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                  />

                  <p className="text-xs text-muted-foreground">
                    Saved as: {buildShiftWithTime(shiftSlot, deliveryTime)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[24px] border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <Label>Effective From</Label>
                  </div>

                  <Input
                    className="rounded-2xl"
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>

                <div className="rounded-[24px] border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <Label>Ending Date</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Enable</span>
                      <Switch checked={hasEndDate} onCheckedChange={setHasEndDate} />
                    </div>
                  </div>

                  <Input
                    className="rounded-2xl"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!hasEndDate}
                  />

                  <p className="text-xs text-muted-foreground">
                    Optional. Enable this if you want your plan to end on a fixed date.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={discardChanges}
                    disabled={saving}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Discard Changes
                  </Button>

                  <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={cancelSubscription}
                    disabled={saving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigate("/customer")}
                    disabled={saving}
                  >
                    Close
                  </Button>

                  <Button className="rounded-2xl" onClick={onSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="rounded-[30px] border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Preview</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                A luxury snapshot of the changes you’re about to apply.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-[24px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="mt-1 text-lg font-extrabold text-foreground truncate">
                  {currentDisplayName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{currentRateText}</p>
              </div>

              <div className="rounded-[24px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="mt-1 font-semibold text-foreground">
                  {planMode === "fixed" ? "Fixed Daily" : "Weekly Pattern"}
                </p>
              </div>

              <div className="rounded-[24px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Shift</p>
                <p className="mt-1 font-semibold text-foreground">{previewShiftLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">Time: {deliveryTime}</p>
              </div>

              <div className="rounded-[24px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Schedule</p>
                <p className="mt-1 font-semibold text-foreground">{effectiveFrom || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  End: {hasEndDate ? endDate || "—" : "No end date"}
                </p>
              </div>

              <div className="rounded-[24px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Weekly Total</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{weeklyTotal}L</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {planMode === "fixed" ? `${qty}L × 7 days` : "Custom weekly distribution"}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => navigate("/customer/subscription?new=1")}
              >
                + Add New Subscription
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}