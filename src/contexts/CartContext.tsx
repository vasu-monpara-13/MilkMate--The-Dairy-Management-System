// src/contexts/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  unit?: string | null;
  category?: string | null;
};

export type CartItem = {
  id: string; // cart_items row id
  user_id: string;
  product_id: string;
  qty: number;
  product: CartProduct;
};

type LastAdded = {
  product: CartProduct;
  qty: number;
};

type CouponRule = {
  type: "percent" | "flat";
  value: number; // percent: 0-100, flat: ₹
  minSubtotal?: number;
  message?: string;
};

// ✅ Simple coupon rules (you can extend later)
const COUPONS: Record<string, CouponRule> = {
  MILK10: { type: "percent", value: 10, message: "10% off applied" },
  FIRST50: { type: "flat", value: 50, minSubtotal: 299, message: "₹50 off applied" },
  SAVE20: { type: "percent", value: 20, minSubtotal: 499, message: "20% off applied" },
};

export interface CartContextValue {
  items: CartItem[];
  loading: boolean;

  itemCount: number;
  total: number;

  // ✅ totals used in CheckoutPage
  subtotal: number;
  deliveryCharge: number;
  platformFee: number;
  discount: number;

  // ✅ coupon
  couponCode: string;
  setCouponCode: (code: string) => void;
  applyCoupon: (code?: string) => Promise<void>;
  removeCoupon: () => void;

  // ✅ mini cart drawer
  isMiniCartOpen: boolean;
  lastAdded: LastAdded | null;
  openMiniCart: () => void;
  closeMiniCart: () => void;

  refresh: () => Promise<void>;

  getProductQty: (productId: string) => number;
  addToCart: (productId: string) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // mini cart drawer
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);

  const openMiniCart = () => setIsMiniCartOpen(true);
  const closeMiniCart = () => setIsMiniCartOpen(false);

  // ✅ coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  const fetchCart = async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          user_id,
          product_id,
          qty,
          products:product_id (
            id,
            name,
            price,
            image_url,
            unit,
            category
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: CartItem[] =
        (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          product_id: row.product_id,
          qty: Number(row.qty ?? 1),
          product: {
            id: row.products?.id,
            name: row.products?.name,
            price: Number(row.products?.price ?? 0),
            image_url: row.products?.image_url ?? null,
            unit: row.products?.unit ?? null,
            category: row.products?.category ?? null,
          },
        })) || [];

      setItems(mapped);
    } catch (e: any) {
      console.error("fetchCart error:", e);
      toast({
        variant: "destructive",
        title: "Cart load failed",
        description: e?.message ?? "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getProductQty = (productId: string) => items.find((i) => i.product_id === productId)?.qty ?? 0;

  const addToCart = async (productId: string) => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Please login", description: "Login to add items to cart." });
      return;
    }

    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      await updateQty(productId, existing.qty + 1);
      return;
    }

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: productId,
      qty: 1,
    });

    if (error) {
      console.error("Cart insert error:", error);
      toast({ variant: "destructive", title: "Couldn't add to cart", description: error.message });
      return;
    }

    // set last added for mini cart + refresh
    const p = items.find((i) => i.product_id === productId)?.product;
    if (p) setLastAdded({ product: p, qty: 1 });
    await fetchCart();
    openMiniCart();
  };

  const updateQty = async (productId: string, qty: number) => {
    if (!user?.id) return;

    const nextQty = Math.max(0, Math.floor(qty));
    const existing = items.find((i) => i.product_id === productId);

    if (!existing && nextQty > 0) {
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: productId,
        qty: nextQty,
      });
      if (error) {
        toast({ variant: "destructive", title: "Couldn't update cart", description: error.message });
        return;
      }
      await fetchCart();
      return;
    }

    if (existing && nextQty <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (existing) {
      const { error } = await supabase.from("cart_items").update({ qty: nextQty }).eq("id", existing.id);

      if (error) {
        toast({ variant: "destructive", title: "Couldn't update quantity", description: error.message });
        return;
      }
      await fetchCart();
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user?.id) return;
    const existing = items.find((i) => i.product_id === productId);
    if (!existing) return;

    const { error } = await supabase.from("cart_items").delete().eq("id", existing.id);

    if (error) {
      toast({ variant: "destructive", title: "Couldn't remove item", description: error.message });
      return;
    }
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user?.id) return;
    const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't clear cart", description: error.message });
      return;
    }
    await fetchCart();
    // ✅ reset coupon too
    setCouponCode("");
    setCouponDiscount(0);
  };

  // ✅ totals
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + Number(i.qty || 0), 0), [items]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.product?.price || 0), 0),
    [items]
  );

  // You can tune these later
  const deliveryCharge = useMemo(() => (subtotal >= 499 || subtotal === 0 ? 0 : 39), [subtotal]);
  const platformFee = useMemo(() => (subtotal === 0 ? 0 : 5), [subtotal]);

  // ✅ coupon handlers
  const applyCoupon = async (code?: string) => {
    const raw = (code ?? couponCode).trim().toUpperCase();
    setCouponCode(raw);

    if (!raw) {
      setCouponDiscount(0);
      return;
    }

    const rule = COUPONS[raw];
    if (!rule) {
      setCouponDiscount(0);
      toast({ variant: "destructive", title: "Invalid coupon", description: "This coupon code is not valid." });
      return;
    }

    if (rule.minSubtotal && subtotal < rule.minSubtotal) {
      setCouponDiscount(0);
      toast({
        variant: "destructive",
        title: "Coupon not applicable",
        description: `Minimum subtotal ₹${rule.minSubtotal} required.`,
      });
      return;
    }

    const next =
      rule.type === "percent"
        ? Math.round((subtotal * rule.value) / 100)
        : Math.round(rule.value);

    setCouponDiscount(Math.max(0, Math.min(next, subtotal))); // never exceed subtotal
    toast({ title: "Coupon applied", description: rule.message ?? "Discount applied successfully." });
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    toast({ title: "Coupon removed" });
  };

  // ✅ discount = coupon discount (extend later if you add promos)
  const discount = useMemo(() => (subtotal === 0 ? 0 : couponDiscount), [couponDiscount, subtotal]);

  const total = useMemo(
    () => Math.max(0, subtotal + deliveryCharge + platformFee - discount),
    [subtotal, deliveryCharge, platformFee, discount]
  );

  const value: CartContextValue = {
    items,
    loading,

    itemCount,
    total,

    subtotal,
    deliveryCharge,
    platformFee,
    discount,

    couponCode,
    setCouponCode,
    applyCoupon,
    removeCoupon,

    isMiniCartOpen,
    lastAdded,
    openMiniCart,
    closeMiniCart,

    refresh: fetchCart,

    getProductQty,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}