// src/pages/farmer/MilkProduction.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

import {
  RefreshCw,
  Milk,
  Sunrise,
  Sunset,
  Droplets,
  Beef,
  Trophy,
  BarChart3,
  Clock3,
  Sigma,
  Sparkles,
  Zap,
  Activity,
} from "lucide-react";

const FARMER_GREEN = "#0ccf3d";
const FUTURE_BLUE = "#3b82f6";
const FUTURE_AMBER = "#f59e0b";

type MilkLogRow = {
  id: string;
  cattle_id: string;
  log_date: string;
  shift: string | null;
  milk_l: number | null;
  created_at?: string | null;
};

type CattleRow = {
  id: string;
  tag_id: string | null;
  name: string | null;
  breed: string | null;
};

type CattleSummaryRow = {
  cattle_id: string;
  cattle_name: string;
  cattle_tag: string;
  breed: string;
  morning: number;
  evening: number;
  total: number;
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ProgressStrip({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(6, (value / max) * 100) : 0;

  return (
    <div className="h-2.5 rounded-full bg-muted/70 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
        }}
      />
    </div>
  );
}

function FuturisticStatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  glow,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  accent: string;
  glow: string;
}) {
  return (
    <Card className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: glow }}
      />
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}
          >
            <Icon className="h-5 w-5" />
          </div>

          <Badge
            variant="secondary"
            className="rounded-full border border-border/60 bg-background/70 backdrop-blur"
          >
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

