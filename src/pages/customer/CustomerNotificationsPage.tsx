import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ExternalLink,
  MailOpen,
  RefreshCcw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DbNotification = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  is_read: boolean | null;
  action_url: string | null;
  created_at: string | null;
};

type UiNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function typeBadgeClass(type?: string) {
  const v = String(type || "info").toLowerCase();

  if (v.includes("billing") || v.includes("payment")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (v.includes("delivery")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (v.includes("subscription")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (v.includes("warning") || v.includes("alert")) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function prettyType(type?: string) {
  const v = String(type || "info").trim();
  if (!v) return "Info";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function NotificationSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-40 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-[80%] rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function CustomerNotificationsPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UiNotification[]>([]);
  const [busy, setBusy] = useState(false);

  const unreadCount = useMemo(() => list.filter((x) => !x.is_read).length, [list]);

  const filtered = useMemo(() => {
    if (tab === "unread") return list.filter((x) => !x.is_read);
    return list;
  }, [list, tab]);

  const fetchNotifications = async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) setRefreshing(true);
    setError(null);

    const sb: any = supabase;

    const res = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (res.error) {
      setError(res.error.message);
      setList([]);
      if (showRefresh) setRefreshing(false);
      return;
    }

    const rows: DbNotification[] = (res.data ?? []) as DbNotification[];

    const ui: UiNotification[] = rows
      .filter((n) => !!n.id)
      .map((n) => ({
        id: n.id,
        title: (n.title ?? "Notification").trim(),
        body: String(n.body ?? "").trim(),
        type: String(n.type ?? "info"),
        is_read: Boolean(n.is_read),
        action_url: n.action_url ?? null,
        created_at: (n.created_at ?? new Date().toISOString()) as string,
      }));

    setList(ui);
    if (showRefresh) setRefreshing(false);
  };

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) return;
      setLoading(true);
      await fetchNotifications();
      if (alive) setLoading(false);
    };

    run();

    const ch = (supabase as any)
      .channel(`notifications:${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      alive = false;
      try {
        (supabase as any).removeChannel(ch);
      } catch {}
    };
  }, [user?.id]);

  const markOneRead = async (id: string) => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);

    const sb: any = supabase;
    const res = await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (res.error) setError(res.error.message);

    await fetchNotifications();
    setBusy(false);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);

    const sb: any = supabase;
    const res = await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (res.error) setError(res.error.message);

    await fetchNotifications();
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <Card className="rounded-3xl border-slate-200/70 bg-white/85 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Bell className="h-3.5 w-3.5" />
                Notification Center
              </div>

              <CardTitle className="mt-4 flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Notifications
                {unreadCount > 0 ? (
                  <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    {unreadCount} new
                  </Badge>
                ) : null}
              </CardTitle>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Latest activity about your deliveries, subscription and billing.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => nav("/customer")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => fetchNotifications(true)}
                disabled={refreshing || loading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>

              <Button
                className="rounded-2xl"
                onClick={markAllRead}
                disabled={busy || unreadCount === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
            <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-2xl">
              <TabsTrigger className="rounded-2xl" value="all">
                All
              </TabsTrigger>
              <TabsTrigger className="rounded-2xl" value="unread">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator />

          {loading ? (
            <div className="space-y-3">
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <MailOpen className="h-6 w-6 text-slate-500 dark:text-slate-300" />
              </div>
              <div className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                No notifications yet
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                New updates will appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    n.is_read
                      ? "border-slate-200/70 bg-white/75 dark:border-slate-700/70 dark:bg-slate-900/65"
                      : "border-sky-200 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/20"
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                          {n.title}
                        </div>

                        {!n.is_read ? (
                          <Badge variant="secondary" className="rounded-full">
                            NEW
                          </Badge>
                        ) : null}

                        <Badge
                          variant="outline"
                          className={cn("rounded-full", typeBadgeClass(n.type))}
                        >
                          {prettyType(n.type)}
                        </Badge>
                      </div>

                      <div className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
                        {n.body || "—"}
                      </div>

                      <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {timeAgo(n.created_at)} • {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {n.action_url ? (
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => nav(n.action_url!)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                      ) : null}

                      {!n.is_read ? (
                        <Button
                          className="rounded-2xl"
                          disabled={busy}
                          onClick={() => markOneRead(n.id)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            Realtime updates work only if notifications realtime is enabled in Supabase.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}