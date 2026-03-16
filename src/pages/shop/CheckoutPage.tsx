import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Banknote,
  MapPin,
  ArrowLeft,
  Loader2,
  CreditCard,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const addressSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  mobile: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
  house: z.string().trim().min(1, "House/Flat is required").max(100, "Too long"),
  area: z.string().trim().min(1, "Area is required").max(100, "Too long"),
  city: z.string().trim().min(1, "City is required").max(50, "Too long"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode"),
});

type AddressForm = z.infer<typeof addressSchema>;

type RazorpayCreateResp = {
  order_id: string;
  razorpay_order: {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    status?: string;
  };
  error?: string;
};


const CheckoutPage = () => {
  const { items, subtotal, deliveryCharge, platformFee, discount, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rzpReady, setRzpReady] = useState(false);

  const [address, setAddress] = useState<AddressForm>({
    full_name: profile?.full_name || "",
    mobile: profile?.mobile_number || "",
    house: "",
    area: "",
    city: "",
    pincode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");

  useEffect(() => {
    setAddress((prev) => ({
      ...prev,
      full_name: profile?.full_name || prev.full_name,
      mobile: profile?.mobile_number || prev.mobile,
    }));
  }, [profile?.full_name, profile?.mobile_number]);

  useEffect(() => {
    const existing = document.getElementById("razorpay-sdk");
    if (existing) {
      setRzpReady(true);
      return;
    }

    const s = document.createElement("script");
    s.id = "razorpay-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setRzpReady(true);
    s.onerror = () => setRzpReady(false);
    document.body.appendChild(s);
  }, []);

  const invokeWithAuth = async <T,>(fnName: string, body: any): Promise<T> => {
    const { data: sessData } = await supabase.auth.getSession();
    const token = sessData.session?.access_token;

    if (!token) {
      throw new Error("Not logged in. Please login again.");
    }

    const { data, error } = await supabase.functions.invoke(fnName, {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      throw new Error(error.message || `Edge Function error: ${fnName}`);
    }

    return data as T;
  };

  const openRazorpay = async (opts: {
    orderIdInDb: string;
    razorpayOrder: {
      id: string;
      amount: number;
      currency: string;
    };
    amountInRupees: number;
    customerName: string;
    customerPhone: string;
  }) => {
    const RazorpayCtor = window.Razorpay;

    if (!RazorpayCtor) {
      toast({
        title: "Payment SDK not loaded",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const rzp = new RazorpayCtor({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: opts.razorpayOrder.amount,
      currency: opts.razorpayOrder.currency,
      name: "MilkMate",
      description: "Dairy order payment",
      order_id: opts.razorpayOrder.id,
      prefill: {
        name: opts.customerName || "MilkMate Customer",
        contact: opts.customerPhone || "",
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      theme: { color: "#16a34a" },

      handler: async (resp: any) => {
        try {
          const verifyResp = await invokeWithAuth<{ ok: boolean; error?: string }>(
            "razorpay-verify",
            {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }
          );

          if (!verifyResp?.ok) {
            throw new Error(verifyResp?.error || "Payment verification failed");
          }

          const sb: any = supabase;
          const { error: upErr } = await sb
            .from("orders")
            .update({
              payment_status: "paid",
              payment_method: "razorpay",
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              razorpay_order_id: resp.razorpay_order_id,
              status: "confirmed",
            })
            .eq("id", opts.orderIdInDb);

          if (upErr) {
            throw new Error(upErr.message);
          }

          await clearCart();
          navigate(`/customer/order-success/${opts.orderIdInDb}`);
        } catch (e: any) {
          toast({
            title: "Payment failed",
            description: e?.message || "Something went wrong",
            variant: "destructive",
          });
        } finally {
          setPlacing(false);
        }
      },

      modal: {
        ondismiss: () => {
          setPlacing(false);
          toast({
            title: "Payment cancelled",
            description: "You can try again from checkout.",
          });
        },
      },
    });

    rzp.open();
  };

  const handlePlaceOrder = async () => {
  if (!user) return;

  const result = addressSchema.safeParse(address);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    setErrors(fieldErrors);
    toast({
      title: "Invalid address",
      description: "Please fix the highlighted fields",
      variant: "destructive",
    });
    return;
  }

  setErrors({});
  setPlacing(true);

  try {
    const validatedAddress = result.data;

    // COD FLOW
    if (paymentMethod === "cod") {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;

      if (!token) {
        throw new Error("Not logged in. Please login again.");
      }

      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: {
          address: validatedAddress,
          items: items.map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            price: i.product.price,
          })),
          total_amount: total,
          delivery_charge: deliveryCharge,
          platform_fee: platformFee,
          discount_amount: discount,
          currency: "INR",
          payment_method: "cod",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw new Error(error.message || "COD order failed");
      if ((data as any)?.error) throw new Error((data as any).error);

      const orderId = (data as any)?.order_id;
      if (!orderId) throw new Error("Order created but order_id missing");

      const sb: any = supabase;
      const { error: updateErr } = await sb
        .from("orders")
        .update({
          payment_method: "cod",
          payment_status: "pending",
          status: "confirmed",
        })
        .eq("id", orderId);

      if (updateErr) throw new Error(updateErr.message);

      await clearCart();
      navigate(`/customer/order-success/${orderId}`);
      return;
    }

    // RAZORPAY FLOW
    const data = await invokeWithAuth<RazorpayCreateResp>("razorpay-create-order", {
      address: validatedAddress,
      items: items.map((i) => ({
        product_id: i.product_id,
        qty: i.qty,
        price: i.product.price,
      })),
      total_amount: total,
      delivery_charge: deliveryCharge,
      platform_fee: platformFee,
      discount_amount: discount,
      currency: "INR",
      payment_method: "razorpay",
    });

    if ((data as any)?.error) throw new Error((data as any).error);

    const orderId = data?.order_id;
    if (!orderId) throw new Error("Order created but order_id missing");

    await openRazorpay({
      orderIdInDb: orderId,
      razorpayOrder: data.razorpay_order,
      amountInRupees: total,
      customerName: profile?.full_name || validatedAddress.full_name,
      customerPhone: profile?.mobile_number || validatedAddress.mobile,
    });
  } catch (err: any) {
    setPlacing(false);
    toast({
      title: "Order failed",
      description: err?.message || "Something went wrong",
      variant: "destructive",
    });
  }
};

  if (items.length === 0) {
    navigate("/customer/cart");
    return null;
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-foreground font-display flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "full_name", label: "Full Name", placeholder: "John Doe" },
                  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
                  { key: "house", label: "House / Flat No.", placeholder: "B-204" },
                  { key: "area", label: "Area / Sector", placeholder: "Sector 21" },
                  { key: "city", label: "City", placeholder: "Ahmedabad" },
                  { key: "pincode", label: "Pincode", placeholder: "380015" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      value={(address as any)[f.key]}
                      onChange={(e) => {
                        setAddress((prev) => ({ ...prev, [f.key]: e.target.value }));
                        if (errors[f.key]) {
                          setErrors((prev) => ({ ...prev, [f.key]: "" }));
                        }
                      }}
                      placeholder={f.placeholder}
                      className={`rounded-xl mt-1 ${errors[f.key] ? "border-destructive" : ""}`}
                    />
                    {errors[f.key] && (
                      <p className="text-xs text-destructive mt-0.5">{errors[f.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-foreground font-display flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" /> Payment Method
              </h3>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("razorpay")}
                  className={cn(
                    "w-full text-left flex items-center gap-3 rounded-2xl border p-4 transition-all",
                    paymentMethod === "razorpay"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center",
                      paymentMethod === "razorpay"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <CreditCard className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-foreground">
                        UPI / Card (Razorpay)
                      </span>
                      {!rzpReady && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                          Loading…
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay instantly via UPI, Credit/Debit Card, NetBanking.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2",
                      paymentMethod === "razorpay" ? "border-primary" : "border-border"
                    )}
                  >
                    {paymentMethod === "razorpay" && (
                      <div className="h-full w-full rounded-full bg-primary scale-[0.6]" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={cn(
                    "w-full text-left flex items-center gap-3 rounded-2xl border p-4 transition-all",
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center",
                      paymentMethod === "cod"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Smartphone className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <span className="text-sm font-black text-foreground">
                      Cash on Delivery
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay when your order arrives.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2",
                      paymentMethod === "cod" ? "border-primary" : "border-border"
                    )}
                  >
                    {paymentMethod === "cod" && (
                      <div className="h-full w-full rounded-full bg-primary scale-[0.6]" />
                    )}
                  </div>
                </button>
              </div>

              {paymentMethod === "razorpay" && !rzpReady && (
                <p className="text-xs text-muted-foreground">
                  If this stays loading, refresh the page once.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 h-fit sticky top-20">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-foreground font-display">Order Summary</h3>

            <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between text-muted-foreground">
                  <span className="truncate flex-1">
                    {i.product.name} × {i.qty}
                  </span>
                  <span>₹{(i.product.price * i.qty).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee</span>
                <span>₹{platformFee}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-₹{discount.toFixed(0)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-foreground text-base">
                <span>Total</span>
                <span className="font-display">₹{total.toFixed(0)}</span>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={placing || (paymentMethod === "razorpay" && !rzpReady)}
              className="w-full rounded-xl h-11 gap-2 relative overflow-hidden"
            >
              {placing && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 w-1/2 bg-white/10"
                />
              )}

              {placing ? (
                <span className="relative z-10 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Processing...
                  </motion.span>
                </span>
              ) : (
                <span className="relative z-10">{`Place Order • ₹${total.toFixed(0)}`}</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutPage;