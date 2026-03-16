// src/pages/customer/CustomerBillingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import {
  Receipt,
  IndianRupee,
  FileDown,
  CreditCard,
  RefreshCcw,
  BadgeCheck,
  AlertTriangle,
  ShoppingBag,
  Milk,
  Layers3,
  Wallet,
  Sparkles,
  CheckCircle2,
  Clock3,
  Droplets,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

async function downloadOrderInvoicePdf(orderId: string, fileName: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_invoice_pdf`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Invoice download failed (${res.status})`);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}

async function downloadSubscriptionInvoicePdf(deliveryId: string, fileName: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_subscription_invoice_pdf`;

  console.log("downloadSubscriptionInvoicePdf -> deliveryId =", deliveryId);
  console.log("downloadSubscriptionInvoicePdf -> url =", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ deliveryId }),
  });

  console.log("generate_subscription_invoice_pdf status =", res.status);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("generate_subscription_invoice_pdf failed body =", txt);
    throw new Error(txt || `Subscription invoice download failed (${res.status})`);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}

async function ensureRazorpayLoaded(): Promise<boolean> {
  const w = window as any;
  if (w.Razorpay) return true;

  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function safeNum(v: any, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function formatINR(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}

function prettyDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function prettyDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} • ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function toLocalISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeOrderStatus(v?: string | null) {
  const s = String(v || "").toLowerCase().trim();
  if (["paid", "success", "completed"].includes(s)) return "paid";
  if (["cancelled", "canceled", "refunded"].includes(s)) return "closed";
  if (["failed"].includes(s)) return "failed";
  return "pending";
}

function normalizeDeliveryPayment(paid?: boolean | null) {
  return paid ? "paid" : "pending";
}

function statusTone(status: "paid" | "pending" | "failed" | "closed") {
  if (status === "paid") return "success";
  if (status === "failed") return "failed";
  if (status === "pending") return "pending";
  return "muted";
}

function statusBadgeClass(tone: "success" | "failed" | "pending" | "muted") {
  if (tone === "success") {
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  }
  if (tone === "failed") {
    return "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/20";
  }
  if (tone === "pending") {
    return "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/20";
  }
  return "bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/20";
}

function orderInvoiceNo(orderId?: string | null, createdAt?: string | null) {
  const dt = createdAt ? new Date(createdAt) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const short = String(orderId || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ORD-${y}${m}-${short || "XXXX"}`;
}

