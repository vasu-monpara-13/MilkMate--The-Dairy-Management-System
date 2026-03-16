// src/components/HelpAssistantBubble.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Search,
  ExternalLink,
  Mail,
  PhoneCall,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * ✅ Features
 * - Desktop: expands LEFT from bubble (right-bottom fixed)
 * - Mobile: FULL-SCREEN bottom sheet
 * - Auto-open when ANY error happens (window error + unhandledrejection)
 * - Also supports manual trigger:
 *    window.dispatchEvent(new CustomEvent("milkmate:error", { detail: { message: "..." } }))
 *
 * ❌ No dark mode styles (only light)
 */

type Faq = {
  tag: "Billing" | "Delivery" | "Subscription" | "Account";
  q: string;
  a: string;
};

export type HelpAssistantBubbleProps = {
  whatsappNumber: string; // no "+"
  supportEmail: string;
  supportPhone: string; // with +91...
};

function isMobileNow() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function safeString(x: any) {
  if (!x) return "";
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

export default function HelpAssistantBubble({
  whatsappNumber,
  supportEmail,
  supportPhone,
}: HelpAssistantBubbleProps) {
  // fallback safety
  const WHATSAPP_NUMBER = (whatsappNumber || "91XXXXXXXXXX").replace("+", "").trim();
  const SUPPORT_EMAIL = (supportEmail || "support@milkmate.local").trim();
  const SUPPORT_PHONE = (supportPhone || "+91XXXXXXXXXX").trim();

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // small “new/error pulse” indicator
  const [pulse, setPulse] = useState(false);
  const lastAutoOpenAt = useRef<number>(0);

  // UI state
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const [autoContext, setAutoContext] = useState<string>("");

  const faqs: Faq[] = useMemo(
    () => [
      {
        tag: "Delivery",
        q: "Delivery updated nahi dikh rahi — kya karu?",
        a: "Dashboard reload karo. Fir Track Delivery me status check karo. Aaj ka delivery missing ho to subscription active hona chahiye. Issue ho to screenshot ke saath ticket raise karo.",
      },
      {
        tag: "Subscription",
        q: "Subscription me product image / details mismatch aa raha hai",
        a: "Usually product_id relation mapping issue hota hai. Ensure customer_subscriptions.product_id -> products.id FK exists. Select query me products:product_id(...) join use karo. products.image_url correct hona chahiye.",
      },
      {
        tag: "Billing",
        q: "Pending bill galat show ho raha hai",
        a: "Billing data orders/invoices se aata hai. Billing page me history verify karo. Unpaid order status mismatch ho to admin billing logic me fix karna hoga.",
      },
      {
        tag: "Account",
        q: "Mobile number / name save nahi ho raha",
        a: "profiles table columns: user_id, full_name, mobile_number. Settings page me .update({ full_name, mobile_number }).eq('user_id', user.id) hona chahiye. RLS allow update for own row.",
      },
      {
        tag: "Subscription",
        q: "Shift change / cancel shift kaise kare?",
        a: "Cancel Shift page open karo. Multiple plans ho to ensure correct subId pass ho raha hai Modify Plan me. Backend actions Phase 2 me connect honge.",
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

  const openWhatsapp = (text?: string) => {
    const t = encodeURIComponent(
      text ||
        "Hi MilkMate Support, I need help.\n\n(Please describe your issue here)"
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${t}`, "_blank");
  };

  const openMail = () => {
    const subjectEnc = encodeURIComponent(
      subject?.trim() ? `MilkMate: ${subject.trim()}` : "MilkMate Support"
    );
    const bodyEnc = encodeURIComponent(
      `${msg?.trim() || "Describe your issue here."}\n\n---\nAuto context:\n${autoContext || "—"}`
    );
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subjectEnc}&body=${bodyEnc}`, "_blank");
  };

  const openCall = () => {
    window.open(`tel:${SUPPORT_PHONE}`, "_self");
  };

  const submitTicket = () => {
    if (!subject.trim() || !msg.trim()) {
      alert("Subject and message both required.");
      return;
    }

    openWhatsapp(
      `Ticket:\nSubject: ${subject}\n\nMessage:\n${msg}\n\n---\nContext:\n${autoContext || "—"}`
    );

    setSubject("");
    setMsg("");
  };

  // responsive mode
  useEffect(() => {
    const update = () => setIsMobile(isMobileNow());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ✅ Auto-open on runtime errors
  useEffect(() => {
    const autoOpen = (message: string) => {
      const now = Date.now();
      if (now - lastAutoOpenAt.current < 1200) return;
      lastAutoOpenAt.current = now;

      setAutoContext(message);
      setPulse(true);
      setOpen(true);

      window.setTimeout(() => setPulse(false), 3000);
    };

    const onError = (ev: ErrorEvent) => {
      const msg = ev?.message || "Unknown error";
      const src = ev?.filename ? `\nSource: ${ev.filename}:${ev.lineno}:${ev.colno}` : "";
      autoOpen(`Runtime error: ${msg}${src}`);
    };

    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const reason = safeString(ev?.reason);
      autoOpen(`Unhandled promise rejection: ${reason}`);
    };

    const onCustom = (ev: Event) => {
      const ce = ev as CustomEvent;
      const detail = ce?.detail || {};
      const m = detail?.message ? String(detail.message) : "An error occurred";
      const extra = detail?.extra ? `\nExtra: ${safeString(detail.extra)}` : "";
      autoOpen(`App error: ${m}${extra}`);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("milkmate:error", onCustom as any);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("milkmate:error", onCustom as any);
    };
  }, []);

  // ESC close on desktop
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Floating bubble */}
      <div className="fixed bottom-5 right-5 z-[80]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative flex items-center justify-center rounded-full shadow-lg",
            "h-14 w-14 bg-emerald-600 text-white hover:bg-emerald-700 transition",
            pulse && "animate-pulse"
          )}
          aria-label="Open help assistant"
        >
          <MessageCircle className="h-6 w-6" />
          {/* small dot indicator */}
          <span
            className={cn(
              "absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500",
              pulse ? "opacity-100" : "opacity-0"
            )}
          />
        </button>
      </div>

      {/* Overlay + Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[79] bg-black"
              onClick={() => setOpen(false)}
            />

            {/* PANEL */}
            {isMobile ? (
              // ✅ Mobile: full-screen bottom sheet
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[81] flex flex-col"
              >
                <div className="flex-1 bg-white">
                  <TopBar onClose={() => setOpen(false)} />
                  <Body
                    query={query}
                    setQuery={setQuery}
                    openIndex={openIndex}
                    setOpenIndex={setOpenIndex}
                    filteredFaqs={filteredFaqs}
                    subject={subject}
                    setSubject={setSubject}
                    msg={msg}
                    setMsg={setMsg}
                    autoContext={autoContext}
                    setAutoContext={setAutoContext}
                    openWhatsapp={openWhatsapp}
                    openMail={openMail}
                    openCall={openCall}
                    submitTicket={submitTicket}
                  />
                </div>
              </motion.div>
            ) : (
              // ✅ Desktop: expands LEFT from bubble
              <motion.div
                initial={{ x: 16, opacity: 0, scale: 0.98 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 16, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="fixed bottom-5 right-24 z-[81]"
              >
                <Card className="w-[420px] rounded-3xl border border-gray-200 bg-white shadow-xl">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-extrabold text-gray-900">MilkMate Assistant</div>
                        <div className="text-[11px] text-gray-500">Help • FAQs • Ticket</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setOpen(false)}
                      className="h-9 w-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-gray-700" />
                    </button>
                  </div>

                  <CardContent className="p-4">
                    <Body
                      query={query}
                      setQuery={setQuery}
                      openIndex={openIndex}
                      setOpenIndex={setOpenIndex}
                      filteredFaqs={filteredFaqs}
                      subject={subject}
                      setSubject={setSubject}
                      msg={msg}
                      setMsg={setMsg}
                      autoContext={autoContext}
                      setAutoContext={setAutoContext}
                      openWhatsapp={openWhatsapp}
                      openMail={openMail}
                      openCall={openCall}
                      submitTicket={submitTicket}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TopBar({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-16 px-4 border-b border-gray-200 bg-white flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-extrabold text-gray-900">MilkMate Assistant</div>
          <div className="text-[11px] text-gray-500">Quick help in 10 seconds</div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="h-10 w-10 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-700" />
      </button>
    </div>
  );
}

function Body(props: {
  query: string;
  setQuery: (v: string) => void;
  openIndex: number | null;
  setOpenIndex: (v: number | null) => void;
  filteredFaqs: Faq[];
  subject: string;
  setSubject: (v: string) => void;
  msg: string;
  setMsg: (v: string) => void;
  autoContext: string;
  setAutoContext: (v: string) => void;
  openWhatsapp: (text?: string) => void;
  openMail: () => void;
  openCall: () => void;
  submitTicket: () => void;
}) {
  const {
    query,
    setQuery,
    openIndex,
    setOpenIndex,
    filteredFaqs,
    subject,
    setSubject,
    msg,
    setMsg,
    autoContext,
    setAutoContext,
    openWhatsapp,
    openMail,
    openCall,
    submitTicket,
  } = props;

  return (
    <div className="space-y-4 p-4">
      {/* quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          className="rounded-2xl h-11 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => openWhatsapp()}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        <Button variant="outline" className="rounded-2xl h-11 border-gray-200" onClick={openMail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" className="rounded-2xl h-11 border-gray-200" onClick={openCall}>
          <PhoneCall className="h-4 w-4 mr-2" />
          Call
        </Button>
      </div>

      {/* auto context (shown if exists) */}
      {autoContext ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-[11px] font-bold text-rose-700">Auto-opened due to error</div>
          <div className="text-xs text-rose-800 mt-1 whitespace-pre-wrap break-words">{autoContext}</div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-100"
              onClick={() => setAutoContext("")}
            >
              Clear
            </Button>
            <Button
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openWhatsapp(`Bug report:\n\n${autoContext}\n\n(Please add screenshot)`)}
            >
              Share on WhatsApp <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* FAQ search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9 rounded-2xl border-gray-200"
          placeholder="Search: delivery, billing, subscription..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* FAQs */}
      <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            No matches found.
          </div>
        ) : (
          filteredFaqs.map((f, idx) => {
            const isOpen = openIndex === idx;
            return (
              <button
                key={`${f.tag}-${idx}`}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className={cn(
                  "w-full text-left rounded-2xl border border-gray-200 bg-white p-3",
                  "hover:bg-gray-50 transition"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                      {f.tag}
                    </div>
                    <div className="mt-2 font-semibold text-gray-900">{f.q}</div>
                  </div>
                  <ChevronRight
                    className={cn("h-4 w-4 text-gray-400 transition", isOpen ? "rotate-90" : "rotate-0")}
                  />
                </div>
                {isOpen ? <div className="mt-2 text-sm text-gray-600">{f.a}</div> : null}
              </button>
            );
          })
        )}
      </div>

      {/* ticket */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
        <div className="text-sm font-extrabold text-gray-900">Raise a ticket</div>

        <Input
          className="rounded-2xl border-gray-200"
          placeholder="Subject (e.g. Payment failed)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          className="rounded-2xl border-gray-200 min-h-[90px]"
          placeholder="Explain issue + what you expected + steps to reproduce"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />

        <div className="flex gap-2">
          <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={submitTicket}>
            Submit (WhatsApp)
          </Button>
          <Button variant="outline" className="rounded-2xl border-gray-200" onClick={openMail}>
            Email instead
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-gray-500">Tip: Screenshot + exact steps = fastest fix.</div>
    </div>
  );
}