// src/pages/farmer/CattleManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";



import {
  Plus,
  Search,
  RefreshCcw,
  Beef,
  BadgeCheck,
  Baby,
  Syringe,
  HeartPulse,
  Droplets,
  Image as ImageIcon,
  Pencil,
  Trash2,
  CalendarDays,
  Filter,
  NotebookPen,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



const FARMER_GREEN = "#0ccf3d";

const BREEDS = [
  "Gir",
  "Sahiwal",
  "Red Sindhi",
  "Tharparkar",
  "Rathi",
  "Kankrej",
  "Ongole",
  "Hariana",
  "Deoni",
  "Dangi",
  "Kangayam",
  "Khillari",
  "Amritmahal",
  "Hallikar",
  "Bargur",
  "Vechur",
  "Malnad Gidda",
  "Punganur",
  "Siri",
  "Badri",
  "Buffalo"
] as const;

type Breed = (typeof BREEDS)[number];

type CattleRow = {
  id: string;
  farmer_id: string;

  tag_id: string | null;
  name: string | null;
  breed: string | null;
  gender: string | null;
  dob: string | null;

  status: string | null;
  lactation_stage: string | null;

  purchase_date: string | null;
  purchase_price: number | null;

  image_url: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
};

type MilkAgg7d = {
  cattle_id: string;
  litres_7d: number;
};

function safeUrl(url?: string | null) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function labelGender(v: string | null) {
  const x = (v || "").toLowerCase();
  if (x === "female") return "Female";
  if (x === "male") return "Male";
  return "—";
}

function labelStatus(v: string | null) {
  const x = (v || "").toLowerCase();
  if (x === "active") return "Active";
  if (x === "sold") return "Sold";
  if (x === "inactive") return "Inactive";
  return v || "—";
}

function statusTone(v: string | null) {
  const x = (v || "").toLowerCase();
  if (x === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (x === "sold") return "bg-slate-100 text-slate-800 border-slate-200";
  if (x === "inactive") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-muted text-foreground border-border";
}

export default function CattleManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rows, setRows] = useState<CattleRow[]>([]);
  const [milk7d, setMilk7d] = useState<Record<string, number>>({});

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "sold">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");

  // dialogs
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CattleRow | null>(null);

  // form draft
  const [draft, setDraft] = useState({
    id: "" as string | "",
    tag_id: "" as string,
    name: "" as string,
    breed: "" as string, // dropdown
    gender: "female" as "female" | "male",
    dob: "" as string,
    status: "active" as "active" | "inactive" | "sold",
   lactation_stage: "lactating" as "lactating" | "dry" | "pregnant" | "none",
    purchase_date: "" as string,
    purchase_price: "" as string, // keep as string for input
    image_url: "" as string,
    notes: "" as string,
  });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows.filter((r) => {
      const tag = (r.tag_id || "").toLowerCase();
      const name = (r.name || "").toLowerCase();
      const breed = (r.breed || "").toLowerCase();
      const gender = (r.gender || "").toLowerCase();
      const status = (r.status || "").toLowerCase();

      const okQ =
        !qq ||
        tag.includes(qq) ||
        name.includes(qq) ||
        breed.includes(qq) ||
        gender.includes(qq) ||
        status.includes(qq);

      const okStatus = statusFilter === "all" ? true : status === statusFilter;
      const okGender = genderFilter === "all" ? true : gender === genderFilter;

      return okQ && okStatus && okGender;
    });
  }, [rows, q, statusFilter, genderFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => (r.status || "").toLowerCase() === "active").length;
    const lactating = rows.filter((r) => (r.lactation_stage || "").toLowerCase() === "lactating").length;
    const sold = rows.filter((r) => (r.status || "").toLowerCase() === "sold").length;

    const totalMilk7d = Object.values(milk7d).reduce((a, b) => a + (Number(b) || 0), 0);
    return { total, active, lactating, sold, totalMilk7d };
  }, [rows, milk7d]);

  const fetchAll = async (silent = false) => {
    if (!user?.id) return;

    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      // 1) cattle
      const cattleRes = await (supabase as any)
        .from("cattle")
        .select("*")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      if (cattleRes.error) throw cattleRes.error;

      const list: CattleRow[] = (cattleRes.data || []) as any;
      setRows(list);

      // 2) milk logs aggregate last 7 days (optional)
      const since = toISODate(new Date(Date.now() - 6 * 86400000)); // include today -> 7 days window
      const logsRes = await (supabase as any)
        .from("cattle_milk_logs")
        .select("cattle_id, milk_l, log_date")
        .eq("farmer_id", user.id)
        .gte("log_date", since);

      if (logsRes.error) {
        // do not block page if logs table not created yet
        console.warn("milk logs fetch failed", logsRes.error);
        setMilk7d({});
      } else {
        const agg: Record<string, number> = {};
        for (const x of logsRes.data || []) {
          const cid = x.cattle_id as string;
          agg[cid] = (agg[cid] || 0) + Number(x.milk_l || 0);
        }
        setMilk7d(agg);
      }
    } catch (e: any) {
      console.error("Cattle fetch failed:", e);
      toast({
        title: "Cattle load failed",
        description: e?.message || "Could not load cattle data.",
        variant: "destructive",
      });
      setRows([]);
      setMilk7d({});
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openCreate = () => {
    setMode("create");
    setDraft({
      id: "",
      tag_id: "",
      name: "",
      breed: "",
      gender: "female",
      dob: "",
      status: "active",
      lactation_stage: "lactating",
      purchase_date: "",
      purchase_price: "",
      image_url: "",
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = (r: CattleRow) => {
    setMode("edit");
    setDraft({
      id: r.id,
      tag_id: r.tag_id || "",
      name: r.name || "",
      breed: r.breed || "",
      gender: ((r.gender || "female").toLowerCase() === "male" ? "male" : "female") as any,
      dob: r.dob || "",
      status: ((r.status || "active").toLowerCase() as any) || "active",
      lactation_stage: ((r.lactation_stage || "lactating").toLowerCase() as any) || "lactating",
      purchase_date: r.purchase_date || "",
      purchase_price: r.purchase_price != null ? String(r.purchase_price) : "",
      image_url: r.image_url || "",
      notes: r.notes || "",
    });
    setOpen(true);
  };

  const canSave = useMemo(() => {
    if (!user?.id) return false;
    // basic validation
    if (!draft.tag_id.trim()) return false;
    if (!draft.breed.trim()) return false;
    return true;
  }, [user?.id, draft.tag_id, draft.breed]);

  const save = async () => {
    if (!user?.id) return;
    if (!canSave) {
      toast({
        title: "Missing required fields",
        description: "Tag ID and Breed are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        farmer_id: user.id,
        tag_id: draft.tag_id.trim(),
        name: draft.name.trim() || null,
        breed: draft.breed.trim() || null,
        gender: draft.gender || null,
        dob: draft.dob || null,
        status: draft.status || "active",
        lactation_stage: draft.lactation_stage || null,
        purchase_date: draft.purchase_date || null,
        purchase_price: draft.purchase_price ? Number(draft.purchase_price) : null,
        image_url: safeUrl(draft.image_url) || null,
        notes: draft.notes.trim() || null,
      };

      if (mode === "create") {
        const res = await (supabase as any).from("cattle").insert(payload).select("*").single();
        if (res.error) throw res.error;

        toast({
          title: "Cattle added ✅",
          description: `${payload.breed}${payload.name ? ` • ${payload.name}` : ""}`,
        });
      } else {
        const res = await (supabase as any)
          .from("cattle")
          .update(payload)
          .eq("id", draft.id)
          .eq("farmer_id", user.id)
          .select("*")
          .single();

        if (res.error) throw res.error;

        toast({ title: "Cattle updated ✅" });
      }

      setOpen(false);
      await fetchAll(true);
    } catch (e: any) {
      console.error("save cattle failed", e);
      toast({
        title: "Save failed",
        description: e?.message || "Could not save cattle.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (r: CattleRow) => {
    setDeleteTarget(r);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!user?.id || !deleteTarget) return;

    setDeleting(true);
    try {
      const res = await (supabase as any)
        .from("cattle")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("farmer_id", user.id);

      if (res.error) throw res.error;

      toast({ title: "Deleted ✅", description: deleteTarget.tag_id || "Cattle removed" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchAll(true);
    } catch (e: any) {
      console.error("delete cattle failed", e);
      toast({
        title: "Delete failed",
        description: e?.message || "Could not delete cattle.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const goMilkLogs = (cattleId: string) => {
  navigate(`/farmer/cattle-milk/${cattleId}`);
};

  return (
    <>
      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cattle?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently remove <b>{deleteTarget.tag_id || "this record"}</b> and its linked milk logs
                  (if any).
                </>
              ) : (
                "This will permanently remove the record."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: FARMER_GREEN }}
              >
                <Beef className="h-5 w-5" />
              </div>
              {mode === "create" ? "Add Cattle" : "Edit Cattle"}
            </DialogTitle>
            <DialogDescription>
              Keep it clean: Tag ID + breed required. (Image URL optional)
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tag ID */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Tag ID *</p>
              <Input
                value={draft.tag_id}
                onChange={(e) => setDraft((d) => ({ ...d, tag_id: e.target.value }))}
                placeholder="e.g. MM-001"
                className="rounded-2xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Same farmer ke andar Tag ID unique rakho.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Name (optional)</p>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Gauri"
                className="rounded-2xl"
              />
            </div>

            {/* Breed dropdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Breed *</p>
              <select
                className="w-full h-11 rounded-2xl border bg-background px-3 text-sm"
                value={draft.breed}
                onChange={(e) => setDraft((d) => ({ ...d, breed: e.target.value }))}
              >
                <option value="">Select breed</option>
                {BREEDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Gender</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={draft.gender === "female" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setDraft((d) => ({ ...d, gender: "female" }))}
                >
                  Female
                </Button>
                <Button
                  type="button"
                  variant={draft.gender === "male" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setDraft((d) => ({ ...d, gender: "male" }))}
                >
                  Male
                </Button>
              </div>
            </div>

            {/* DOB */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">DOB</p>
              <Input
                type="date"
                value={draft.dob}
                onChange={(e) => setDraft((d) => ({ ...d, dob: e.target.value }))}
                className="rounded-2xl"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Status</p>
              <select
                className="w-full h-11 rounded-2xl border bg-background px-3 text-sm"
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as any }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Lactation */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Lactation Stage</p>
              <select
                className="w-full h-11 rounded-2xl border bg-background px-3 text-sm"
                value={draft.lactation_stage}
                onChange={(e) => setDraft((d) => ({ ...d, lactation_stage: e.target.value as any }))}
              >
               <option value="lactating">Lactating</option>
                <option value="dry">Dry</option>
                <option value="pregnant">Pregnant</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Purchase date */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Purchase Date</p>
              <Input
                type="date"
                value={draft.purchase_date}
                onChange={(e) => setDraft((d) => ({ ...d, purchase_date: e.target.value }))}
                className="rounded-2xl"
              />
            </div>

            {/* Purchase price */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Purchase Price (₹)</p>
              <Input
                type="number"
                min={0}
                value={draft.purchase_price}
                onChange={(e) => setDraft((d) => ({ ...d, purchase_price: e.target.value }))}
                placeholder="e.g. 45000"
                className="rounded-2xl"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Image URL (optional)</p>
              <Input
                value={draft.image_url}
                onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                placeholder="https://..."
                className="rounded-2xl"
              />
              {safeUrl(draft.image_url) ? (
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden border border-border/60 bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeUrl(draft.image_url)!}
                      alt="cattle"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80";
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Preview</p>
                    <p className="text-xs text-muted-foreground truncate">{safeUrl(draft.image_url)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Only direct http/https URL supported.</p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Notes</p>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                className="min-h-[90px] w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none"
                placeholder="Health notes, vaccination reminders, etc..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              style={{ backgroundColor: FARMER_GREEN }}
              onClick={save}
              disabled={saving || !canSave}
            >
              {saving ? "Saving..." : mode === "create" ? "Add Cattle" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAIN */}
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: FARMER_GREEN }}
              >
                <Beef className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-extrabold text-foreground truncate">Cattle Management</p>
                <p className="text-sm text-muted-foreground">Add cattle, manage details, and open milk logs per cattle.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => fetchAll(true)}
              disabled={refreshing}
            >
              <RefreshCcw className={cn("h-4 w-4 mr-2", refreshing ? "animate-spin" : "")} />
              Refresh
            </Button>
            <Button className="rounded-2xl" style={{ backgroundColor: FARMER_GREEN }} onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cattle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Total Cattle</p>
                <Badge variant="secondary" className="rounded-full">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Live
                </Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Active</p>
                <Badge className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Lactating</p>
                <Badge className="rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  <Droplets className="h-3.5 w-3.5 mr-1" />
                  Milk
                </Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.lactating}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Total Milk (7 days)</p>
                <Badge variant="secondary" className="rounded-full">
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  7D
                </Badge>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-foreground">
                {Number(stats.totalMilk7d || 0).toFixed(1)}L
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by tag / name / breed / status..."
                  className="pl-9 rounded-2xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 h-11">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="bg-transparent text-sm outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 h-11">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="bg-transparent text-sm outline-none"
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as any)}
                  >
                    <option value="all">All gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="border-border/60 overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Your Cattle</CardTitle>
          </CardHeader>

          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center bg-background border border-border/60">
                  <Beef className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 font-semibold text-foreground">No cattle found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first cattle (Tag ID + Breed) and start logging milk.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button className="rounded-2xl" style={{ backgroundColor: FARMER_GREEN }} onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cattle
                  </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={() => fetchAll(true)}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const img = safeUrl(r.image_url);
                  const litres = Number(milk7d[r.id] || 0);

                  return (
                    <div
                      key={r.id}
                      className="rounded-3xl border border-border/60 bg-card p-4 md:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 rounded-2xl border border-border/60 bg-muted/20 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt="cattle"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80";
                                }}
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-extrabold text-foreground truncate">
                                {r.tag_id || "—"}{" "}
                                {r.name ? <span className="text-muted-foreground font-semibold">• {r.name}</span> : null}
                              </p>

                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border",
                                  statusTone(r.status)
                                )}
                              >
                                {labelStatus(r.status)}
                              </span>

                              {r.lactation_stage ? (
                                <Badge variant="secondary" className="rounded-full">
                                  <Droplets className="h-3.5 w-3.5 mr-1" />
                                  {(r.lactation_stage || "").toUpperCase()}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Breed: <b className="text-foreground">{r.breed || "—"}</b>
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <Baby className="h-3.5 w-3.5" />
                                Gender: <b className="text-foreground">{labelGender(r.gender)}</b>
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                DOB: <b className="text-foreground">{r.dob || "—"}</b>
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <Droplets className="h-3.5 w-3.5" />
                                Milk (7d): <b className="text-foreground">{litres.toFixed(1)}L</b>
                              </span>
                            </div>

                            {r.notes ? (
                              <div className="mt-2 text-sm text-foreground/90 line-clamp-2">
                                {r.notes}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 md:justify-end">
                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => goMilkLogs(r.id)}
                          >
                            <NotebookPen className="h-4 w-4 mr-2" />
                            Milk Logs
                          </Button>

                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            className="rounded-2xl border-red-200 text-red-700 hover:text-red-800 hover:bg-red-50"
                            onClick={() => askDelete(r)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* micro badges row */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          <HeartPulse className="h-3.5 w-3.5 mr-1" />
                          Health
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          <Syringe className="h-3.5 w-3.5 mr-1" />
                          Vaccination
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                          Updated: {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}