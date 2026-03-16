// src/pages/shop/OrderSuccessPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, MapPin, Truck, ReceiptText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AddressJson = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  house?: string;
  [k: string]: any;
};

type OrderRow = {
  id: string;
  created_at: string | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  address_json: AddressJson | null;
};

function formatINR(n: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confetti
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const end = Date.now() + 1100;
    const frame = () => {
      confetti({
        particleCount: 4,
        startVelocity: 28,
        spread: 75,
        ticks: 250,
        origin: { x: Math.random() * 0.6 + 0.2, y: 0.15 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  // Fetch order (authoritative source for total)
  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!orderId) {
        setError("Missing order id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, payment_method, payment_status, address_json")
        .eq("id", orderId)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        console.error("Order fetch error:", error);
        setError(error.message);
        setOrder(null);
      } else {
        setOrder((data as any) ?? null);
      }

      setLoading(false);
    }

    run();
    return () => {
      ignore = true;
    };
  }, [orderId]);

  const total = useMemo(() => {
    const v = order?.total_amount;
    return typeof v === "number" ? v : 0;
  }, [order]);

  const addressLine = useMemo(() => {
    const a = order?.address_json;
    if (!a) return null;

    const parts = [
      a.house,
      a.line1,
      a.line2,
      a.landmark,
      a.area,
      a.city,
      a.state,
      a.pincode,
    ].filter(Boolean);

    return parts.length ? parts.join(", ") : null;
  }, [order]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative"
        >
          <Card className="overflow-hidden rounded-2xl border bg-white/80 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.35)] backdrop-blur dark:bg-slate-950/70">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tracking-tight">
                      Order Confirmed{" "}
                      <span className="align-middle">🎉</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {loading ? "Fetching your order..." : error ? "We couldn’t load this order." : `Order ID: ${order?.id ?? orderId}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
                  <div className={cn("mt-1 text-2xl font-semibold", loading && "opacity-60")}>
                    {formatINR(total)}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    Delivery
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {addressLine ? (
                      <>
                        <div className="font-medium text-foreground">Address saved</div>
                        <div className="mt-1 line-clamp-3">{addressLine}</div>
                      </>
                    ) : (
                      "Delivery address saved at checkout."
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4 text-primary" />
                    Tracking
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Track your delivery live from the tracking page.
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    Invoice
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Your invoice will appear in “My Orders”.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/customer/track-delivery")} className="rounded-xl">
                  Track Delivery <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button variant="outline" onClick={() => navigate("/customer/orders")} className="rounded-xl">
                  View Orders
                </Button>

                <Button variant="ghost" onClick={() => navigate("/customer/products")} className="rounded-xl">
                  Continue Shopping
                </Button>
              </div>

              <div className="mt-6 text-xs text-muted-foreground">
                {order?.payment_method ? (
                  <span>
                    Payment: <span className="font-medium text-foreground">{order.payment_method.toUpperCase()}</span>
                    {order.payment_status ? (
                      <>
                        {" "}
                        · Status: <span className="font-medium text-foreground">{order.payment_status}</span>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
