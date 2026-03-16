// D:\milkmate_super_fixed - Copy1\src\pages\customer\CustomerSubscriptionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Farmer = {
  user_id: string;
  full_name: string | null;
};

type BreedOption = {
  key: string;
  label: string;
  breed: string;
  animalType: "cow" | "buffalo" | "other";
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const NEW_FEE_INR = 10;

function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);

    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function safeAnimalType(
  breed: string,
  type: string | null | undefined
): "cow" | "buffalo" | "other" {
  const b = String(breed || "").trim().toLowerCase();
  const t = String(type || "").trim().toLowerCase();

  if (b === "buffalo" || t === "buffalo") return "buffalo";
  if (t === "cow") return "cow";
  return "cow";
}

function toMilkLabel(
  breed: string,
  animalType: "cow" | "buffalo" | "other"
) {
  if (animalType === "buffalo" || String(breed).trim().toLowerCase() === "buffalo") {
    return "Buffalo Milk";
  }
  if (animalType === "other") {
    return `${breed} Milk`;
  }
  return `${breed} Cow Milk`;
}

export default function CustomerSubscriptionPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const query = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const isNew = query.get("new") === "1";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [breedOptions, setBreedOptions] = useState<BreedOption[]>([]);

  const [farmerId, setFarmerId] = useState<string>("");
  const [selectedBreedKey, setSelectedBreedKey] = useState<string>("");

  const [planMode, setPlanMode] = useState<"fixed" | "weekly">("fixed");
  const [qty, setQty] = useState<number>(1);

  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [timeSlot, setTimeSlot] = useState<string>("06:30");

  const [startDate, setStartDate] = useState<string>(toISODate(new Date()));
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>(
    toISODate(new Date(Date.now() + 30 * 86400000))
  );

  const [weekly, setWeekly] = useState<Record<string, number>>({
    mon: 1,
    tue: 1,
    wed: 1,
    thu: 1,
    fri: 1,
    sat: 1,
    sun: 1,
  });

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f.user_id === farmerId) ?? null,
    [farmers, farmerId]
  );

  const selectedBreedOption = useMemo(
    () => breedOptions.find((x) => x.key === selectedBreedKey) ?? null,
    [breedOptions, selectedBreedKey]
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!user?.id) return;

      setLoading(true);
      setErr(null);

      const sb: any = supabase;

      const farmerRes = await sb
        .from("profiles")
        .select("user_id,full_name,role")
        .eq("role", "farmer")
        .order("full_name", { ascending: true });

      if (!mounted) return;

      if (farmerRes.error) {
        setErr(farmerRes.error.message);
        setLoading(false);
        return;
      }

      const f: Farmer[] = ((farmerRes.data ?? []) as any[]).map((x: any) => ({
        user_id: x.user_id,
        full_name: x.full_name,
      }));

      setFarmers(f);

      if (!farmerId && f[0]?.user_id) {
        setFarmerId(f[0].user_id);
      }

      setLoading(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;

    const loadBreedOptions = async () => {
      if (!farmerId) {
        setBreedOptions([]);
        setSelectedBreedKey("");
        return;
      }

      setErr(null);

      const sb: any = supabase;

      const cattleRes = await sb
        .from("cattle")
        .select("breed,type,status")
        .eq("farmer_id", farmerId)
        .eq("status", "active");

      if (!mounted) return;

      if (cattleRes.error) {
        setErr(cattleRes.error.message);
        setBreedOptions([]);
        setSelectedBreedKey("");
        return;
      }

      const map = new Map<string, BreedOption>();

      for (const row of (cattleRes.data ?? []) as any[]) {
        const breed = String(row.breed || "").trim();
        if (!breed) continue;

        const animalType = safeAnimalType(breed, row.type);
        const key = `${breed.toLowerCase()}__${animalType}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            breed,
            animalType,
            label: toMilkLabel(breed, animalType),
          });
        }
      }

      const finalOptions = Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      setBreedOptions(finalOptions);
      setSelectedBreedKey((prev) => {
        if (prev && finalOptions.some((x) => x.key === prev)) return prev;
        return finalOptions[0]?.key ?? "";
      });
    };

    loadBreedOptions();

    return () => {
      mounted = false;
    };
  }, [farmerId]);

  const canSubmit = useMemo(() => {
    if (!user?.id) return false;
    if (!farmerId) return false;
    if (!selectedBreedOption) return false;
    if (!Number.isFinite(qty) || qty <= 0) return false;
    if (!startDate) return false;
    if (!timeSlot) return false;
    if (hasEndDate && endDate && endDate < startDate) return false;
    return true;
  }, [user?.id, farmerId, selectedBreedOption, qty, startDate, hasEndDate, endDate, timeSlot]);

  const buildSubscriptionPayload = () => {
    return {
      customer_id: user!.id,
      farmer_id: farmerId,
      product_id: null,
      milk_label: selectedBreedOption?.label ?? null,
      breed: selectedBreedOption?.breed ?? null,
      animal_type: selectedBreedOption?.animalType ?? null,
      qty,
      shift: `${shift}@${timeSlot}`,
      delivery_time: timeSlot,
      time_slot: timeSlot,
      plan_mode: planMode,
      weekly_qty:
        planMode === "weekly"
          ? weekly
          : {
              mon: qty,
              tue: qty,
              wed: qty,
              thu: qty,
              fri: qty,
              sat: qty,
              sun: qty,
            },
      start_date: startDate,
      end_date: hasEndDate ? endDate : null,
      frequency: planMode === "weekly" ? "weekly" : "daily",
      status: "active",
    };
  };

  const payAndCreate = async () => {
    if (!canSubmit) {
      setErr("Please fill all required fields (farmer + milk type + qty + dates + time).");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay Checkout script.");

      const sessionRes = await (supabase as any).auth.getSession?.();
      const token = sessionRes?.data?.session?.access_token || "";
      if (!token) throw new Error("Not logged in");

      const orderRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-upi-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: NEW_FEE_INR }),
        }
      );

      const orderJson = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        throw new Error(orderJson?.error ?? "Order creation failed");
      }

      const { key_id, order_id, amount, currency } = orderJson;

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: "MilkMate",
        description: "New Subscription Fee",
        order_id,
        prefill: { email: user?.email ?? "" },
        method: { upi: true },
        handler: async (response: any) => {
          try {
            const payload = buildSubscriptionPayload();

            const verifyRes = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-upi-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  subscriptionPayload: payload,
                }),
              }
            );

            const verifyJson = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok) {
              throw new Error(verifyJson?.error ?? "Payment verification failed");
            }

            nav("/customer?subscribed=1");
          } catch (e: any) {
            console.error(e);
            setErr(e?.message ?? "Verification failed");
          } finally {
            setSaving(false);
          }
        },
        modal: {
          ondismiss: () => setSaving(false),
        },
        theme: { color: "#2563eb" },
      });

      rzp.open();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Payment failed");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Start Subscription {isNew ? <Badge className="ml-2">New</Badge> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            New subscription fee: ₹{NEW_FEE_INR} (UPI). Milk options come directly from farmer cattle breeds.
          </p>
        </div>

        <Button variant="outline" className="rounded-2xl" onClick={() => nav("/customer")}>
          Back
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Selected Product</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="h-20 w-24 overflow-hidden rounded-2xl border bg-muted/30">
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">
              {selectedBreedOption?.label ?? "—"}
            </div>
            <div className="text-sm text-muted-foreground">Daily rate applies</div>
            <div className="text-xs text-muted-foreground mt-1">
              Shift: <span className="font-semibold text-foreground">{shift}</span> • Time:{" "}
              <span className="font-semibold text-foreground">{timeSlot}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Plan Settings</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {err ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Farmer (required)</Label>
            <select
              className="w-full h-11 rounded-2xl border bg-background px-3 text-sm"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
            >
              <option value="">Select farmer</option>
              {farmers.map((f) => (
                <option key={f.user_id} value={f.user_id}>
                  {f.full_name ?? f.user_id}
                </option>
              ))}
            </select>
            {!farmerId ? (
              <p className="text-xs text-destructive">Please select a farmer.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Milk Product</Label>
            <select
              className="w-full h-11 rounded-2xl border bg-background px-3 text-sm"
              value={selectedBreedKey}
              onChange={(e) => setSelectedBreedKey(e.target.value)}
              disabled={!farmerId || breedOptions.length === 0}
            >
              {!farmerId ? (
                <option value="">Select farmer first</option>
              ) : breedOptions.length === 0 ? (
                <option value="">No milk options available</option>
              ) : (
                breedOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>

            {farmerId && breedOptions.length === 0 ? (
              <p className="text-xs text-destructive">
                This farmer has no active cattle breeds for subscription.
              </p>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Plan Mode</Label>
            <Tabs value={planMode} onValueChange={(v: any) => setPlanMode(v)}>
              <TabsList className="w-full rounded-2xl">
                <TabsTrigger className="flex-1 rounded-2xl" value="fixed">
                  Fixed Daily
                </TabsTrigger>
                <TabsTrigger className="flex-1 rounded-2xl" value="weekly">
                  Weekly Pattern
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Quantity (Litres)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Delivery Shift</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={shift === "morning" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setShift("morning")}
                >
                  Morning
                </Button>
                <Button
                  type="button"
                  variant={shift === "evening" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setShift("evening")}
                >
                  Evening
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Time</Label>
            <Input
              type="time"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="rounded-2xl w-56"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Ending Date (optional)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                />
                <span className="text-sm text-muted-foreground">Enable end date</span>
              </div>

              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!hasEndDate}
                className="rounded-2xl"
              />
              {hasEndDate && endDate < startDate ? (
                <p className="text-xs text-destructive">
                  End date must be after start date.
                </p>
              ) : null}
            </div>
          </div>

          {planMode === "weekly" ? (
            <div className="space-y-3 rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Weekly quantities</p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    setWeekly({
                      mon: qty,
                      tue: qty,
                      wed: qty,
                      thu: qty,
                      fri: qty,
                      sat: qty,
                      sun: qty,
                    })
                  }
                >
                  Copy fixed qty → weekly
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((d) => (
                  <div key={d} className="space-y-1">
                    <Label className="uppercase text-xs">{d}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={weekly[d]}
                      onChange={(e) =>
                        setWeekly((w) => ({ ...w, [d]: Number(e.target.value) }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <p className="font-semibold">New Subscription Fee: ₹{NEW_FEE_INR}</p>
            <p className="text-sm text-muted-foreground">Pay via UPI (Razorpay).</p>

            <div className="flex gap-2">
              <Button
                className="rounded-2xl"
                disabled={!canSubmit || saving}
                onClick={payAndCreate}
              >
                {saving ? "Processing..." : `Pay ₹${NEW_FEE_INR} & Create Subscription`}
              </Button>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => nav("/customer")}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}