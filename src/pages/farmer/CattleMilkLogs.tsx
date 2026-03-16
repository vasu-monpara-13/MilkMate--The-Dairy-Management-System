// src/pages/farmer/CattleMilkLogs.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import {
  Activity,
  CalendarDays,
  ChevronDown,
  Download,
  Droplets,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Pencil,
  IndianRupee,
  LineChart as LineChartIcon,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

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
} from "recharts";

type Shift = "morning" | "evening";

type CattleRow = {
  id: string;
  tag_id: string | null;
  name: string | null;
  breed: string | null;
  image_url?: string | null;
};

type MilkLog = {
  id: string;
  farmer_id: string;
  cattle_id: string;
  log_date: string;
  shift: string;
  milk_l: number | null;
  fat: number | null;
  snf: number | null;
  notes: string | null;
  created_at: string;
  price_per_l?: number | null;
};

const FARMER_GREEN = "#0ccf3d";

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

function calcMilkRate(fatValue: string | number, snfValue: string | number) {
  const fat = Number(fatValue);
  const snf = Number(snfValue);

  if (!Number.isFinite(fat) || !Number.isFinite(snf)) return "";

  const rate = fat * 8 + snf * 4;
  return rate.toFixed(2);
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

function cattleLabel(c?: CattleRow | null) {
  if (!c) return "Cattle";
  const tag = (c.tag_id ?? "").trim();
  const name = (c.name ?? "").trim();
  if (tag && name) return `${tag} • ${name}`;
  return (tag || name || "Cattle").trim() || "Cattle";
}

function replAll(s: string, find: string, rep: string) {
  return (s ?? "").split(find).join(rep);
}

function csvClean(s: any) {
  const v = String(s ?? "");
  return replAll(replAll(v, "\n", " "), ",", " ");
}

function formatDisplayDate(iso: string) {
  if (!iso) return "Unknown Date";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "long",
    });
  } catch {
    return iso;
  }
}

