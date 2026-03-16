import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCcw,
  MessageSquareText,
  Clock3,
  Filter,
  Send,
  User,
  Shield,
  Inbox,
  Sparkles,
  Ticket,
  Bot,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string | null;
  priority: string | null;
  category?: string | null;
  ai_mode?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: string | null;
  message: string;
  is_ai?: boolean | null;
  created_at: string | null;
};

type ProfileLite = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";
type PriorityFilter = "all" | "low" | "medium" | "high";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "Resolved";
  if (s === "in_progress") return "In Progress";
  if (s === "closed") return "Closed";
  return "Open";
}

function statusTone(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "resolved") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300";
  }
  if (s === "in_progress") {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
  }
  if (s === "closed") {
    return "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300";
  }

  return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300";
}

function priorityTone(priority?: string | null) {
  const p = String(priority || "").toLowerCase();

  if (p === "high") {
    return "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300";
  }
  if (p === "low") {
    return "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300";
  }

  return "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300";
}

function priorityLabel(priority?: string | null) {
  const p = String(priority || "").toLowerCase();
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

export default function AdminSupportTicketPage() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({});
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [thread, setThread] = useState<TicketMessageRow[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const [reply, setReply] = useState("");
  const [adminStatus, setAdminStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("open");
  const [adminPriority, setAdminPriority] = useState<"low" | "medium" | "high">("medium");

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const cannedReplies = [
    "Please refresh dashboard and check Track Delivery once.",
    "Please share screenshot and exact date/time of issue.",
    "We are reviewing your ticket and will update you shortly.",
    "Your issue has been forwarded to the concerned support team.",
  ];

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);

      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const rows = ((data ?? []) as TicketRow[]) || [];
      setTickets(rows);

      const uniqueUserIds = Array.from(
        new Set(rows.map((t) => String(t.user_id || "")).filter(Boolean))
      );

      if (uniqueUserIds.length > 0) {
        const { data: profiles, error: profileErr } = await (supabase as any)
          .from("profiles")
          .select("user_id,full_name,email")
          .in("user_id", uniqueUserIds);

        if (!profileErr) {
          const nextMap: Record<string, ProfileLite> = {};
          for (const p of (profiles ?? []) as ProfileLite[]) {
            nextMap[String(p.user_id)] = p;
          }
          setProfilesMap(nextMap);
        }
      } else {
        setProfilesMap({});
      }
    } catch (error: any) {
      console.error("fetchTickets error:", error);
      toast({
        title: "Tickets load failed",
        description: error?.message ?? "Unable to load support tickets",
        variant: "destructive",
      });
      setTickets([]);
      setProfilesMap({});
      setSelectedTicket(null);
      setThread([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchThread = async (ticketId: string) => {
    if (!ticketId) {
      setThread([]);
      return;
    }

    try {
      setLoadingThread(true);

      const { data, error } = await (supabase as any)
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setThread(((data ?? []) as TicketMessageRow[]) || []);
    } catch (error: any) {
      console.error("fetchThread error:", error);
      toast({
        title: "Conversation load failed",
        description: error?.message ?? "Unable to load ticket conversation",
        variant: "destructive",
      });
      setThread([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const markAdminSeen = async (ticketId: string) => {
    if (!ticketId) return;

    try {
      await (supabase as any)
        .from("support_tickets")
        .update({
          admin_last_seen_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
    } catch {
      //
    }
  };

  const updateTicketMeta = async () => {
    if (!selectedTicket?.id) return;

    try {
      setSavingMeta(true);

      const { error } = await (supabase as any)
        .from("support_tickets")
        .update({
          status: adminStatus,
          priority: adminPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      await markAdminSeen(selectedTicket.id);

      toast({
        title: "Ticket updated ✅",
        description: "Status and priority updated successfully.",
      });

      await fetchTickets();
    } catch (error: any) {
      console.error("updateTicketMeta error:", error);
      toast({
        title: "Update failed",
        description: error?.message ?? "Could not update ticket",
        variant: "destructive",
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const generateAiReply = async () => {
    if (!selectedTicket?.id) {
      toast({
        title: "No ticket selected",
        description: "Please select a ticket first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai-reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketId: selectedTicket.id,
            mode: "suggest",
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "AI reply generate failed");
      }

      if (data?.reply) {
        setReply(data.reply);
        toast({
          title: "AI reply ready ✨",
          description: "Suggested reply has been generated.",
        });
      } else {
        throw new Error("No AI reply returned");
      }
    } catch (err: any) {
      console.error("generateAiReply error:", err);
      toast({
        title: "AI reply failed",
        description: err?.message || "Could not generate AI reply",
        variant: "destructive",
      });
    }
  };

  const sendReply = async () => {
    if (!user?.id || !selectedTicket?.id || !reply.trim()) return;

    try {
      setSendingReply(true);

      const replyText = reply.trim();

      const { error: msgErr } = await (supabase as any)
        .from("support_ticket_messages")
        .insert([
          {
            ticket_id: selectedTicket.id,
            sender_id: user.id,
            sender_role: "admin",
            message: replyText,
            is_ai: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (msgErr) throw msgErr;

      const statusToSave =
        adminStatus === "resolved" || adminStatus === "closed" ? adminStatus : "in_progress";

      const { error: ticketErr } = await (supabase as any)
        .from("support_tickets")
        .update({
          status: statusToSave,
          priority: adminPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (ticketErr) throw ticketErr;

      await markAdminSeen(selectedTicket.id);

      setReply("");

      toast({
        title: "Reply sent ✅",
        description: "Customer conversation updated.",
      });

      await fetchTickets();
      await fetchThread(selectedTicket.id);
    } catch (error: any) {
      console.error("sendReply error:", error);
      toast({
        title: "Reply failed",
        description: error?.message ?? "Could not send reply",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const name = profilesMap[String(ticket.user_id)]?.full_name || "";
      const email = profilesMap[String(ticket.user_id)]?.email || "";

      const matchesQuery =
        !q ||
        ticket.subject?.toLowerCase().includes(q) ||
        ticket.message?.toLowerCase().includes(q) ||
        String(ticket.id).toLowerCase().includes(q) ||
        String(name).toLowerCase().includes(q) ||
        String(email).toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || String(ticket.status || "open").toLowerCase() === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        String(ticket.priority || "medium").toLowerCase() === priorityFilter;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [tickets, profilesMap, query, statusFilter, priorityFilter]);

  useEffect(() => {
    if (filteredTickets.length === 0) {
      setSelectedTicket(null);
      setThread([]);
      return;
    }

    setSelectedTicket((prev) => {
      if (!prev) return filteredTickets[0];
      return filteredTickets.find((t) => t.id === prev.id) ?? filteredTickets[0];
    });
  }, [filteredTickets]);

  useEffect(() => {
    if (selectedTicket?.id) {
      setAdminStatus(
        (String(selectedTicket.status || "open").toLowerCase() as
          | "open"
          | "in_progress"
          | "resolved"
          | "closed") || "open"
      );
      setAdminPriority(
        (String(selectedTicket.priority || "medium").toLowerCase() as "low" | "medium" | "high") ||
          "medium"
      );
      fetchThread(selectedTicket.id);
      markAdminSeen(selectedTicket.id);
    } else {
      setThread([]);
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        //
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const channel = (supabase as any)
      .channel(`admin-ticket-thread-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload: any) => {
          setThread((prev) => {
            const exists = prev.some((x) => x.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        //
      }
    };
  }, [selectedTicket?.id]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => String(t.status || "").toLowerCase() === "open").length;
    const inProgress = tickets.filter(
      (t) => String(t.status || "").toLowerCase() === "in_progress"
    ).length;
    const resolved = tickets.filter((t) =>
      ["resolved", "closed"].includes(String(t.status || "").toLowerCase())
    ).length;
    return { total, open, inProgress, resolved };
  }, [tickets]);

  const selectedUser = selectedTicket ? profilesMap[String(selectedTicket.user_id)] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mx-auto max-w-7xl space-y-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-10 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute top-20 right-10 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            MilkMate Support Center PRO
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Admin Support Tickets
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Customer issues, ticket conversations, reply management and support workflow — all in one premium panel.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl" onClick={fetchTickets}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tickets</p>
            <p className="mt-1 text-2xl font-black">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="mt-1 text-2xl font-black">{stats.open}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="mt-1 text-2xl font-black">{stats.inProgress}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="mt-1 text-2xl font-black">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
        <CardContent className="p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.35fr_0.35fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject, message, customer name, email..."
                className="h-12 rounded-2xl pl-10"
              />
            </div>

            <select
              className="h-12 rounded-2xl border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              className="h-12 rounded-2xl border border-input bg-background px-3 text-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-2xl font-black">Ticket Inbox</CardTitle>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {filteredTickets.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingTickets ? (
              <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                Loading tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Ticket className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">No tickets found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search ya filter reset karke dobara try karo.
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const customer = profilesMap[String(ticket.user_id)];
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      "w-full rounded-[26px] border border-white/60 bg-white/70 p-5 text-left shadow-sm transition-all dark:bg-white/5",
                      selectedTicket?.id === ticket.id
                        ? "ring-2 ring-primary/30 border-primary/30"
                        : "hover:border-primary/20"
                    )}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold text-foreground">{ticket.subject}</p>

                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold",
                            statusTone(ticket.status)
                          )}
                        >
                          {prettyStatus(ticket.status)}
                        </span>

                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold",
                            priorityTone(ticket.priority)
                          )}
                        >
                          {priorityLabel(ticket.priority)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {customer?.full_name || "Unknown Customer"}
                        </span>
                        <span>•</span>
                        <span>{customer?.email || ticket.user_id}</span>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {ticket.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(ticket.updated_at)}
                        </span>
                        <span>Ticket ID: {ticket.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-black">Conversation Panel</CardTitle>
              {selectedTicket ? (
                <Badge className={cn("rounded-full border", statusTone(selectedTicket.status))}>
                  {prettyStatus(selectedTicket.status)}
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {!selectedTicket ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">Select a ticket</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Left panel se koi ticket select karo.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[26px] border border-white/60 bg-white/70 p-5 shadow-sm dark:bg-white/5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-black text-foreground">{selectedTicket.subject}</p>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          priorityTone(selectedTicket.priority)
                        )}
                      >
                        {priorityLabel(selectedTicket.priority)}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-500/10 px-4 py-3 text-sm">
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {selectedUser?.full_name || "Unknown Customer"}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedUser?.email || selectedTicket.user_id}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-500/10 px-4 py-3 text-sm">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {formatDateTime(selectedTicket.created_at)}
                        </p>
                        <p className="text-muted-foreground">
                          Updated {formatDateTime(selectedTicket.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Status</label>
                        <select
                          className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                          value={adminStatus}
                          onChange={(e) =>
                            setAdminStatus(
                              e.target.value as "open" | "in_progress" | "resolved" | "closed"
                            )
                          }
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Priority</label>
                        <select
                          className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                          value={adminPriority}
                          onChange={(e) =>
                            setAdminPriority(e.target.value as "low" | "medium" | "high")
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="rounded-2xl"
                        onClick={updateTicketMeta}
                        disabled={savingMeta}
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        {savingMeta ? "Saving..." : "Update Ticket"}
                      </Button>

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => fetchThread(selectedTicket.id)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh Thread
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/60 bg-white/60 p-4 shadow-sm dark:bg-white/5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-bold text-foreground">Conversation</p>
                    {loadingThread ? (
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{thread.length} messages</span>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.86))] p-4 space-y-3 dark:bg-white/5">
                    {loadingThread ? (
                      <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                        Loading conversation...
                      </div>
                    ) : thread.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                        No conversation yet.
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {thread.map((msg) => {
                          const role = String(msg.sender_role || "").toLowerCase();
                          const isCustomer = role === "customer";
                          const isAi = role === "ai";

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className={cn("flex", isCustomer ? "justify-start" : "justify-end")}
                            >
                              <div
                                className={cn(
                                  "max-w-[82%] rounded-3xl px-4 py-3 shadow-sm",
                                  isCustomer
                                    ? "bg-white text-slate-800 border border-white/60 dark:bg-slate-900 dark:text-slate-100 rounded-bl-md"
                                    : isAi
                                    ? "bg-violet-500/10 text-violet-900 border border-violet-500/20 dark:text-violet-200 rounded-br-md"
                                    : "bg-primary text-primary-foreground rounded-br-md"
                                )}
                              >
                                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold opacity-80">
                                  {isCustomer ? (
                                    <User className="h-3.5 w-3.5" />
                                  ) : isAi ? (
                                    <Bot className="h-3.5 w-3.5" />
                                  ) : (
                                    <Shield className="h-3.5 w-3.5" />
                                  )}
                                  <span>{isCustomer ? "Customer" : isAi ? "MilkMate AI" : "Admin"}</span>
                                  <span>•</span>
                                  <span>{formatDateTime(msg.created_at)}</span>
                                </div>

                                <p className="text-sm leading-6 whitespace-pre-wrap break-words">
                                  {msg.message}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {cannedReplies.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setReply(text)}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {adminStatus !== "closed" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={generateAiReply}
                      >
                        ✨ Generate AI Reply
                      </Button>
                    </div>

                    <label className="text-sm font-semibold text-foreground">
                      Reply as Admin
                    </label>

                    <Textarea
                      className="min-h-[120px] rounded-2xl"
                      placeholder="Write support response..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />

                    <Button
                      className="rounded-2xl px-6"
                      onClick={sendReply}
                      disabled={sendingReply || !reply.trim()}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                )}

                {String(selectedTicket.status || "").toLowerCase() === "resolved" && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ticket resolved
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}