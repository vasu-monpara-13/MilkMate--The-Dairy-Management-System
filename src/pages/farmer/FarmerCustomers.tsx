// src/pages/farmer/FarmerCustomers.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Search,
  RefreshCcw,
  Users,
  Phone,
  Mail,
  Package,
  Calendar,
  Clock,
  Droplets,
  Eye,
  Layers,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role: string | null;
  timezone: string | null;
};

type SubscriptionRow = {
  id: string;
  customer_id: string; // can be auth.user_id OR profiles.id (old data)
  farmer_id: string; // can be auth.user_id OR profiles.id (old data)
  product_id: string | null;
  qty: number | null;
  shift: string | null;
  status: string | null; // active / cancelled
  start_date: string | null;
  plan_mode: string | null;
  created_at: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
};

type ViewSub = {
  sub: SubscriptionRow;
  productName: string;
};

type CustomerGroup = {
  customerKey: string; // ALWAYS normalized to user_id if possible
  customer: ProfileRow | null;
  subs: ViewSub[];
};

const FARMER_GREEN = "#0ccf3d";

function safeLower(v: unknown) {
  return String(v ?? "").toLowerCase();
}

function formatDate(d: string | null) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

function shiftLabel(s: string | null) {
  if (!s) return "-";
  return s;
}

function statusLower(s: string | null) {
  return (s ?? "").toLowerCase();
}

