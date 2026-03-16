import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { motion } from "framer-motion";
import {
  PauseCircle,
  PlayCircle,
  CalendarDays,
  Droplets,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Milk,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type SubRow = {
  id: string;
  qty: number | null;
  shift: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  milk_label?: string | null;
  breed?: string | null;
  animal_type?: string | null;
  products?: {
    name?: string | null;
    price?: number | null;
  } | null;
};

function getSubName(sub: SubRow) {
  if (sub.milk_label) return sub.milk_label;

  if (sub.breed && sub.animal_type) {
    return `${sub.breed} ${sub.animal_type} Milk`;
  }

  if (sub.breed) {
    return `${sub.breed} Milk`;
  }

  if (sub.products?.name) {
    return sub.products.name;
  }

  return "Milk";
}

function getRateText(sub: SubRow) {
  const price = Number(sub.products?.price ?? 0);
  if (price > 0) return `₹${price}/L`;
  return "—";
}

function getShiftLabel(shift?: string | null) {
  const s = String(shift || "").toLowerCase();
  if (s.includes("even")) return "Evening";
  if (s.includes("morn")) return "Morning";
  return shift || "—";
}

function prettyStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "paused") return "Paused";
  return "Active";
}

function statusTone(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "paused") {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
  }

  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300";
}

export default function CustomerCancelShiftPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = subs.filter((s) => String(s.status || "").toLowerCase() === "active").length;
    const paused = subs.filter((s) => String(s.status || "").toLowerCase() === "paused").length;
    return {
      total: subs.length,
      active,
      paused,
    };
  }, [subs]);

  const load = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const sb = supabase as any;

    const { data, error } = await sb
      .from("customer_subscriptions")
      .select(
        `
        id,
        status,
        qty,
        shift,
        start_date,
        end_date,
        milk_label,
        breed,
        animal_type,
        product_id,
        products!customer_subscriptions_product_fk (
          name,
          price
        )
      `
      )
      .eq("customer_id", user.id)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setSubs([]);
    } else {
      setSubs((data ?? []) as SubRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const togglePause = async (sub: SubRow) => {
    if (!user?.id) return;

    const current = String(sub.status || "active").toLowerCase();
    const next = current === "paused" ? "active" : "paused";

    setSavingId(sub.id);

    const sb = supabase as any;

    const { error } = await sb
      .from("customer_subscriptions")
      .update({
        status: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id)
      .eq("customer_id", user.id);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: next === "paused" ? "Subscription paused" : "Subscription resumed",
        description:
          next === "paused"
            ? "Future deliveries will stop until you resume."
            : "Your subscription is active again.",
      });
      await load();
    }

    setSavingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mx-auto max-w-7xl space-y-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-10 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute top-20 right-10 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            MilkMate Subscription Control
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Cancel Shift
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Pause your subscription temporarily and resume it anytime without losing your plan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-black">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-black">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Paused</p>
              <p className="mt-1 text-2xl font-black">{stats.paused}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="relative overflow-hidden rounded-[32px] border-0 bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 text-white shadow-[0_20px_60px_rgba(76,29,149,0.30)]">
        <CardContent className="relative p-8 md:p-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                <CalendarDays className="h-3.5 w-3.5" />
                Delivery pause manager
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Need to skip delivery for some time?
              </h2>

              <p className="mt-3 text-sm text-white/85 md:text-base">
                Pause active plans instantly. Your paused subscriptions stay visible here so you can
                resume them later with one click.
              </p>
            </div>

            <div className="grid w-full max-w-md gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">Active plans</p>
                <p className="mt-1 text-lg font-bold">{stats.active}</p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">Paused plans</p>
                <p className="mt-1 text-lg font-bold">{stats.paused}</p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">Control</p>
                <p className="mt-1 text-lg font-bold">1-tap pause/resume</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Your subscriptions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
              Loading subscriptions...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          ) : subs.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Milk className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-bold text-foreground">
                No active or paused subscriptions
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cancelled subscriptions are hidden from this page.
              </p>
            </div>
          ) : (
            subs.map((s, index) => {
              const status = String(s.status || "active").toLowerCase();
              const name = getSubName(s);
              const rate = getRateText(s);
              const shiftLabel = getShiftLabel(s.shift);

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-sm dark:bg-white/5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                          status === "paused"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        )}
                      >
                        {status === "paused" ? (
                          <PauseCircle className="h-6 w-6" />
                        ) : (
                          <Milk className="h-6 w-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-lg font-black text-foreground">{name}</p>

                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold",
                              statusTone(status)
                            )}
                          >
                            {prettyStatus(status)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="rounded-full">
                            <Droplets className="mr-1 h-3.5 w-3.5" />
                            {s.qty ?? 0}L
                          </Badge>

                          <Badge variant="secondary" className="rounded-full">
                            <Clock3 className="mr-1 h-3.5 w-3.5" />
                            {shiftLabel}
                          </Badge>

                          <Badge variant="secondary" className="rounded-full">
                            Rate: {rate}
                          </Badge>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground">
                          Start: {s.start_date || "—"}
                          {s.end_date ? ` • End: ${s.end_date}` : ""}
                        </p>

                        <div className="mt-3">
                          {status === "paused" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              <AlertCircle className="h-3.5 w-3.5" />
                              This subscription is paused. Resume anytime.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Deliveries are currently active.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Button
                        onClick={() => togglePause(s)}
                        disabled={savingId === s.id}
                        variant={status === "paused" ? "default" : "outline"}
                        className={cn(
                          "rounded-2xl px-6",
                          status === "paused" &&
                            "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                      >
                        {savingId === s.id ? (
                          "Saving..."
                        ) : status === "paused" ? (
                          <>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Resume
                          </>
                        ) : (
                          <>
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}