export default function CattleMilkLogs() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingCattle, setLoadingCattle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cattle, setCattle] = useState<CattleRow[]>([]);
  const [logs, setLogs] = useState<MilkLog[]>([]);

  const [hasPriceColumn, setHasPriceColumn] = useState<boolean>(true);

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toISODate(d);
  }, []);
  const defaultTo = useMemo(() => toISODate(today), [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [shiftTab, setShiftTab] = useState<"all" | Shift>("all");
  const [cattleIdFilter, setCattleIdFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string | null>(null);

  const [editContext, setEditContext] = useState<{ cattle_id: string; log_date: string } | null>(null);

  const [cattleId, setCattleId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(defaultTo);
  const [shift, setShift] = useState<Shift>("morning");
  const [milkL, setMilkL] = useState<number>(1);
  const [editBoth, setEditBoth] = useState(false);
  const [milkMorning, setMilkMorning] = useState<number>(0);
  const [milkEvening, setMilkEvening] = useState<number>(0);
  const [fat, setFat] = useState<string>("");
  const [snf, setSnf] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [pricePerL, setPricePerL] = useState<string>("");
  const [manualPrice, setManualPrice] = useState(false);

  useEffect(() => {
    if (!hasPriceColumn) return;
    if (manualPrice) return;

    if (fat.trim() && snf.trim()) {
      const autoRate = calcMilkRate(fat, snf);
      setPricePerL(autoRate);
    } else {
      setPricePerL("");
    }
  }, [fat, snf, hasPriceColumn, manualPrice]);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const mounted = useRef(false);

  const cattleById = useMemo(() => new Map(cattle.map((c) => [c.id, c])), [cattle]);
  const findLog = (cid: string, date: string, sh: Shift) =>
    logs.find((x) => x.cattle_id === cid && x.log_date === date && x.shift === sh);
  const hasCattle = cattle.length > 0;

  const resetForm = () => {
    setCattleId("");
    setLogDate(defaultTo);
    setShift("morning");
    setMilkL(1);
    setFat("");
    setSnf("");
    setNotes("");
    setPricePerL("");
    setManualPrice(false);
    setAdvancedOpen(false);
    setEditBoth(false);
    setMilkMorning(0);
    setMilkEvening(0);
    setEditContext(null);
  };

  const toggleManualPrice = (checked: boolean) => {
    setManualPrice(checked);

    if (checked && !pricePerL.trim() && fat.trim() && snf.trim()) {
      setPricePerL(calcMilkRate(fat, snf));
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditId(null);
    resetForm();
    setEditBoth(true);
    setMilkMorning(0);
    setMilkEvening(0);
    if (cattle.length === 1) setCattleId(cattle[0].id);
    setOpen(true);
  };

  const fillFormFromRow = (row: MilkLog) => {
    setEditId(row.id);
    setCattleId(row.cattle_id);
    setLogDate(row.log_date);
    setShift((row.shift as Shift) === "evening" ? "evening" : "morning");
    setMilkL(safeNum(row.milk_l ?? 0) || 1);
    setFat(row.fat != null ? String(row.fat) : "");
    setSnf(row.snf != null ? String(row.snf) : "");
    setNotes(row.notes ?? "");
    setPricePerL(row.price_per_l != null ? String(row.price_per_l) : "");
    setAdvancedOpen(Boolean(row.fat != null || row.snf != null || row.price_per_l != null || (row.notes ?? "").trim().length));
  };

  const selectShiftInEdit = (nextShift: Shift) => {
    setShift(nextShift);

    if (mode !== "edit") return;

    const ctx = editContext ?? (cattleId && logDate ? { cattle_id: cattleId, log_date: logDate } : null);
    if (!ctx) return;

    const row = logs.find(
      (l) =>
        l.cattle_id === ctx.cattle_id &&
        l.log_date === ctx.log_date &&
        String(l.shift) === nextShift
    );

    if (row) {
      fillFormFromRow(row);
      return;
    }

    setEditId(null);
    setCattleId(ctx.cattle_id);
    setLogDate(ctx.log_date);
    setMilkL(1);
    setFat("");
    setSnf("");
    setNotes("");
    setPricePerL("");
    setAdvancedOpen(false);

    toast({
      title: "New shift entry",
      description: `No ${nextShift} log found for this date. Saving will create a new row.`,
    });
  };

  const openEdit = (row: MilkLog) => {
    setMode("edit");
    setEditId(row.id);

    setCattleId(row.cattle_id);
    setLogDate(row.log_date);
    setEditContext({ cattle_id: row.cattle_id, log_date: row.log_date });

    const m = findLog(row.cattle_id, row.log_date, "morning");
    const e = findLog(row.cattle_id, row.log_date, "evening");

    setShift((row.shift as Shift) === "evening" ? "evening" : "morning");
    setMilkL(safeNum(row.milk_l ?? 0) || 1);

    setMilkMorning(safeNum(m?.milk_l ?? 0));
    setMilkEvening(safeNum(e?.milk_l ?? 0));

    setFat(row.fat != null ? String(row.fat) : "");
    setSnf(row.snf != null ? String(row.snf) : "");
    setNotes(row.notes ?? "");
    setPricePerL(row.price_per_l != null ? String(row.price_per_l) : "");
    setManualPrice(false);

    setAdvancedOpen(
      Boolean(
        row.fat != null ||
          row.snf != null ||
          row.price_per_l != null ||
          (row.notes ?? "").trim().length
      )
    );

    setEditBoth(true);
    setOpen(true);
  };

  const canSave = useMemo(() => {
    if (!user?.id) return false;
    if (!cattleId) return false;
    if (!logDate) return false;
    if (!shift) return false;

    if (editBoth) {
      return milkMorning > 0 || milkEvening > 0;
    }

    if (!Number.isFinite(milkL) || milkL <= 0) return false;
    return true;
  }, [user?.id, cattleId, logDate, shift, milkL, editBoth, milkMorning, milkEvening]);

  const loadCattle = async () => {
    if (!user?.id) return;
    setLoadingCattle(true);
    try {
      const { data, error } = await supabase
        .from("cattle")
        .select("id, tag_id, name, breed, image_url")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCattle((data ?? []) as any);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Cattle load failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCattle(false);
    }
  };

  const loadLogs = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const base = supabase
      .from("cattle_milk_logs")
      .select("id, farmer_id, cattle_id, log_date, shift, milk_l, fat, snf, notes, created_at, price_per_l")
      .eq("farmer_id", user.id)
      .gte("log_date", from)
      .lte("log_date", to)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    try {
      const { data, error } = await base;
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("price_per_l") && msg.includes("does not exist")) {
          setHasPriceColumn(false);

          const { data: data2, error: error2 } = await supabase
            .from("cattle_milk_logs")
            .select("id, farmer_id, cattle_id, log_date, shift, milk_l, fat, snf, notes, created_at")
            .eq("farmer_id", user.id)
            .gte("log_date", from)
            .lte("log_date", to)
            .order("log_date", { ascending: false })
            .order("created_at", { ascending: false });

          if (error2) throw error2;
          setLogs((data2 ?? []) as any);
          return;
        }

        throw error;
      }

      setHasPriceColumn(true);
      setLogs((data ?? []) as any);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load milk logs.");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCattle(), loadLogs()]);
    toast({ title: "Refreshed", description: "Cattle + Milk logs updated." });
  };

  useEffect(() => {
    if (!user?.id) return;
    if (mounted.current) return;
    mounted.current = true;
    loadCattle();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, from, to]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return logs.filter((l) => {
      if (shiftTab !== "all" && String(l.shift) !== shiftTab) return false;
      if (cattleIdFilter !== "all" && l.cattle_id !== cattleIdFilter) return false;

      if (!qq) return true;

      const c = cattleById.get(l.cattle_id);
      const hay = [
        l.log_date,
        l.shift,
        String(l.milk_l ?? ""),
        String(l.fat ?? ""),
        String(l.snf ?? ""),
        String(l.notes ?? ""),
        c?.tag_id ?? "",
        c?.name ?? "",
        c?.breed ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [logs, shiftTab, cattleIdFilter, q, cattleById]);

  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        logs: MilkLog[];
        total: number;
        morning: number;
        evening: number;
        revenue: number;
      }
    >();

    for (const l of filtered) {
      const date = l.log_date;
      const qty = safeNum(l.milk_l);
      const price = hasPriceColumn ? safeNum((l as any).price_per_l) : 0;
      const revenue = hasPriceColumn && price ? qty * price : 0;

      const cur = map.get(date) ?? {
        date,
        logs: [],
        total: 0,
        morning: 0,
        evening: 0,
        revenue: 0,
      };

      cur.logs.push(l);
      cur.total += qty;
      cur.revenue += revenue;
      if (String(l.shift) === "morning") cur.morning += qty;
      if (String(l.shift) === "evening") cur.evening += qty;

      map.set(date, cur);
    }

    return Array.from(map.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((g) => ({
        ...g,
        logs: [...g.logs].sort((a, b) => {
          const shiftOrder = String(a.shift) === String(b.shift) ? 0 : String(a.shift) === "morning" ? -1 : 1;
          if (shiftOrder !== 0) return shiftOrder;
          return String(b.created_at).localeCompare(String(a.created_at));
        }),
      }));
  }, [filtered, hasPriceColumn]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, l) => s + safeNum(l.milk_l), 0);
    const morning = filtered.filter((x) => x.shift === "morning").reduce((s, l) => s + safeNum(l.milk_l), 0);
    const evening = filtered.filter((x) => x.shift === "evening").reduce((s, l) => s + safeNum(l.milk_l), 0);

    const fatVals = filtered.map((x) => (x.fat == null ? null : Number(x.fat))).filter((x) => x != null) as number[];
    const snfVals = filtered.map((x) => (x.snf == null ? null : Number(x.snf))).filter((x) => x != null) as number[];

    const avgFat = fatVals.length ? fatVals.reduce((a, b) => a + b, 0) / fatVals.length : null;
    const avgSnf = snfVals.length ? snfVals.reduce((a, b) => a + b, 0) / snfVals.length : null;

    const revenue = hasPriceColumn
      ? filtered.reduce((s, l) => {
          const qty = safeNum(l.milk_l);
          const price = safeNum((l as any).price_per_l);
          if (!price) return s;
          return s + qty * price;
        }, 0)
      : null;

    return { total, morning, evening, avgFat, avgSnf, revenue };
  }, [filtered, hasPriceColumn]);

  const dailySeries = useMemo(() => {
    const map = new Map<string, { date: string; total: number; morning: number; evening: number }>();
    for (const l of filtered) {
      const d = l.log_date;
      const cur = map.get(d) ?? { date: d, total: 0, morning: 0, evening: 0 };
      const qty = safeNum(l.milk_l);
      cur.total += qty;
      if (l.shift === "morning") cur.morning += qty;
      if (l.shift === "evening") cur.evening += qty;
      map.set(d, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const cattleSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtered) map.set(l.cattle_id, (map.get(l.cattle_id) ?? 0) + safeNum(l.milk_l));
    const rows = Array.from(map.entries())
      .map(([id, total]) => {
        const c = cattleById.get(id);
        return { cattle_id: id, name: cattleLabel(c), total };
      })
      .sort((a, b) => b.total - a.total);
    return rows.slice(0, 8);
  }, [filtered, cattleById]);

  const shiftPie = useMemo(() => {
    return [
      { name: "Morning", value: totals.morning },
      { name: "Evening", value: totals.evening },
    ];
  }, [totals.morning, totals.evening]);

  const ai = useMemo(() => {
    if (dailySeries.length < 3) {
      return {
        headline: "Add 3+ days logs for AI insights",
        bullets: [
          "Once you log a few days, I’ll detect trends + best-performing cattle automatically.",
          "Tip: log both shifts daily for best accuracy.",
        ],
        status: "warmup" as const,
      };
    }

    const last = dailySeries.slice(-3).reduce((s, x) => s + x.total, 0);
    const prev = dailySeries.slice(-6, -3).reduce((s, x) => s + x.total, 0);
    const change = prev ? ((last - prev) / prev) * 100 : 0;

    const best = cattleSeries[0];
    const bestTxt = best ? `Top cattle: ${best.name} (${best.total.toFixed(1)}L in selected range)` : "Top cattle not detected";

    let biggestDrop = { date: "", drop: 0 };
    for (let i = 1; i < dailySeries.length; i++) {
      const drop = dailySeries[i - 1].total - dailySeries[i].total;
      if (drop > biggestDrop.drop) biggestDrop = { date: dailySeries[i].date, drop };
    }

    const bullets: string[] = [];
    bullets.push(bestTxt);

    if (Math.abs(change) >= 8) {
      bullets.push(
        change > 0
          ? `Production rising 📈 ~${change.toFixed(0)}% (last 3 days vs previous 3). Keep it consistent.`
          : `Production dropped ⚠️ ~${Math.abs(change).toFixed(0)}% (last 3 days vs previous 3). Check feed/water/health.`
      );
    } else {
      bullets.push("Production is stable ✅ (no major shift detected).");
    }

    if (biggestDrop.drop >= 3) {
      bullets.push(`Anomaly: sudden drop ~${biggestDrop.drop.toFixed(1)}L on ${biggestDrop.date}. Check that day logs / cattle health.`);
    } else {
      bullets.push("No strong anomalies detected in this range.");
    }

    if (totals.avgFat != null && totals.avgSnf != null) {
      bullets.push(`Quality avg: FAT ~${totals.avgFat.toFixed(1)} • SNF ~${totals.avgSnf.toFixed(1)} (filtered logs).`);
    } else {
      bullets.push("Add FAT/SNF in logs to unlock quality insights.");
    }

    const status = change < -8 ? "risk" : change > 8 ? "good" : "ok";

    return {
      headline:
        status === "good"
          ? "AI says: farm performance is improving 🚀"
          : status === "risk"
          ? "AI says: performance dipped — take action ⚠️"
          : "AI says: performance is steady ✅",
      bullets,
      status: status as "good" | "risk" | "ok",
    };
  }, [dailySeries, cattleSeries, totals.avgFat, totals.avgSnf]);

  const upsertShift = async (sh: Shift, litres: number, existingId?: string | null) => {
    if (!user?.id) return;

    const payload: any = {
      farmer_id: user.id,
      cattle_id: cattleId,
      log_date: logDate,
      shift: sh,
      milk_l: litres,
      fat: fat.trim() ? Number(fat) : null,
      snf: snf.trim() ? Number(snf) : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    if (hasPriceColumn) payload.price_per_l = pricePerL.trim() ? Number(pricePerL) : null;

    if (existingId) {
      const { error } = await (supabase as any).from("cattle_milk_logs").update(payload).eq("id", existingId);
      if (error) throw error;
      return;
    }

    const { error } = await (supabase as any).from("cattle_milk_logs").insert(payload);
    if (error) throw error;
  };

  const save = async () => {
    if (!user?.id) return;
    if (!canSave) {
      toast({
        title: "Missing required fields",
        description: "Please fill cattle, date, shift and milk quantity.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        farmer_id: user.id,
        cattle_id: cattleId,
        log_date: logDate,
        shift,
        milk_l: milkL,
        fat: fat.trim() ? Number(fat) : null,
        snf: snf.trim() ? Number(snf) : null,
        notes: notes.trim() ? notes.trim() : null,
      };

      if (hasPriceColumn) {
        payload.price_per_l = pricePerL.trim() ? Number(pricePerL) : null;
      }

      if (mode === "create") {
        if (editBoth) {
          if (milkMorning > 0) await upsertShift("morning", milkMorning, null);
          if (milkEvening > 0) await upsertShift("evening", milkEvening, null);

          toast({ title: "Logs added ✅", description: "Morning + Evening saved." });
        } else {
          const { error } = await (supabase as any).from("cattle_milk_logs").insert(payload);
          if (error) throw error;
          toast({ title: "Log added ✅", description: "Milk entry saved successfully." });
        }
      } else {
        if (editBoth) {
          const m = findLog(cattleId, logDate, "morning");
          const e = findLog(cattleId, logDate, "evening");

          if (milkMorning > 0) await upsertShift("morning", milkMorning, m?.id ?? null);
          if (milkEvening > 0) await upsertShift("evening", milkEvening, e?.id ?? null);

          toast({ title: "Logs updated ✅", description: "Morning + Evening updated in one save." });
        } else {
          const { error } = await (supabase as any)
            .from("cattle_milk_logs")
            .update(payload)
            .eq("id", editId);
          if (error) throw error;
          toast({ title: "Log updated ✅", description: "Milk entry updated successfully." });
        }
      }

      setOpen(false);
      await loadLogs();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Save failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: MilkLog) => {
    try {
      setLoading(true);
      const { error } = await supabase.from("cattle_milk_logs").delete().eq("id", row.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Milk log removed." });
      await loadLogs();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Delete failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const header = [
      "log_date",
      "shift",
      "cattle_tag",
      "cattle_name",
      "breed",
      "milk_l",
      "fat",
      "snf",
      ...(hasPriceColumn ? ["price_per_l", "revenue_inr"] : []),
      "notes",
    ];

    const lines = [header.join(",")];

    for (const l of filtered) {
      const c = cattleById.get(l.cattle_id);
      const qty = safeNum(l.milk_l);
      const price = hasPriceColumn ? safeNum((l as any).price_per_l) : 0;
      const rev = hasPriceColumn ? (price ? qty * price : 0) : 0;

      const row = [
        l.log_date,
        l.shift,
        csvClean(c?.tag_id ?? ""),
        csvClean(c?.name ?? ""),
        csvClean(c?.breed ?? ""),
        String(l.milk_l ?? ""),
        l.fat == null ? "" : String(l.fat),
        l.snf == null ? "" : String(l.snf),
        ...(hasPriceColumn ? [String((l as any).price_per_l ?? ""), price ? rev.toFixed(2) : ""] : []),
        csvClean(l.notes ?? ""),
      ];

      lines.push(row.join(","));
    }

    const filename = `milk_logs_${from}_to_${to}.csv`;
    downloadTextFile(filename, lines.join("\n"));

    toast({ title: "CSV exported", description: `Downloaded: ${filename}` });
  };

  const activeFiltersLabel = useMemo(() => {
    const parts: string[] = [];
    parts.push(shiftTab === "all" ? "All shifts" : shiftTab === "morning" ? "Morning" : "Evening");
    if (cattleIdFilter === "all") parts.push("All cattle");
    else {
      const c = cattleById.get(cattleIdFilter);
      parts.push(cattleLabel(c));
    }
    if (q.trim()) parts.push(`Search: "${q.trim()}"`);
    return parts.join(" • ");
  }, [shiftTab, cattleIdFilter, cattleById, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: FARMER_GREEN }}
            >
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Milk Logs</h1>
              <p className="text-sm text-muted-foreground">
                Ultra clean daily entries • filters • analytics • export • AI insights
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="secondary" className="rounded-2xl">
              <CalendarDays className="h-3.5 w-3.5 mr-2" />
              {from} → {to}
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              <Activity className="h-3.5 w-3.5 mr-2" />
              {filtered.length} logs
            </Badge>
            <Badge className="rounded-2xl" style={{ backgroundColor: "rgba(12,207,61,0.12)", color: "#0a7d2a" }}>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              AI Insights ON
            </Badge>
            <Badge variant="outline" className="rounded-2xl">
              <Filter className="h-3.5 w-3.5 mr-2" />
              {activeFiltersLabel}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={refreshAll} disabled={loading || loadingCattle}>
            <RefreshCcw className={cn("h-4 w-4 mr-2", (loading || loadingCattle) && "animate-spin")} />
            Refresh
          </Button>

          <Button variant="outline" className="rounded-2xl" onClick={exportCSV} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button
            className="rounded-2xl"
            onClick={openCreate}
            disabled={!hasCattle}
            style={{ backgroundColor: FARMER_GREEN, color: "white" }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Log
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
            {!hasPriceColumn && (
              <div className="mt-2 text-xs text-muted-foreground">
                Note: Your table doesn’t have <b>price_per_l</b>. Revenue UI auto-hidden. (If you want it, add column in
                Supabase.)
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card className="rounded-3xl border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.total.toFixed(1)}L</div>
            <div className="text-xs text-muted-foreground mt-1">
              Morning {totals.morning.toFixed(1)}L • Evening {totals.evening.toFixed(1)}L
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg FAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.avgFat == null ? "—" : totals.avgFat.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1">Across filtered logs</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg SNF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.avgSnf == null ? "—" : totals.avgSnf.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1">Across filtered logs</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {hasPriceColumn ? (
                <span className="inline-flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {totals.revenue ? Math.round(totals.revenue).toLocaleString("en-IN") : "0"}
                </span>
              ) : (
                "—"
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {hasPriceColumn ? "Only logs with price/L" : "Enable price_per_l to unlock revenue"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-sm font-semibold",
                ai.status === "good" && "text-emerald-600",
                ai.status === "risk" && "text-amber-600",
                ai.status === "ok" && "text-foreground"
              )}
            >
              {ai.headline}
            </div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{ai.bullets[0]}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              Daily Production
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {dailySeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="morning" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="evening" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No data for selected range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Top Cattle (Litres)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {cattleSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cattleSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No cattle breakdown yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Shift Split
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {totals.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={shiftPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                    {shiftPie.map((_, idx) => (
                      <Cell key={idx} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Add logs to see shift analytics.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/60">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9 rounded-2xl"
                placeholder="Search by tag / name / breed / date / notes..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input className="rounded-2xl w-[155px]" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input className="rounded-2xl w-[155px]" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>

              <Select value={cattleIdFilter} onValueChange={setCattleIdFilter}>
                <SelectTrigger className="rounded-2xl w-full md:w-[220px]">
                  <SelectValue placeholder="All cattle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cattle</SelectItem>
                  {cattle.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {cattleLabel(c)}
                      {c.breed ? ` • ${c.breed}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={shiftTab} onValueChange={(v: any) => setShiftTab(v)} className="w-full">
            <TabsList className="w-full rounded-2xl grid grid-cols-3">
              <TabsTrigger value="all" className="rounded-2xl">
                All <Badge variant="secondary" className="ml-2 rounded-2xl">{filtered.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="morning" className="rounded-2xl">Morning</TabsTrigger>
              <TabsTrigger value="evening" className="rounded-2xl">Evening</TabsTrigger>
            </TabsList>

            <TabsContent value={shiftTab} className="mt-4">
              <Separator />

              <div className="mt-4 rounded-3xl border border-border/60 bg-muted/20 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: FARMER_GREEN }} />
                      <div className="font-semibold">AI Insights</div>
                      <Badge className="rounded-2xl" style={{ backgroundColor: "rgba(12,207,61,0.12)", color: "#0a7d2a" }}>
                        Smart
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{ai.headline}</div>
                  </div>

                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      toast({
                        title: "AI Insights",
                        description: ai.bullets.join(" • "),
                      })
                    }
                  >
                    View
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                <ul className="mt-3 grid gap-2 md:grid-cols-2">
                  {ai.bullets.slice(0, 4).map((b, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: FARMER_GREEN }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-3xl border border-border/60 bg-card">
                <div className="p-4 md:p-6 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Log Entries</div>
                    <div className="text-xs text-muted-foreground">Date-wise assembled view • edit • delete • quick scan</div>
                  </div>

                  <Button variant="outline" className="rounded-2xl" onClick={openCreate} disabled={!hasCattle}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                <Separator />

                <div className="p-4 md:p-6 space-y-5">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading logs…</div>
                  ) : !filtered.length ? (
                    <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
                      <div className="text-sm text-muted-foreground">No logs found</div>
                      <div className="text-xs text-muted-foreground mt-1">Try changing date range, shift tab, or search.</div>
                      <div className="mt-4">
                        <Button className="rounded-2xl" onClick={openCreate} disabled={!hasCattle} style={{ backgroundColor: FARMER_GREEN, color: "white" }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add first log
                        </Button>
                      </div>
                    </div>
                  ) : (
                    groupedByDate.map((group) => (
                      <motion.div
                        key={group.date}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[28px] border border-border/60 bg-muted/10 overflow-hidden"
                      >
                        <div className="p-4 md:p-5 bg-background/70 border-b border-border/60">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="rounded-2xl" style={{ backgroundColor: "rgba(12,207,61,0.12)", color: "#0a7d2a" }}>
                                  <CalendarDays className="h-3.5 w-3.5 mr-2" />
                                  {formatDisplayDate(group.date)}
                                </Badge>
                                <Badge variant="secondary" className="rounded-2xl">
                                  {group.logs.length} entries
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Daily assembled summary
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                                <div className="text-[11px] text-muted-foreground">Total</div>
                                <div className="text-sm font-semibold">{group.total.toFixed(1)}L</div>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                                <div className="text-[11px] text-muted-foreground">Morning</div>
                                <div className="text-sm font-semibold">{group.morning.toFixed(1)}L</div>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                                <div className="text-[11px] text-muted-foreground">Evening</div>
                                <div className="text-sm font-semibold">{group.evening.toFixed(1)}L</div>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                                <div className="text-[11px] text-muted-foreground">Revenue</div>
                                <div className="text-sm font-semibold">
                                  {hasPriceColumn ? `₹${Math.round(group.revenue).toLocaleString("en-IN")}` : "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 md:p-5 space-y-3">
                          {group.logs.map((l) => {
                            const c = cattleById.get(l.cattle_id);
                            const qty = safeNum(l.milk_l);
                            const price = hasPriceColumn ? safeNum((l as any).price_per_l) : 0;
                            const revenue = hasPriceColumn && price ? qty * price : null;

                            return (
                              <div
                                key={l.id}
                                className="rounded-3xl border border-border/60 bg-card p-4 hover:shadow-sm transition"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge
                                        className="rounded-2xl"
                                        style={{ backgroundColor: "rgba(12,207,61,0.12)", color: "#0a7d2a" }}
                                      >
                                        {l.shift === "morning" ? "Morning" : "Evening"}
                                      </Badge>

                                      <div className="text-sm font-semibold">
                                        {cattleLabel(c)}
                                      </div>

                                      {c?.breed && (
                                        <Badge variant="outline" className="rounded-2xl">
                                          {c.breed}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                                      <span className="inline-flex items-center gap-1">
                                        <Droplets className="h-3.5 w-3.5" />
                                        Qty: <b className="text-foreground">{qty.toFixed(1)}L</b>
                                      </span>

                                      <span className="inline-flex items-center gap-1">
                                        FAT: <b className="text-foreground">{l.fat == null ? "—" : Number(l.fat).toFixed(1)}</b>
                                      </span>

                                      <span className="inline-flex items-center gap-1">
                                        SNF: <b className="text-foreground">{l.snf == null ? "—" : Number(l.snf).toFixed(1)}</b>
                                      </span>

                                      {hasPriceColumn && (
                                        <span className="inline-flex items-center gap-1">
                                          Price/L: <b className="text-foreground">{(l as any).price_per_l == null ? "—" : Number((l as any).price_per_l).toFixed(2)}</b>
                                        </span>
                                      )}

                                      {revenue != null && (
                                        <span className="inline-flex items-center gap-1">
                                          Revenue: <b className="text-foreground">₹{Math.round(revenue).toLocaleString("en-IN")}</b>
                                        </span>
                                      )}
                                    </div>

                                    {l.notes?.trim() ? (
                                      <div className="text-sm text-muted-foreground mt-2">{l.notes}</div>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-2 md:justify-end">
                                    <Button variant="outline" className="rounded-2xl" onClick={() => openEdit(l)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button variant="destructive" className="rounded-2xl" onClick={() => remove(l)}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="sm:max-w-[720px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" style={{ color: FARMER_GREEN }} />
              {mode === "create" ? "Add Milk Log" : "Edit Milk Log"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cattle *</Label>
              <Select value={cattleId} onValueChange={(v) => {
                setCattleId(v);
                if (mode === "edit" && editContext) setEditContext({ ...editContext, cattle_id: v });
              }}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder={loadingCattle ? "Loading..." : "Select cattle"} />
                </SelectTrigger>
                <SelectContent>
                  {cattle.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {cattleLabel(c)}
                      {c.breed ? ` • ${c.breed}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Tip: Tag ID keeps logs easy to track.</div>
            </div>

            <div className="space-y-2">
              <Label>Log Date *</Label>
              <Input
                className="rounded-2xl"
                type="date"
                value={logDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setLogDate(v);
                  if (mode === "edit" && editContext) setEditContext({ ...editContext, log_date: v });
                }}
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div>
                <div className="text-sm font-semibold">Edit both shifts</div>
                <div className="text-xs text-muted-foreground">
                  Morning + Evening in one save
                </div>
              </div>
              <Switch checked={editBoth} onCheckedChange={setEditBoth} />
            </div>

            <div className="space-y-2">
              <Label>Shift *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={shift === "morning" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => selectShiftInEdit("morning")}
                  style={shift === "morning" ? { backgroundColor: FARMER_GREEN, color: "white" } : undefined}
                >
                  Morning
                </Button>
                <Button
                  type="button"
                  variant={shift === "evening" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => selectShiftInEdit("evening")}
                  style={shift === "evening" ? { backgroundColor: FARMER_GREEN, color: "white" } : undefined}
                >
                  Evening
                </Button>
              </div>
            </div>

            {editBoth ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <Label>Morning (Litres)</Label>
                  <Input
                    className="rounded-2xl"
                    type="number"
                    step="0.1"
                    min="0"
                    value={milkMorning}
                    onChange={(e) => setMilkMorning(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evening (Litres)</Label>
                  <Input
                    className="rounded-2xl"
                    type="number"
                    step="0.1"
                    min="0"
                    value={milkEvening}
                    onChange={(e) => setMilkEvening(Number(e.target.value))}
                  />
                </div>

                <div className="md:col-span-2 text-xs text-muted-foreground">
                  Tip: If a shift is 0, it will be skipped.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Milk (Litres) *</Label>
                <Input
                  className="rounded-2xl"
                  type="number"
                  step="0.1"
                  min="0"
                  value={milkL}
                  onChange={(e) => setMilkL(Number(e.target.value))}
                />
                <div className="text-xs text-muted-foreground">
                  Use decimals (e.g. 6.5)
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 rounded-2xl border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Advanced (Quality / Price / Notes)</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Show</Label>
                <Switch checked={advancedOpen} onCheckedChange={setAdvancedOpen} />
              </div>
            </div>

            <AnimatePresence>
              {advancedOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>FAT</Label>
                      <Input className="rounded-2xl" placeholder="e.g. 4.5" value={fat} onChange={(e) => setFat(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>SNF</Label>
                      <Input className="rounded-2xl" placeholder="e.g. 8.6" value={snf} onChange={(e) => setSnf(e.target.value)} />
                    </div>

                    {hasPriceColumn && (
                      <div className="space-y-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label>Price per L (₹)</Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Manual override</Label>
                            <Switch checked={manualPrice} onCheckedChange={toggleManualPrice} />
                          </div>
                        </div>

                        <Input
                          className="rounded-2xl"
                          placeholder="e.g. 60"
                          value={pricePerL}
                          onChange={(e) => setPricePerL(e.target.value)}
                          disabled={!manualPrice}
                        />

                        <div className="text-xs text-muted-foreground">
                          {manualPrice
                            ? "Manual price mode ON — farmer can enter custom rate."
                            : "Auto price mode ON — price is calculated from FAT + SNF."}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        className="rounded-2xl min-h-[90px]"
                        placeholder="Health, feed change, vaccination note..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              disabled={!canSave || loading}
              onClick={save}
              style={{ backgroundColor: FARMER_GREEN, color: "white" }}
            >
              {loading ? "Saving..." : mode === "create" ? "Add Log" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}