export default function FarmerCustomers() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [profilesByKey, setProfilesByKey] = useState<Record<string, ProfileRow>>({});
  // ✅ alias: profiles.id -> profiles.user_id (so old/new ids merge perfectly)
  const [aliasToUserId, setAliasToUserId] = useState<Record<string, string>>({});
  const [productNameById, setProductNameById] = useState<Record<string, string>>({});

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "cancelled">("all");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{
    customer: ProfileRow | null;
    sub: SubscriptionRow;
    productName: string;
  } | null>(null);

  function getCustomerKey(rawCustomerId: string) {
    // ✅ if raw is profiles.id, map to user_id
    const viaAlias = aliasToUserId[rawCustomerId];
    if (viaAlias) return String(viaAlias);

    // ✅ if raw itself is user_id, keep it
    return String(rawCustomerId);
  }

  function resolveCustomer(rawCustomerId: string): ProfileRow | null {
    // try direct (raw could be user_id or profile.id)
    const direct = profilesByKey[rawCustomerId];
    if (direct) return direct;

    // if raw was profile.id, map to user_id then resolve
    const uid = aliasToUserId[rawCustomerId];
    if (uid && profilesByKey[uid]) return profilesByKey[uid];

    return null;
  }

  async function fetchAll(isRefresh = false) {
    if (!user?.id) return;

    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      // 0) farmer profile id (because old data may store farmer_id as profiles.id)
      const farmerProfileRes = await supabase
        .from("profiles" as any)
        .select("id,user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const farmerProfileId = (farmerProfileRes.data as any)?.id as string | undefined;

      // 1) subscriptions (match farmer_id by BOTH auth.user_id + profiles.id)
      // ✅ Use IN() to avoid OR-string edge cases + ensure we never accidentally fetch only one row.
      const farmerIds = Array.from(
        new Set([String(user.id), farmerProfileId ? String(farmerProfileId) : ""].filter(Boolean))
      );

      const { data: subData, error: subErr } = await supabase
        .from("customer_subscriptions" as any)
        .select("*")
        .in("farmer_id", farmerIds)
        .order("created_at", { ascending: false });

      if (subErr) throw subErr;

      const rows: SubscriptionRow[] = (subData as any) ?? [];
      setSubs(rows);

      // 2) products
      const productIds = Array.from(
        new Set(rows.map((r) => r.product_id).filter((x): x is string => !!x))
      );

      const prodMap: Record<string, string> = {};
      if (productIds.length) {
        const { data: prodData, error: prodErr } = await supabase
          .from("products" as any)
          .select("id,name")
          .in("id", productIds);

        if (prodErr) throw prodErr;

        (prodData as any[]).forEach((p: ProductRow) => {
          prodMap[String(p.id)] = String(p.name ?? "—");
        });
      }
      setProductNameById(prodMap);

      // 3) customer profiles (customer_id can be user_id OR profiles.id)
      const customerKeys = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean)));

      const merged: Record<string, ProfileRow> = {};
      const alias: Record<string, string> = {};

      if (customerKeys.length) {
        const selectCols = "id,user_id,full_name,email,mobile_number,role,timezone";

        const byUserId = await supabase
          .from("profiles" as any)
          .select(selectCols)
          .in("user_id", customerKeys);

        const byProfileId = await supabase
          .from("profiles" as any)
          .select(selectCols)
          .in("id", customerKeys);

        const allProfiles = [
          ...((((byUserId.data as any[]) ?? []) as ProfileRow[])),
          ...((((byProfileId.data as any[]) ?? []) as ProfileRow[])),
        ];

        allProfiles.forEach((p) => {
          if (p.user_id) merged[String(p.user_id)] = p; // key by user_id
          if (p.id) {
            merged[String(p.id)] = p; // key by profile.id
            alias[String(p.id)] = String(p.user_id); // ✅ profile.id -> user_id
          }
        });
      }

      setProfilesByKey(merged);
      setAliasToUserId(alias);
    } catch (e) {
      console.error("FarmerCustomers fetch error:", e);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const viewSubs: ViewSub[] = useMemo(() => {
    return subs.map((sub) => {
      const productName =
        sub.product_id && productNameById[sub.product_id]
          ? productNameById[sub.product_id]
          : "—";
      return { sub, productName };
    });
  }, [subs, productNameById]);

  const filteredSubs: ViewSub[] = useMemo(() => {
    const q = safeLower(query).trim();

    return viewSubs.filter((r) => {
      const st = statusLower(r.sub.status);

      if (tab === "active" && st !== "active") return false;
      if (tab === "cancelled" && st !== "cancelled") return false;

      if (!q) return true;

      // ✅ IMPORTANT: resolve customer using BOTH raw + alias
      const customer = resolveCustomer(r.sub.customer_id);

      const name = safeLower(customer?.full_name);
      const email = safeLower(customer?.email);
      const phone = safeLower(customer?.mobile_number);
      const product = safeLower(r.productName);
      const shift = safeLower(r.sub.shift);
      const plan = safeLower(r.sub.plan_mode);

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        product.includes(q) ||
        shift.includes(q) ||
        plan.includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSubs, query, tab, profilesByKey, aliasToUserId]);

  // ✅ GROUP BY NORMALIZED customerKey (always user_id if profile exists)
  const groups: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, CustomerGroup>();

    filteredSubs.forEach((v) => {
      const customerKey = getCustomerKey(v.sub.customer_id);
      const customer = resolveCustomer(v.sub.customer_id);

      if (!map.has(customerKey)) {
        map.set(customerKey, { customerKey, customer, subs: [] });
      }

      map.get(customerKey)!.subs.push(v);
    });

    const arr = Array.from(map.values());

    // sort subs inside each group by created_at desc
    arr.forEach((g) => {
      g.subs.sort((a, b) => {
        const at = a.sub.created_at ? new Date(a.sub.created_at).getTime() : 0;
        const bt = b.sub.created_at ? new Date(b.sub.created_at).getTime() : 0;
        return bt - at;
      });
    });

    // sort customers: active first, then latest activity
    arr.sort((a, b) => {
      const aActive = a.subs.some((x) => statusLower(x.sub.status) === "active") ? 1 : 0;
      const bActive = b.subs.some((x) => statusLower(x.sub.status) === "active") ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      const aLatest = a.subs[0]?.sub.created_at ? new Date(a.subs[0].sub.created_at).getTime() : 0;
      const bLatest = b.subs[0]?.sub.created_at ? new Date(b.subs[0].sub.created_at).getTime() : 0;
      return bLatest - aLatest;
    });

    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSubs, profilesByKey, aliasToUserId]);

  const stats = useMemo(() => {
    const uniqueCustomers = new Set(subs.map((s) => getCustomerKey(s.customer_id))).size;
    const active = subs.filter((s) => statusLower(s.status) === "active").length;
    const cancelled = subs.filter((s) => statusLower(s.status) === "cancelled").length;
    const totalQty = subs.reduce((sum, s) => sum + Number(s.qty ?? 0), 0);
    return { uniqueCustomers, active, cancelled, totalQty };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, aliasToUserId]);

  const tabsCount = useMemo(() => {
    const all = viewSubs.length;
    const active = viewSubs.filter((r) => statusLower(r.sub.status) === "active").length;
    const cancelled = viewSubs.filter((r) => statusLower(r.sub.status) === "cancelled").length;
    return { all, active, cancelled };
  }, [viewSubs]);

  function openDetails(customer: ProfileRow | null, row: ViewSub) {
    setSelected({ customer, sub: row.sub, productName: row.productName });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight">Customers</div>
          <div className="text-sm text-muted-foreground">
            Customer-wise view — <span className="font-medium">multiple subscriptions</span> neatly grouped.
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchAll(true)}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: FARMER_GREEN }} />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.uniqueCustomers}</CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Active
              </Badge>
              Running subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.active}</CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge className="bg-rose-500/10 text-rose-700 border border-rose-500/20">
                Cancelled
              </Badge>
              Stopped subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.cancelled}</CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-sky-600" />
              Total Qty
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalQty}L</CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name / phone / email / product / shift / plan..."
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={tab === "all" ? "default" : "outline"}
                onClick={() => setTab("all")}
                className="h-9"
              >
                All <span className="ml-2 text-xs opacity-80">{tabsCount.all}</span>
              </Button>
              <Button
                variant={tab === "active" ? "default" : "outline"}
                onClick={() => setTab("active")}
                className="h-9"
              >
                Active <span className="ml-2 text-xs opacity-80">{tabsCount.active}</span>
              </Button>
              <Button
                variant={tab === "cancelled" ? "default" : "outline"}
                onClick={() => setTab("cancelled")}
                className="h-9"
              >
                Cancelled <span className="ml-2 text-xs opacity-80">{tabsCount.cancelled}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Customer Subscriptions (Grouped)
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading customers...</div>
          ) : groups.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No customers found. Try changing filters/search.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {groups.map((g) => {
                const customerName = g.customer?.full_name || "Customer";
                const phone = g.customer?.mobile_number || "-";
                const email = g.customer?.email || "-";

                const activeCount = g.subs.filter((x) => statusLower(x.sub.status) === "active").length;
                const cancelledCount = g.subs.filter((x) => statusLower(x.sub.status) === "cancelled").length;
                const totalQty = g.subs.reduce((sum, x) => sum + Number(x.sub.qty ?? 0), 0);

                return (
                  <AccordionItem
                    key={g.customerKey}
                    value={g.customerKey}
                    className="rounded-xl border border-border/60 px-3 data-[state=open]:bg-muted/20"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pr-2">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-base font-semibold">{customerName}</div>

                            {activeCount > 0 && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                {activeCount} Active
                              </Badge>
                            )}
                            {cancelledCount > 0 && (
                              <Badge className="bg-rose-500/10 text-rose-700 border border-rose-500/20">
                                {cancelledCount} Cancelled
                              </Badge>
                            )}

                            <Badge className="bg-slate-500/10 text-slate-700 border border-slate-500/20">
                              {g.subs.length} Subs
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5" />
                              {phone}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5" />
                              {email}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Droplets className="h-3.5 w-3.5" />
                              Total: <span className="text-foreground font-medium">{totalQty}L</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground text-left lg:text-right">
                          Click to expand subscriptions
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-4">
                      <div className="space-y-2 pt-2">
                        {g.subs.map((r) => {
                          const st = statusLower(r.sub.status);
                          const isActive = st === "active";

                          return (
                            <div
                              key={r.sub.id}
                              className="rounded-xl border border-border/60 p-3 hover:bg-muted/30 transition flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {isActive ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-rose-600" />
                                  )}
                                  <div className="text-sm font-semibold">{r.productName}</div>

                                  {isActive ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-rose-500/10 text-rose-700 border border-rose-500/20">
                                      Cancelled
                                    </Badge>
                                  )}

                                  {r.sub.plan_mode ? (
                                    <Badge className="bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                                      {r.sub.plan_mode}
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                  <span className="inline-flex items-center gap-2">
                                    <Droplets className="h-4 w-4" />
                                    Qty:{" "}
                                    <span className="text-foreground font-medium">
                                      {Number(r.sub.qty ?? 0)}L
                                    </span>
                                  </span>

                                  <span className="inline-flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Shift:{" "}
                                    <span className="text-foreground font-medium">
                                      {shiftLabel(r.sub.shift)}
                                    </span>
                                  </span>

                                  <span className="inline-flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Start:{" "}
                                    <span className="text-foreground font-medium">
                                      {formatDate(r.sub.start_date)}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end">
                                <Button
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => openDetails(g.customer, r)}
                                >
                                  <Eye className="h-4 w-4" /> View
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: FARMER_GREEN }} />
              Customer Details
            </DialogTitle>
            <DialogDescription>
              Selected subscription + customer info (name + product + contact).
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="text-lg font-semibold">
                    {selected.customer?.full_name || "Customer"}
                  </div>

                  <div className="flex items-center gap-2">
                    {statusLower(selected.sub.status) === "active" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 border border-rose-500/20">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone</span>
                      <span className="ml-auto font-medium">
                        {selected.customer?.mobile_number || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email</span>
                      <span className="ml-auto font-medium">
                        {selected.customer?.email || "-"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">Subscription</div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Product</span>
                      <span className="ml-auto font-medium">{selected.productName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="ml-auto font-medium">
                        {Number(selected.sub.qty ?? 0)}L
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Shift</span>
                      <span className="ml-auto font-medium">{shiftLabel(selected.sub.shift)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="ml-auto font-medium">{formatDate(selected.sub.start_date)}</span>
                    </div>

                    {selected.sub.plan_mode ? (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Plan</span>
                        <span className="ml-auto font-medium">{selected.sub.plan_mode}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground">
                    Subscription ID: <span className="font-mono">{selected.sub.id}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button className="gap-2" onClick={() => fetchAll(true)}>
              <RefreshCcw className="h-4 w-4" />
              Refresh Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}