import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Mail,
  PhoneCall,
  Search,
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  Sparkles,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Send,
  RefreshCcw,
  Bot,
  User,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "support@milkmate.local";
const SUPPORT_PHONE = "+91XXXXXXXXXX";
const WHATSAPP_NUMBER = "91XXXXXXXXXX";

type Faq = {
  q: string;
  a: string;
  tag: "Billing" | "Delivery" | "Subscription" | "Account";
};

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

export default function CustomerSupportPage() {
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [thread, setThread] = useState<TicketMessageRow[]>([]);
  const [reply, setReply] = useState("");

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const faqs: Faq[] = useMemo(
    () => [
      {
        tag: "Delivery",
        q: "Delivery updated nahi dikh rahi — kya karu?",
        a: "Dashboard refresh karo, Track Delivery check karo. Agar subscription active hai aur aaj ka delivery row missing hai to screenshot ke saath support ticket raise karo.",
      },
      {
        tag: "Subscription",
        q: "Subscription me wrong milk product / mismatch aa raha hai",
        a: "Subscription details verify karo. Agar milk label ya product name galat dikh raha hai to screenshot ke saath ticket raise karo.",
      },
      {
        tag: "Billing",
        q: "Pending bill galat show ho raha hai",
        a: "Billing page me payment history verify karo. Agar paid entry reflect nahi hui ho to payment screenshot aur approx date/time bhejo.",
      },
      {
        tag: "Account",
        q: "Profile update save nahi ho raha",
        a: "Page reload karke dobara try karo. Agar issue continue rahe to support ticket me exact field aur screenshot mention karo.",
      },
    ],
    []
  );

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;

    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tag.toLowerCase().includes(q)
    );
  }, [faqs, query]);

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

  const fetchTickets = async () => {
    if (!user?.id) {
      setTickets([]);
      setSelectedTicket(null);
      return;
    }

    try {
      setLoadingTickets(true);

      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const rows = ((data ?? []) as TicketRow[]) || [];
      setTickets(rows);

      setSelectedTicket((prev) => {
        if (!rows.length) return null;
        if (!prev) return rows[0];
        return rows.find((x) => x.id === prev.id) ?? rows[0];
      });
    } catch (error: any) {
      console.error("fetchTickets error:", error);
      toast({
        title: "Tickets load failed",
        description: error?.message ?? "Unable to load tickets",
        variant: "destructive",
      });
      setTickets([]);
      setSelectedTicket(null);
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
        description: error?.message ?? "Unable to load conversation",
        variant: "destructive",
      });
      setThread([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const markCustomerSeen = async (ticketId: string) => {
  if (!ticketId) return;

  try {
    await (supabase as any)
      .from("support_tickets")
      .update({
        customer_last_seen_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
  } catch {
    //
  }
};

  const triggerAiReply = async (ticketId: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          mode: "auto",
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "AI auto reply failed");
    }

    return data;
  };

  const submitTicket = async () => {
    if (!user?.id) {
      toast({
        title: "Login required",
        description: "Please login first.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing details",
        description: "Subject aur message dono fill karo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        priority,
        ai_mode: "auto",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: insertedTicket, error } = await (supabase as any)
        .from("support_tickets")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      const { error: msgError } = await (supabase as any)
        .from("support_ticket_messages")
        .insert([
          {
            ticket_id: insertedTicket.id,
            sender_id: user.id,
            sender_role: "customer",
            message: payload.message,
            is_ai: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (msgError) throw msgError;

      await markCustomerSeen(insertedTicket.id);
      await triggerAiReply(insertedTicket.id);

      toast({
        title: "Ticket submitted ✅",
        description: "Support team ko ticket mil gaya.",
      });

      setSubject("");
      setMessage("");
      setPriority("medium");

      await fetchTickets();
      setSelectedTicket(insertedTicket);

      setTimeout(async () => {
        await fetchThread(insertedTicket.id);
      }, 700);
    } catch (error: any) {
      console.error("submitTicket error:", error);
      toast({
        title: "Ticket failed",
        description: error?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!user?.id || !selectedTicket?.id || !reply.trim()) return;

    try {
      setSendingReply(true);

      const replyText = reply.trim();

      const { error } = await (supabase as any)
        .from("support_ticket_messages")
        .insert([
          {
            ticket_id: selectedTicket.id,
            sender_id: user.id,
            sender_role: "customer",
            message: replyText,
            is_ai: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      await (supabase as any)
  .from("support_tickets")
  .update({
    status:
      String(selectedTicket.status || "").toLowerCase() === "resolved"
        ? "open"
        : selectedTicket.status || "open",
    updated_at: new Date().toISOString(),
  })
  .eq("id", selectedTicket.id);

await markCustomerSeen(selectedTicket.id);

setReply("");
await fetchThread(selectedTicket.id);
await fetchTickets();

      toast({
        title: "Reply sent",
        description: "Your message has been sent.",
      });
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
  }, [user?.id]);

  useEffect(() => {
  if (selectedTicket?.id) {
    fetchThread(selectedTicket.id);
    markCustomerSeen(selectedTicket.id);
  } else {
    setThread([]);
  }
}, [selectedTicket?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const channel = (supabase as any)
      .channel(`customer-support-thread-${selectedTicket.id}`)
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

  const openWhatsapp = () => {
    const text = encodeURIComponent(
      "Hi MilkMate Support, mujhe help chahiye regarding my account / subscription."
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  };

  const openMail = () => {
    window.open(`mailto:${SUPPORT_EMAIL}`, "_blank");
  };

  const openCall = () => {
    window.open(`tel:${SUPPORT_PHONE}`, "_self");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mx-auto max-w-7xl space-y-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-10 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute top-20 right-10 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
            <Sparkles className="h-3.5 w-3.5" />
            MilkMate Premium Support
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Help & Support Center
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Fast help for delivery, billing, subscriptions and account issues — now fully DB connected.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="rounded-3xl border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
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
      </div>

      <Card className="relative overflow-hidden rounded-[32px] border-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.25)]">
        <CardContent className="relative p-8 md:p-10">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                <LifeBuoy className="h-3.5 w-3.5" />
                Instant support access
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Need urgent help?
              </h2>

              <p className="mt-3 text-sm text-white/90 md:text-base">
                Fastest route is WhatsApp. For billing and formal issues use email. For urgent delivery cases use call.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={openWhatsapp}
                  className="rounded-2xl bg-white text-emerald-700 hover:bg-white/90"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat on WhatsApp
                </Button>

                <Button
                  onClick={openMail}
                  variant="outline"
                  className="rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/15"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>

                <Button
                  onClick={openCall}
                  variant="outline"
                  className="rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/15"
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Call Now
                </Button>
              </div>
            </div>

            <div className="grid w-full max-w-md gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">WhatsApp</p>
                <p className="mt-1 text-lg font-bold">Fastest</p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">Email</p>
                <p className="mt-1 text-lg font-bold">Formal support</p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/70">Call</p>
                <p className="mt-1 text-lg font-bold">Urgent issues</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-black">FAQs</CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {filteredFaqs.length}
              </Badge>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search support help..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 rounded-2xl border-white/50 bg-white/80 pl-10 dark:bg-white/5"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No FAQ found for your search.
              </div>
            ) : (
              filteredFaqs.map((f, idx) => {
                const isOpen = openIndex === idx;

                return (
                  <div
                    key={`${f.q}-${idx}`}
                    className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm dark:bg-white/5"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <div>
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                          {f.tag}
                        </span>
                        <div className="mt-3 text-base font-bold text-foreground">{f.q}</div>
                      </div>

                      <ChevronDown
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">{f.a}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Raise a Ticket</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                className="h-12 rounded-2xl border-white/50 bg-white/80 dark:bg-white/5"
                placeholder="Enter issue subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <select
                className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                className="min-h-[150px] rounded-2xl border-white/50 bg-white/80 dark:bg-white/5"
                placeholder="Explain your issue clearly..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-2xl px-6"
                onClick={submitTicket}
                disabled={submitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={openWhatsapp}
              >
                Share on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-2xl font-black">My Tickets</CardTitle>
              </div>

              <Button variant="outline" className="rounded-2xl" onClick={fetchTickets}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingTickets ? (
              <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Ticket className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">No tickets yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  First support ticket yahin se raise karo.
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
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
                      <p className="truncate text-lg font-bold text-foreground">
                        {ticket.subject}
                      </p>

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
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/50 bg-white/70 shadow-lg backdrop-blur dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-black">Ticket Conversation</CardTitle>
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
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">Select a ticket</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Left side se koi ticket open karo.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[26px] border border-white/60 bg-white/70 p-5 shadow-sm dark:bg-white/5">
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

                  <p className="mt-2 text-sm text-muted-foreground">
                    Created {formatDateTime(selectedTicket.created_at)} • Updated{" "}
                    {formatDateTime(selectedTicket.updated_at)}
                  </p>
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.86))] p-4 space-y-3 shadow-sm dark:bg-white/5">
                  {loadingThread ? (
                    <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                      Loading conversation...
                    </div>
                  ) : thread.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No messages yet.
                    </div>
                  ) : (
                    thread.map((msg) => {
                      const role = String(msg.sender_role || "").toLowerCase();
                      const isCustomer = role === "customer";
                      const isAi = role === "ai";

                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[82%] rounded-3xl px-4 py-3 shadow-sm",
                              isCustomer
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : isAi
                                ? "bg-violet-500/10 text-violet-900 border border-violet-500/20 dark:text-violet-200 rounded-bl-md"
                                : "bg-white text-slate-800 border border-white/60 dark:bg-slate-900 dark:text-slate-100 rounded-bl-md"
                            )}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold opacity-80">
                              {isCustomer ? (
                                <User className="h-3.5 w-3.5" />
                              ) : isAi ? (
                                <Bot className="h-3.5 w-3.5" />
                              ) : (
                                <LifeBuoy className="h-3.5 w-3.5" />
                              )}
                              <span>{isCustomer ? "You" : isAi ? "MilkMate AI" : "Support Team"}</span>
                              <span>•</span>
                              <span>{formatDateTime(msg.created_at)}</span>
                            </div>
                            <p className="text-sm leading-6 whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={chatEndRef} />
                </div>

                {String(selectedTicket.status || "").toLowerCase() !== "closed" && (
                  <div className="rounded-[24px] border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur dark:bg-white/5">
                    <div className="flex items-end gap-3">
                      <Textarea
                        className="min-h-[70px] rounded-2xl resize-none"
                        placeholder="Type your message..."
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <Button
                        className="h-12 rounded-2xl px-5"
                        onClick={sendReply}
                        disabled={sendingReply || !reply.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {String(selectedTicket.status || "").toLowerCase() === "resolved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolved by support
                    </span>
                  ) : String(selectedTicket.status || "").toLowerCase() === "in_progress" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <Clock3 className="h-3.5 w-3.5" />
                      Team is working on this
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Waiting for support review
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}