export default function MilkProduction() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<MilkLogRow[]>([]);
  const [cattle, setCattle] = useState<CattleRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const todayStr = useMemo(() => toISODate(new Date()), []);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [{ data: logsData, error: logsError }, { data: cattleData, error: cattleError }] =
        await Promise.all([
          (supabase as any)
            .from("cattle_milk_logs")
            .select("id, cattle_id, log_date, shift, milk_l, created_at")
            .eq("farmer_id", user.id)
            .eq("log_date", todayStr)
            .order("created_at", { ascending: false }),

          (supabase as any)
            .from("cattle")
            .select("id, tag_id, name, breed")
            .eq("farmer_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (logsError) throw logsError;
      if (cattleError) throw cattleError;

      const logRows = (logsData ?? []) as MilkLogRow[];
      setLogs(logRows);
      setCattle((cattleData ?? []) as CattleRow[]);
      setLastUpdated(new Date().toISOString());
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Milk production load failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const cattleById = useMemo(() => new Map(cattle.map((c) => [c.id, c])), [cattle]);

  const morningTotal = useMemo(
    () =>
      logs
        .filter((r) => r.shift === "morning")
        .reduce((sum, r) => sum + safeNum(r.milk_l), 0),
    [logs]
  );

  const eveningTotal = useMemo(
    () =>
      logs
        .filter((r) => r.shift === "evening")
        .reduce((sum, r) => sum + safeNum(r.milk_l), 0),
    [logs]
  );

  const totalMilk = morningTotal + eveningTotal;

  const cattleSummary = useMemo<CattleSummaryRow[]>(() => {
    const map = new Map<string, CattleSummaryRow>();

    for (const log of logs) {
      const c = cattleById.get(log.cattle_id);
      const row = map.get(log.cattle_id) ?? {
        cattle_id: log.cattle_id,
        cattle_name: c?.name?.trim() || "Unnamed",
        cattle_tag: c?.tag_id?.trim() || "—",
        breed: c?.breed?.trim() || "—",
        morning: 0,
        evening: 0,
        total: 0,
      };

      const qty = safeNum(log.milk_l);
      if (log.shift === "morning") row.morning += qty;
      if (log.shift === "evening") row.evening += qty;
      row.total += qty;

      map.set(log.cattle_id, row);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [logs, cattleById]);

  const topProducer = cattleSummary[0] ?? null;

  const avgPerCattle = useMemo(() => {
    if (!cattleSummary.length) return 0;
    return totalMilk / cattleSummary.length;
  }, [totalMilk, cattleSummary.length]);

  const activeCattleToday = cattleSummary.length;

  const morningPercent = totalMilk > 0 ? (morningTotal / totalMilk) * 100 : 0;
  const eveningPercent = totalMilk > 0 ? (eveningTotal / totalMilk) * 100 : 0;

  const maxCattleTotal = useMemo(() => {
    return cattleSummary.reduce((mx, row) => Math.max(mx, row.total), 0);
  }, [cattleSummary]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-card/90 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(12,207,61,0.12),transparent_28%)]" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-3xl text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${FARMER_GREEN}, ${FUTURE_BLUE})`,
                  }}
                >
                  <Milk className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    Milk Production
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Futuristic dairy analytics powered by today’s Milk Logs
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-0 bg-emerald-500/15 text-emerald-700">
                  <Activity className="h-3.5 w-3.5 mr-2" />
                  Live Feed Active
                </Badge>

                <Badge variant="secondary" className="rounded-full">
                  <Clock3 className="h-3.5 w-3.5 mr-2" />
                  Updated: {fmtTime(lastUpdated)}
                </Badge>

                <Badge variant="secondary" className="rounded-full">
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  Auto Synced with Milk Logs
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl border-border/60 bg-background/70 backdrop-blur"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FuturisticStatCard
          title="Morning Milk"
          value={`${morningTotal.toFixed(1)}L`}
          sub="Morning shift total today"
          icon={Sunrise}
          accent={FARMER_GREEN}
          glow={FARMER_GREEN}
        />

        <FuturisticStatCard
          title="Evening Milk"
          value={`${eveningTotal.toFixed(1)}L`}
          sub="Evening shift total today"
          icon={Sunset}
          accent={FUTURE_BLUE}
          glow={FUTURE_BLUE}
        />

        <FuturisticStatCard
          title="Total Today"
          value={`${totalMilk.toFixed(1)}L`}
          sub="Morning + Evening combined"
          icon={Droplets}
          accent={FUTURE_AMBER}
          glow={FUTURE_AMBER}
        />

        <FuturisticStatCard
          title="Avg per Cattle"
          value={`${avgPerCattle.toFixed(1)}L`}
          sub={`Based on ${activeCattleToday} active cattle today`}
          icon={Sigma}
          accent="#8b5cf6"
          glow="#8b5cf6"
        />
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Top Producer */}
        <Card className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/85 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_30%)]" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Producer
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {topProducer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-foreground truncate">
                      {topProducer.cattle_tag !== "—"
                        ? `${topProducer.cattle_tag} • ${topProducer.cattle_name}`
                        : topProducer.cattle_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {topProducer.breed !== "—" ? topProducer.breed : "Breed not set"}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Output
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-foreground">
                    {topProducer.total.toFixed(1)}L
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Morning {topProducer.morning.toFixed(1)}L • Evening {topProducer.evening.toFixed(1)}L
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No production data for today.</div>
            )}
          </CardContent>
        </Card>

        {/* Shift Split */}
        <Card className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/85 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%)]" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Shift Split
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Morning</span>
                <span className="font-semibold text-foreground">
                  {morningTotal.toFixed(1)}L • {morningPercent.toFixed(0)}%
                </span>
              </div>
              <ProgressStrip value={morningPercent} max={100} color={FARMER_GREEN} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Evening</span>
                <span className="font-semibold text-foreground">
                  {eveningTotal.toFixed(1)}L • {eveningPercent.toFixed(0)}%
                </span>
              </div>
              <ProgressStrip value={eveningPercent} max={100} color={FUTURE_BLUE} />
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-xs text-muted-foreground">
              Total split based on today’s logged litres.
            </div>
          </CardContent>
        </Card>

        {/* Efficiency */}
        <Card className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/85 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(12,207,61,0.14),transparent_30%)]" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              Production Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3">
            <div className="rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3">
              <div className="text-xs text-muted-foreground">Active Cattle Today</div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {activeCattleToday}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3">
              <div className="text-xs text-muted-foreground">Top vs Average</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {topProducer
                  ? `${topProducer.total.toFixed(1)}L top output`
                  : "No top producer yet"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Average per cattle: {avgPerCattle.toFixed(1)}L
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700">
              Live insights generated from today’s entries only.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cattle wise cards */}
      <Card className="rounded-[32px] border border-border/60 bg-card/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Beef className="h-4 w-4 text-muted-foreground" />
            Today&apos;s Cattle-wise Production
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading production...</div>
          ) : cattleSummary.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-border/70 p-12 text-center bg-secondary/20">
              <div className="text-sm text-muted-foreground">
                No milk log entries found for today.
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Add entries in Milk Logs and they will appear here automatically.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {cattleSummary.map((row, idx) => {
                const isTop = idx === 0;
                return (
                  <div
                    key={row.cattle_id}
                    className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-5 md:p-6"
                  >
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        background: isTop
                          ? "radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 28%)"
                          : "radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 28%)",
                      }}
                    />

                    <div className="relative">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-bold text-foreground truncate">
                              {row.cattle_tag !== "—"
                                ? `${row.cattle_tag}${row.cattle_name !== "Unnamed" ? ` • ${row.cattle_name}` : ""}`
                                : row.cattle_name}
                            </div>

                            {row.breed !== "—" && (
                              <Badge variant="outline" className="rounded-full">
                                {row.breed}
                              </Badge>
                            )}

                            {isTop && (
                              <Badge className="rounded-full bg-amber-500/15 text-amber-700 border-0">
                                <Trophy className="h-3.5 w-3.5 mr-1.5" />
                                Top Performer
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Auto summary from today&apos;s milk logs
                          </div>
                        </div>

                        <div
                          className="rounded-3xl px-4 py-3 min-w-[110px] text-center"
                          style={{
                            background: isTop
                              ? "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))"
                              : "linear-gradient(135deg, rgba(12,207,61,0.16), rgba(12,207,61,0.06))",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="text-[11px] text-muted-foreground">Total</div>
                          <div className="mt-1 text-2xl font-extrabold text-foreground">
                            {row.total.toFixed(1)}L
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Morning</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {row.morning.toFixed(1)}L
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Evening</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {row.evening.toFixed(1)}L
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-center">
                          <div className="text-[11px] text-muted-foreground">Daily Share</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {totalMilk > 0 ? `${((row.total / totalMilk) * 100).toFixed(0)}%` : "0%"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Performance Level</span>
                          <span className="font-semibold text-foreground">
                            {row.total.toFixed(1)}L / {maxCattleTotal.toFixed(1)}L
                          </span>
                        </div>
                        <ProgressStrip
                          value={row.total}
                          max={maxCattleTotal}
                          color={isTop ? FUTURE_AMBER : FARMER_GREEN}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* footer */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Droplets className="h-3.5 w-3.5" />
          Milk Production is directly linked with Milk Logs, so duplicate manual entry is not needed.
        </span>
      </div>
    </div>
  );
}