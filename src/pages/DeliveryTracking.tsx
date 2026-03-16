// src/pages/customer/TrackDeliveryPage.tsx

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Receipt,
  History,
  ShoppingBag,
  Sparkles,
  CreditCard,
  Clock3,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";

type OrderRow = {
  id: string;
  user_id: string | null;
  total_amount: number | null;
  delivery_charge: number | null;
  platform_fee: number | null;
  discount_amount: number | null;
  subtotal: number | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  address_json: any | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: string | null;
  qty: number | null;
  product_id: string | null;
  products?: {
    name: string | null;
  } | null;
};

type OrderWithNames = OrderRow & {
  productNames: string[];
  displayProductName: string;
};

function safeNum(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatINR(value: number) {
  try {
    return value.toLocaleString("en-IN");
  } catch {
    return String(value);
  }
}

function shortOrder(id?: string | null) {
  const s = String(id || "").trim();
  return `#${s ? s.slice(0, 8) : "--------"}`;
}

function prettyDateTime(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} • ${d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function normalizePaymentStatus(value?: string | null) {
  const s = String(value || "").toLowerCase().trim();

  if (["paid", "success", "completed"].includes(s)) return "paid";
  if (["failed", "failure"].includes(s)) return "failed";

  return "pending";
}

function normalizeOrderDeliveryStatus(status?: string | null) {
  const s = String(status || "").toLowerCase().trim();

  if (["delivered", "completed"].includes(s)) return "delivered";

  if (
    [
      "out_for_delivery",
      "out for delivery",
      "on_the_way",
      "on the way",
      "shipped",
      "dispatch",
      "dispatched",
    ].includes(s)
  ) {
    return "out_for_delivery";
  }

  if (
    ["preparing", "packed", "processing", "confirmed", "accepted"].includes(s)
  ) {
    return "preparing";
  }

  return "scheduled";
}

function formatDeliveryStatus(status?: string | null) {
  const s = normalizeOrderDeliveryStatus(status);

  if (s === "delivered") return "Delivered";
  if (s === "out_for_delivery") return "Out for Delivery";
  if (s === "preparing") return "Preparing / Packed";
  return "Order Confirmed";
}

function normalizePaymentMethod(value?: string | null) {
  const s = String(value || "").toLowerCase().trim();

  if (!s) return "—";
  if (s === "cod") return "COD";
  if (s === "razorpay") return "Razorpay";

  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseAddress(addressJson: any) {
  try {
    if (!addressJson) return "Address not available";

    let obj = addressJson;

    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch {
        return String(addressJson);
      }
    }

    if (typeof obj === "object" && obj !== null) {
      const parts = [
        obj.name,
        obj.phone,
        obj.area,
        obj.address_line1,
        obj.address_line2,
        obj.landmark,
        obj.city,
        obj.state,
        obj.pincode,
      ].filter(Boolean);

      return parts.length ? parts.join(", ") : "Address not available";
    }

    return "Address not available";
  } catch {
    return "Address not available";
  }
}

function makeDisplayProductName(names: string[]) {
  const cleaned = Array.from(
    new Set(names.map((x) => String(x || "").trim()).filter(Boolean))
  );

  if (!cleaned.length) return "Products";
  return cleaned.join(", ");
}

function paymentStatusClass(status?: string | null) {
  const s = normalizePaymentStatus(status);

  if (s === "paid") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (s === "failed") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
}

function deliveryStatusClass(status?: string | null) {
  const s = normalizeOrderDeliveryStatus(status);

  if (s === "delivered") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (s === "out_for_delivery") {
    return "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
  }

  if (s === "preparing") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function getTimelineStage(status?: string | null) {
  const s = normalizeOrderDeliveryStatus(status);

  if (s === "scheduled") return 0;
  if (s === "preparing") return 1;
  if (s === "out_for_delivery") return 2;
  if (s === "delivered") return 3;

  return 0;
}

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/85 shadow-[0_16px_40px_rgba(59,130,246,0.08)] backdrop-blur-2xl",
        "dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(0,0,0,0.26)]",
        className
      )}
    >
      {children}
    </Card>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function DeliveryJourney({ status }: { status?: string | null }) {
  const activeStage = getTimelineStage(status);

  const steps = [
    {
      title: "Order Confirmed",
      sub: "Order placed successfully",
      icon: Receipt,
    },
    {
      title: "Preparing / Packed",
      sub: "Farmer preparing your order",
      icon: Package,
    },
    {
      title: "Out for Delivery",
      sub: "Delivery partner on the way",
      icon: Truck,
    },
    {
      title: "Delivered",
      sub: "Order delivered successfully",
      icon: CheckCircle2,
    },
  ];

  const STEP_HEIGHT = 116;
  const NODE_SIZE = 46;
  const TRUCK_SIZE = 40;
  const TRACK_LEFT = 22;
  const TRACK_TOP = NODE_SIZE / 2;
  const TRACK_BOTTOM = TRACK_TOP + STEP_HEIGHT * (steps.length - 1);

  const getNodeCenterY = (index: number) => TRACK_TOP + index * STEP_HEIGHT;
  const activeCenterY = getNodeCenterY(activeStage);

  const blueHeight =
    activeStage === 0 ? 0 : Math.max(0, activeCenterY - TRACK_TOP);

  const grayTop = activeCenterY;
  const grayHeight = Math.max(0, TRACK_BOTTOM - grayTop);

  const truckTop = activeCenterY - TRUCK_SIZE / 2;
  const truckLeft = TRACK_LEFT - TRUCK_SIZE / 2;

  return (
    <div className="h-full min-h-[620px] rounded-[26px] border border-slate-200 bg-white/80 p-6 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mb-6 flex items-center gap-2">
        <Truck className="h-4 w-4 text-slate-500" />
        <span className="text-base font-black text-slate-900 dark:text-white">
          Delivery Journey
        </span>
      </div>

      <div className="relative">
        <div
          className="relative"
          style={{ height: `${TRACK_BOTTOM + 24}px` }}
        >
          <div
            className="absolute rounded-full bg-slate-300 dark:bg-slate-600"
            style={{
              left: `${TRACK_LEFT}px`,
              top: `${grayTop}px`,
              width: "4px",
              height: `${grayHeight}px`,
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          />

          <div
            className="absolute rounded-full bg-gradient-to-b from-sky-500 to-indigo-600"
            style={{
              left: `${TRACK_LEFT}px`,
              top: `${TRACK_TOP}px`,
              width: "4px",
              height: `${blueHeight}px`,
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          />

          {activeStage > 0 && (
            <motion.div
              className="absolute z-20"
              animate={{ top: truckTop }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{
                left: `${truckLeft}px`,
                width: `${TRUCK_SIZE}px`,
                height: `${TRUCK_SIZE}px`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_10px_24px_rgba(59,130,246,0.35)] ring-4 ring-white dark:ring-slate-900">
                <Truck className="h-4 w-4" />
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-0">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < activeStage || activeStage === 3;
              const isActive = idx === activeStage && activeStage !== 3;
              const isDeliveredDone = activeStage === 3 && idx === 3;

              const iconClass =
                isDone || isDeliveredDone
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
                  : isActive
                  ? "border-sky-500 text-sky-600 dark:text-sky-300"
                  : "border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500";

              const titleClass =
                isDone || isDeliveredDone
                  ? "text-emerald-600 dark:text-emerald-300"
                  : isActive
                  ? "text-sky-600 dark:text-sky-300"
                  : "text-slate-400 dark:text-slate-500";

              return (
                <div
                  key={step.title}
                  className="relative flex items-start gap-5"
                  style={{ minHeight: `${STEP_HEIGHT}px` }}
                >
                  <div
                    className="relative z-10 flex shrink-0 items-center justify-center"
                    style={{
                      width: `${NODE_SIZE}px`,
                      height: `${NODE_SIZE}px`,
                    }}
                  >
                    <div
                      className={cn(
                        "flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900",
                        iconClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1 pt-1">
                    <div
                      className={cn(
                        "text-[24px] font-black leading-none",
                        titleClass
                      )}
                    >
                      {step.title}
                    </div>

                    <div className="mt-2 text-base leading-6 text-slate-500 dark:text-slate-400">
                      {step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderTrackingCard({ order }: { order: OrderWithNames }) {
  const addressText = parseAddress(order.address_json);

  const subtotal = safeNum(order.subtotal);
  const deliveryCharge = safeNum(order.delivery_charge);
  const platformFee = safeNum(order.platform_fee);
  const discount = safeNum(order.discount_amount);
  const charges = deliveryCharge + platformFee;

  const total =
    safeNum(order.total_amount) > 0
      ? safeNum(order.total_amount)
      : Math.max(subtotal + charges - discount, 0);

  return (
    <GlassCard>
      <CardContent className="p-6">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 dark:border-slate-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Active Order
                </div>

                <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {shortOrder(order.id)}
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {order.displayProductName}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-bold",
                      deliveryStatusClass(order.status)
                    )}
                  >
                    {formatDeliveryStatus(order.status)}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    ₹{formatINR(total)}
                  </Badge>
                </div>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_12px_26px_rgba(59,130,246,0.32)]">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile
                label="Order Date"
                value={prettyDateTime(order.created_at)}
              />

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Payment Status
                </div>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize",
                      paymentStatusClass(order.payment_status)
                    )}
                  >
                    {normalizePaymentStatus(order.payment_status)}
                  </span>
                </div>
              </div>

              <InfoTile
                icon={CreditCard}
                label="Payment Method"
                value={normalizePaymentMethod(order.payment_method)}
              />

              <InfoTile
                icon={Receipt}
                label="Subtotal"
                value={`₹${formatINR(subtotal)}`}
              />

              <InfoTile
                icon={CircleDollarSign}
                label="Charges"
                value={`₹${formatINR(charges)}`}
              />

              <InfoTile
                icon={ShieldCheck}
                label="Discount"
                value={`₹${formatINR(discount)}`}
              />

              <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 md:col-span-2 dark:border-sky-500/20 dark:bg-sky-500/10">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total Amount
                </div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  ₹{formatINR(total)}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Subtotal + Charges - Discount
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/60 md:col-span-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery Address
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {addressText}
                </div>
              </div>
            </div>
          </div>

          <DeliveryJourney status={order.status} />
        </div>
      </CardContent>
    </GlassCard>
  );
}

function CurrentOrderRow({ row }: { row: OrderWithNames }) {
  const total =
    safeNum(row.total_amount) > 0
      ? safeNum(row.total_amount)
      : Math.max(
          safeNum(row.subtotal) +
            safeNum(row.delivery_charge) +
            safeNum(row.platform_fee) -
            safeNum(row.discount_amount),
          0
        );

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/75 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-800/60">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-bold text-slate-900 dark:text-slate-100">
            {shortOrder(row.id)}
          </div>

          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-bold",
              deliveryStatusClass(row.status)
            )}
          >
            {formatDeliveryStatus(row.status)}
          </Badge>
        </div>

        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          {row.displayProductName}
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          {prettyDateTime(row.created_at)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          ₹{formatINR(total)}
        </div>

        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-bold capitalize",
            paymentStatusClass(row.payment_status)
          )}
        >
          {normalizePaymentStatus(row.payment_status)}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: OrderWithNames }) {
  const total =
    safeNum(row.total_amount) > 0
      ? safeNum(row.total_amount)
      : Math.max(
          safeNum(row.subtotal) +
            safeNum(row.delivery_charge) +
            safeNum(row.platform_fee) -
            safeNum(row.discount_amount),
          0
        );

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/75 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-800/60">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-bold text-slate-900 dark:text-slate-100">
            {shortOrder(row.id)}
          </div>

          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-bold",
              deliveryStatusClass(row.status)
            )}
          >
            {formatDeliveryStatus(row.status)}
          </Badge>
        </div>

        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          {row.displayProductName}
        </div>

        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {prettyDateTime(row.created_at)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          ₹{formatINR(total)}
        </div>

        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-bold capitalize",
            paymentStatusClass(row.payment_status)
          )}
        >
          {normalizePaymentStatus(row.payment_status)}
        </div>
      </div>
    </div>
  );
}

export default function TrackDeliveryPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderWithNames[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"current" | "history">("current");

  async function fetchOrders() {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const sb: any = supabase;

    const ordersRes = await sb
      .from("orders")
      .select(
        "id,user_id,total_amount,delivery_charge,platform_fee,discount_amount,subtotal,payment_method,payment_status,status,address_json,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersRes.error) {
      setError(ordersRes.error.message || "Failed to load orders");
      setRows([]);
      setLoading(false);
      return;
    }

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const orderIds = orders.map((o) => o.id).filter(Boolean);

    let orderItems: OrderItemRow[] = [];

    if (orderIds.length > 0) {
      const itemsRes = await sb
        .from("order_items")
        .select("order_id,qty,product_id,products(name)")
        .in("order_id", orderIds);

      if (!itemsRes.error) {
        orderItems = (itemsRes.data ?? []) as OrderItemRow[];
      }
    }

    const namesByOrderId = new Map<string, string[]>();

    for (const item of orderItems) {
      const orderId = String(item.order_id || "").trim();
      if (!orderId) continue;

      const productName = String(item.products?.name || "").trim();
      const current = namesByOrderId.get(orderId) || [];

      if (productName) current.push(productName);
      namesByOrderId.set(orderId, current);
    }

    const enriched: OrderWithNames[] = orders.map((o) => {
      const productNames = namesByOrderId.get(String(o.id)) || [];

      return {
        ...o,
        productNames,
        displayProductName: makeDisplayProductName(productNames),
      };
    });

    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.id) return;
      await fetchOrders();
      if (!mounted) return;
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const currentOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.filter((o) => {
      const deliveryStatus = normalizeOrderDeliveryStatus(o.status);

      if (deliveryStatus === "delivered") return false;

      if (
        deliveryStatus === "out_for_delivery" ||
        deliveryStatus === "preparing" ||
        deliveryStatus === "scheduled"
      ) {
        return true;
      }

      const created = o.created_at ? new Date(o.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      return created >= today;
    });
  }, [rows]);

  const historyOrders = useMemo(() => {
    return rows.filter(
      (o) => normalizeOrderDeliveryStatus(o.status) === "delivered"
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#edf6ff_0%,#f5f7ff_45%,#fff4fb_100%)] p-4 md:p-6 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1b1530_100%)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-sky-700 shadow-sm dark:border-sky-500/20 dark:bg-white/5 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Product Order Tracking
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Live Delivery Tracking
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Har active order ka apna live journey card.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <Button
              type="button"
              variant={tab === "current" ? "default" : "ghost"}
              className={cn(
                "rounded-xl",
                tab === "current" &&
                  "bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:text-white"
              )}
              onClick={() => setTab("current")}
            >
              <Truck className="mr-2 h-4 w-4" />
              Current
            </Button>

            <Button
              type="button"
              variant={tab === "history" ? "default" : "ghost"}
              className={cn(
                "rounded-xl",
                tab === "history" &&
                  "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:text-white"
              )}
              onClick={() => setTab("history")}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-[28px]" />
            <Skeleton className="h-72 w-full rounded-[28px]" />
          </div>
        ) : error ? (
          <GlassCard>
            <CardContent className="p-5 text-sm text-destructive">
              {error}
            </CardContent>
          </GlassCard>
        ) : tab === "current" ? (
          currentOrders.length === 0 ? (
            <GlassCard>
              <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
                No active order is currently being tracked.
              </CardContent>
            </GlassCard>
          ) : (
            <div className="space-y-5">
              {currentOrders.map((order) => (
                <div key={order.id} className="space-y-4">
                  <OrderTrackingCard order={order} />

                  <GlassCard>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                          Current Active Orders
                        </h3>
                      </div>

                      <CurrentOrderRow row={order} />
                    </CardContent>
                  </GlassCard>
                </div>
              ))}
            </div>
          )
        ) : historyOrders.length === 0 ? (
          <GlassCard>
            <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
              No delivered order history found.
            </CardContent>
          </GlassCard>
        ) : (
          <GlassCard>
            <CardContent className="space-y-3 p-6">
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Delivered Order History
                </h3>
              </div>

              {historyOrders.map((row) => (
                <HistoryRow key={row.id} row={row} />
              ))}
            </CardContent>
          </GlassCard>
        )}
      </div>
    </div>
  );
}