function deliveryInvoiceNo(deliveryId?: string | null, deliveryDate?: string | null) {
  const dt = deliveryDate ? new Date(deliveryDate) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const short = String(deliveryId || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return `SUB-${y}${m}-${short || "XXXX"}`;
}

function normalizeShiftLabel(shift?: string | null, timeSlot?: string | null) {
  const v = String(shift || timeSlot || "").toLowerCase();
  if (v.includes("even")) return "Evening Shift";
  if (v.includes("morn")) return "Morning Shift";
  return shift || timeSlot || "Morning Shift";
}

const GST_RATE = 0.05;

/* -------------------------------------------------------------------------- */
/*                                     types                                  */
/* -------------------------------------------------------------------------- */

type BillingSource = "order" | "subscription";

type OrderRow = {
  id: string;
  user_id?: string | null;
  created_at: string | null;
  subtotal: number | null;
  delivery_charge: number | null;
  platform_fee: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  razorpay_payment_id: string | null;
};

type DeliveryRow = {
  id: string;
  customer_id: string | null;
  farmer_id: string | null;
  subscription_id: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  shift?: string | null;
  status: string | null;
  qty: number | null;
  rate?: number | null;
  paid: boolean | null;
  paid_at?: string | null;
  created_at?: string | null;
  order_id?: string | null;
};

type SubscriptionLite = {
  id: string;
  product_id: string | null;
  milk_label?: string | null;
};

type ProductLite = {
  id: string;
  name: string | null;
};

type BillingRow = {
  id: string;
  source: BillingSource;
  created_at: string | null;
  labelDate: string | null;
  amount: number;
  normalizedStatus: "paid" | "pending" | "failed" | "closed";
  title: string;
  subtitle: string;
  productName?: string | null;

  payment_method?: string | null;
  razorpay_payment_id?: string | null;

  order_id?: string | null;
  delivery_id?: string | null;
  subscription_id?: string | null;

  subtotal?: number | null;
  delivery_charge?: number | null;
  platform_fee?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;

  qty?: number | null;
  rate?: number | null;
  shift?: string | null;
  time_slot?: string | null;
  paid?: boolean | null;
  paid_at?: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                      ui                                    */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  sub,
  icon: Icon,
  glow,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  glow: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5 backdrop-blur-xl",
        "border-slate-200/70 bg-white/75 shadow-[0_12px_34px_rgba(15,23,42,0.06)]",
        "dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
      )}
    >
      <div className={cn("absolute inset-x-8 top-0 h-20 rounded-b-full blur-3xl opacity-40", glow)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{value}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Receipt className="h-6 w-6 text-slate-500 dark:text-slate-300" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

function SideBadge({ source }: { source: BillingSource }) {
  const isOrder = source === "order";

  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg",
        isOrder
          ? "bg-gradient-to-br from-amber-500 to-orange-600"
          : "bg-gradient-to-br from-sky-500 to-blue-700"
      )}
    >
      {isOrder ? <ShoppingBag className="h-6 w-6 text-white" /> : <Milk className="h-6 w-6 text-white" />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   page                                     */
/* -------------------------------------------------------------------------- */

export default function CustomerBillingPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchBills = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const sb: any = supabase;
    const todayISO = toLocalISODate(new Date());

    const [ordersRes, deliveriesRes, subsRes] = await Promise.all([
      sb
        .from("orders")
        .select(
          "id,user_id,created_at,subtotal,delivery_charge,platform_fee,discount_amount,total_amount,payment_method,payment_status,status,razorpay_payment_id"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      sb
        .from("deliveries")
        .select(
          "id,customer_id,farmer_id,subscription_id,delivery_date,time_slot,shift,status,qty,rate,paid,paid_at,created_at,order_id"
        )
        .eq("customer_id", user.id)
        .eq("status", "delivered")
        .lte("delivery_date", todayISO)
        .order("delivery_date", { ascending: false }),

      sb
        .from("customer_subscriptions")
        .select("id,product_id,milk_label")
        .eq("customer_id", user.id),
    ]);

    if (ordersRes.error || deliveriesRes.error || subsRes.error) {
      const msg =
        ordersRes.error?.message ||
        deliveriesRes.error?.message ||
        subsRes.error?.message ||
        "Failed to load billing records";
      setError(msg);
      setRows([]);
      setLoading(false);
      return;
    }

    const subs = (subsRes.data ?? []) as SubscriptionLite[];
    const productIds = Array.from(
      new Set(subs.map((s) => s.product_id).filter(Boolean))
    ) as string[];

    let productsMap = new Map<string, string>();
    if (productIds.length > 0) {
      const productsRes = await sb
        .from("products")
        .select("id,name")
        .in("id", productIds);

      if (!productsRes.error) {
        ((productsRes.data ?? []) as ProductLite[]).forEach((p) => {
          productsMap.set(String(p.id), p.name || "Milk Product");
        });
      }
    }

    const subMap = new Map<
      string,
      {
        productName: string;
      }
    >();

    subs.forEach((s) => {
      const fallbackName = s.milk_label || "Milk Subscription";
      const productName = s.product_id ? productsMap.get(String(s.product_id)) || fallbackName : fallbackName;
      subMap.set(String(s.id), { productName });
    });

    const orderRows: BillingRow[] = ((ordersRes.data ?? []) as OrderRow[]).map((o) => ({
      id: `order-${o.id}`,
      source: "order",
      created_at: o.created_at,
      labelDate: o.created_at,
      amount: safeNum(o.total_amount),
      normalizedStatus: normalizeOrderStatus(o.payment_status),
      title: `Order Bill ${orderInvoiceNo(o.id, o.created_at)}`,
      subtitle: `Store order • #${String(o.id).slice(0, 8)}`,
      payment_method: o.payment_method,
      razorpay_payment_id: o.razorpay_payment_id,
      order_id: o.id,
      subtotal: o.subtotal,
      delivery_charge: o.delivery_charge,
      platform_fee: o.platform_fee,
      discount_amount: o.discount_amount,
      total_amount: o.total_amount,
    }));

    const deliveryRows: BillingRow[] = ((deliveriesRes.data ?? []) as DeliveryRow[]).map((d) => {
      const amount = safeNum(d.qty) * safeNum(d.rate);
      const subInfo = subMap.get(String(d.subscription_id || ""));
      const productName = subInfo?.productName || "Milk Subscription";

      return {
        id: `delivery-${d.id}`,
        source: "subscription",
        created_at: d.created_at ?? d.delivery_date,
        labelDate: d.delivery_date,
        amount,
        normalizedStatus: normalizeDeliveryPayment(d.paid),
        title: `${productName} • ${deliveryInvoiceNo(d.id, d.delivery_date)}`,
        subtitle: `${normalizeShiftLabel(d.shift, d.time_slot)} • ${safeNum(d.qty)}L • ${prettyDate(
          d.delivery_date
        )}`,
        productName,
        payment_method: d.paid ? "razorpay" : null,
        delivery_id: d.id,
        subscription_id: d.subscription_id,
        qty: d.qty,
        rate: d.rate,
        shift: d.shift,
        time_slot: d.time_slot,
        paid: d.paid,
        paid_at: d.paid_at,
      };
    });

    const merged = [...orderRows, ...deliveryRows].sort((a, b) => {
      const ta = a.labelDate ? new Date(a.labelDate).getTime() : 0;
      const tb = b.labelDate ? new Date(b.labelDate).getTime() : 0;
      return tb - ta;
    });

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.id) return;
      await fetchBills();
      if (!mounted) return;
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const summary = useMemo(() => {
    const paid = rows
      .filter((r) => r.normalizedStatus === "paid")
      .reduce((a, r) => a + safeNum(r.amount), 0);

    const pending = rows
      .filter((r) => r.normalizedStatus === "pending" || r.normalizedStatus === "failed")
      .reduce((a, r) => a + safeNum(r.amount), 0);

    const ordersCount = rows.filter((r) => r.source === "order").length;
    const subsCount = rows.filter((r) => r.source === "subscription").length;

    return {
      count: rows.length,
      paid: Math.round(paid),
      pending: Math.round(pending),
      ordersCount,
      subsCount,
      total: Math.round(paid + pending),
    };
  }, [rows]);

  const allRows = rows;
  const orderRows = rows.filter((r) => r.source === "order");
  const subscriptionRows = rows.filter((r) => r.source === "subscription");
  const paidRows = rows.filter((r) => r.normalizedStatus === "paid");
  const pendingRows = rows.filter(
    (r) => r.normalizedStatus === "pending" || r.normalizedStatus === "failed"
  );

  const payPendingOrder = async (row: BillingRow) => {
    if (!row?.order_id) return;
    if (!user?.id) return;

    try {
      setPayingId(row.id);

      const ok = await ensureRazorpayLoaded();
      if (!ok) {
        toast.error("Razorpay script failed to load");
        return;
      }

      const { data: createData, error: createErr } = await supabase.functions.invoke(
        "create_razorpay_order",
        { body: { orderId: row.order_id } }
      );

      if (createErr) throw createErr;

      const keyId = createData?.keyId;
      const razorpayOrderId = createData?.razorpayOrderId;
      const amount = createData?.amount;
      const currency = createData?.currency || "INR";

      if (!keyId || !razorpayOrderId || !amount) {
        throw new Error("Invalid Razorpay order response");
      }

      const w = window as any;

      const rzp = new w.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "MilkMate",
        description: row.title,
        order_id: razorpayOrderId,
        prefill: { email: user.email || "" },
        theme: { color: "#2563eb" },
        handler: async (resp: any) => {
          try {
            const { error: verErr } = await supabase.functions.invoke("verify_razorpay_payment", {
              body: {
                orderId: row.order_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
            });

            if (verErr) throw verErr;

            toast.success("Payment successful ✅");
            await fetchBills();
          } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Payment verification failed");
            await fetchBills();
          }
        },
        modal: {
          ondismiss: () => toast.message("Payment cancelled"),
        },
      });

      rzp.open();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to start payment");
    } finally {
      setPayingId(null);
    }
  };

  const paySubscriptionBill = async (row: BillingRow) => {
  if (!row?.delivery_id) {
    console.error("paySubscriptionBill: delivery_id missing", row);
    toast.error("delivery_id missing");
    return;
  }

  if (!user?.id) {
    console.error("paySubscriptionBill: user missing");
    toast.error("User not found");
    return;
  }

  try {
    console.log("========== PAY SUBSCRIPTION BILL START ==========");
    console.log("row =", row);
    console.log("deliveryId sent =", row.delivery_id);
    console.log("userId =", user.id);

    setPayingId(row.id);

    const ok = await ensureRazorpayLoaded();
    console.log("Razorpay loaded =", ok);

    if (!ok) {
      toast.error("Razorpay script failed to load");
      return;
    }

    const { data: createData, error: createErr } = await supabase.functions.invoke(
      "create_subscription_payment_order",
      {
        body: {
          deliveryId: row.delivery_id,
        },
      }
    );

    console.log("create_subscription_payment_order -> data =", createData);
    console.log("create_subscription_payment_order -> error =", createErr);

    if (createErr) {
      throw new Error(createErr.message || "create_subscription_payment_order failed");
    }

    const keyId = createData?.keyId;
    const razorpayOrderId = createData?.razorpayOrderId;
    const amount = createData?.amount;
    const currency = createData?.currency || "INR";

    console.log("Razorpay order values =", {
      keyId,
      razorpayOrderId,
      amount,
      currency,
    });

    if (!keyId || !razorpayOrderId || !amount) {
      throw new Error("Invalid subscription payment order response");
    }

    const w = window as any;

    const rzp = new w.Razorpay({
      key: keyId,
      amount,
      currency,
      name: "MilkMate",
      description: row.title,
      order_id: razorpayOrderId,
      prefill: { email: user.email || "" },
      theme: { color: "#0284c7" },

      handler: async (resp: any) => {
        try {
          console.log("Razorpay success response =", resp);

          const { data: verifyData, error: verErr } = await supabase.functions.invoke(
            "verify_subscription_payment",
            {
              body: {
                deliveryId: row.delivery_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
            }
          );

          console.log("verify_subscription_payment -> data =", verifyData);
          console.log("verify_subscription_payment -> error =", verErr);

          if (verErr) {
            throw new Error(verErr.message || "verify_subscription_payment failed");
          }

          toast.success("Milk bill payment successful ✅");
          await fetchBills();
        } catch (e: any) {
          console.error("verify subscription payment catch =", e);
          toast.error(e?.message || "Milk bill payment verification failed");
          await fetchBills();
        }
      },

      modal: {
        ondismiss: () => {
          console.log("Razorpay modal dismissed");
          toast.message("Payment cancelled");
        },
      },
    });

    rzp.open();
  } catch (e: any) {
    console.error("paySubscriptionBill catch =", e);
    toast.error(e?.message || "Failed to start milk bill payment");
  } finally {
    setPayingId(null);
    console.log("========== PAY SUBSCRIPTION BILL END ==========");
  }
};

  const onDownloadInvoice = async (row: BillingRow) => {
    try {
      setDownloadingId(row.id);

      if (row.source === "order" && row.order_id) {
        const name = `${orderInvoiceNo(row.order_id, row.created_at)}.pdf`;
        await downloadOrderInvoicePdf(row.order_id, name);
        toast.success("Order invoice downloaded ✅");
        return;
      }

      if (row.source === "subscription" && row.delivery_id) {
        console.log("Downloading subscription PDF for deliveryId =", row.delivery_id);

        const name = `${deliveryInvoiceNo(row.delivery_id, row.labelDate)}.pdf`;
        await downloadSubscriptionInvoicePdf(row.delivery_id, name);

        toast.success("Milk bill invoice downloaded ✅");
        return;
      }

    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Invoice download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const renderOrderBreakdown = (row: BillingRow) => {
    const subtotal = safeNum(row.subtotal);
    const delivery = safeNum(row.delivery_charge);
    const platform = safeNum(row.platform_fee);
    const discount = safeNum(row.discount_amount);
    const taxable = Math.max(subtotal + delivery + platform - discount, 0);
    const gst = Math.round(taxable * GST_RATE);
    const totalDb = safeNum(row.total_amount);
    const finalTotal = totalDb > 0 ? totalDb : taxable + gst;

    return (
      <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Subtotal</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(subtotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Delivery Charge</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(delivery)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Platform Fee</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(platform)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Discount</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              -₹{formatINR(discount)}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Taxable Amount</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">₹{formatINR(taxable)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">GST (5%)</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">₹{formatINR(gst)}</span>
          </div>

          <Separator className="my-3" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <IndianRupee className="h-4 w-4" />
              Grand Total
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(finalTotal)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubscriptionBreakdown = (row: BillingRow) => {
    const qty = safeNum(row.qty);
    const rate = safeNum(row.rate);
    const total = qty * rate;

    return (
      <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Product</div>
            <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
              {row.productName || "Milk Subscription"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Delivery Date</div>
            <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
              {prettyDate(row.labelDate)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Shift</div>
            <div className="mt-1 text-base font-black capitalize text-slate-900 dark:text-slate-100">
              {normalizeShiftLabel(row.shift, row.time_slot)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs text-slate-500 dark:text-slate-400">Quantity</div>
            <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
              {qty}L
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70 sm:col-span-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Rate</div>
            <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(rate)}/L
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">Milk Delivery Bill</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              ₹{formatINR(total)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = (list: BillingRow[]) => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-52 w-full rounded-[30px]" />
          <Skeleton className="h-52 w-full rounded-[30px]" />
          <Skeleton className="h-52 w-full rounded-[30px]" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[28px] border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      );
    }

    if (!list.length) {
      return (
        <EmptyState
          title="No billing records found"
          sub="Delivered milk bills and store orders will appear here."
        />
      );
    }

    return (
      <div className="space-y-4">
        {list.map((row) => {
          const tone = statusTone(row.normalizedStatus);
          const isPaid = row.normalizedStatus === "paid";
          const isOrder = row.source === "order";
          const paying = payingId === row.id;
          const downloading = downloadingId === row.id;

          return (
            <Card
              key={row.id}
              className={cn(
                "overflow-hidden rounded-[30px] border backdrop-blur-xl",
                "border-slate-200/70 bg-white/80 shadow-[0_14px_40px_rgba(15,23,42,0.06)]",
                "dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
              )}
            >
              <CardHeader
                className={cn(
                  "border-b",
                  "border-slate-200/70 bg-white/40",
                  "dark:border-slate-700/70 dark:bg-slate-900/55"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                      <SideBadge source={row.source} />

                      <div className="min-w-0">
                        <CardTitle className="truncate text-lg font-black text-slate-900 dark:text-slate-100">
                          {row.title}
                        </CardTitle>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{row.source === "order" ? "Store Order Bill" : "Milk Delivery Bill"}</span>
                          <span>•</span>
                          <span>{row.subtitle}</span>
                          <span>•</span>
                          <span>{prettyDateTime(row.labelDate || row.created_at)}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {row.source === "order" ? "Order" : "Milk Bill"}
                          </Badge>

                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusBadgeClass(
                              tone as any
                            )}`}
                          >
                            {row.normalizedStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {row.source === "order" ? (
                      <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 md:p-6">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.8fr]">
                  <div>{isOrder ? renderOrderBreakdown(row) : renderSubscriptionBreakdown(row)}</div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Payment Status
                      </div>

                      <div className="mt-3">
                        {isPaid ? (
                          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Paid successfully
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                            <Clock3 className="h-4 w-4" />
                            Pending payment
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Amount</span>
                          <span className="font-black text-slate-900 dark:text-slate-100">
                            ₹{formatINR(row.amount)}
                          </span>
                        </div>

                        {isOrder ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Method</span>
                              <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                                {row.payment_method || "—"}
                              </span>
                            </div>

                            {row.razorpay_payment_id ? (
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Txn</span>
                                <span className="max-w-[180px] break-all text-right text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {row.razorpay_payment_id}
                                </span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Paid Flag</span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {row.paid ? "TRUE" : "FALSE"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Paid At</span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {row.paid_at ? prettyDate(row.paid_at) : "—"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Actions
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="justify-start rounded-2xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          onClick={() => onDownloadInvoice(row)}
                          disabled={downloading}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          {downloading
                            ? "Preparing..."
                            : isOrder
                            ? "Download Order PDF"
                            : "Download Milk Bill PDF"}
                        </Button>

                        {!isPaid && isOrder ? (
                          <Button
                            className="justify-start rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600"
                            onClick={() => payPendingOrder(row)}
                            disabled={paying}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            {paying ? "Opening..." : "Pay Pending"}
                          </Button>
                        ) : null}

                       {!isPaid && !isOrder ? (
                          <Button
                            className="justify-start rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700"
                            onClick={() => {
                              console.log("Pay Milk Bill button clicked ->", row);
                              paySubscriptionBill(row);
                            }}
                            disabled={paying}
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            {paying ? "Opening..." : "Pay Milk Bill"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#edf5ff_0%,#f7f7ff_42%,#fff4fb_100%)] p-4 md:p-6 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f1630_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 h-[22rem] w-[22rem] rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-12 right-[-5rem] h-[24rem] w-[24rem] rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-[-8rem] left-[25%] h-[22rem] w-[22rem] rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
      </div>

      <div className="relative space-y-6">
        <Card className="overflow-hidden rounded-[34px] border-slate-200/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
          <CardHeader className="border-b border-slate-200/70 bg-white/45 dark:border-slate-700/70 dark:bg-slate-900/55">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Billing Workspace
                </div>

                <CardTitle className="mt-4 text-[30px] font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Customer Billing
                </CardTitle>

                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Orders + delivered milk bills in one premium billing center.
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800"
                onClick={fetchBills}
                disabled={loading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total Bills"
                value={loading ? "—" : String(summary.count)}
                sub={`${summary.ordersCount} orders • ${summary.subsCount} milk bills`}
                icon={Layers3}
                glow="bg-sky-300/40 dark:bg-sky-500/15"
              />

              <SummaryCard
                title="Paid"
                value={loading ? "—" : `₹${formatINR(summary.paid)}`}
                sub="Successfully settled bills"
                icon={BadgeCheck}
                glow="bg-emerald-300/40 dark:bg-emerald-500/15"
              />

              <SummaryCard
                title="Pending"
                value={loading ? "—" : `₹${formatINR(summary.pending)}`}
                sub="All unpaid orders + delivered milk bills"
                icon={AlertTriangle}
                glow="bg-orange-300/40 dark:bg-orange-500/15"
              />

              <SummaryCard
                title="Collections"
                value={loading ? "—" : `₹${formatINR(summary.total)}`}
                sub="Total billing value"
                icon={Wallet}
                glow="bg-violet-300/40 dark:bg-violet-500/15"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-5">
          <TabsList className="grid h-auto w-full max-w-4xl grid-cols-2 gap-2 rounded-2xl bg-white/75 p-2 backdrop-blur-xl md:grid-cols-5 dark:bg-slate-900/75">
            <TabsTrigger value="all" className="rounded-xl">
              All
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl">
              Orders
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-xl">
              Milk Bills
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl">
              Pending
            </TabsTrigger>
            <TabsTrigger value="paid" className="rounded-xl">
              Paid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderList(allRows)}</TabsContent>
          <TabsContent value="orders">{renderList(orderRows)}</TabsContent>
          <TabsContent value="subscriptions">{renderList(subscriptionRows)}</TabsContent>
          <TabsContent value="pending">{renderList(pendingRows)}</TabsContent>
          <TabsContent value="paid">{renderList(paidRows)}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}