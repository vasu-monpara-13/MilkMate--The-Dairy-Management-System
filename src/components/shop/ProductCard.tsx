import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Tag, Eye, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80";

type Product = {
  id: string;
  name: string;
  category: string;
  unit?: string | null;
  price: number;
  stock_qty?: number | null;
  image_url?: string | null;
};

export default function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
}) {
  const cart: any = useCart();
  const [imgOk, setImgOk] = useState(true);

  const safeSrc = useMemo(() => {
    const u = (product.image_url || "").trim();
    return u ? u : FALLBACK_IMG;
  }, [product.image_url]);

  const qtyInCart = useMemo(() => {
    const fn = (cart as any)?.getProductQty;
    if (typeof fn === 'function') {
      try { return Number(fn(product.id) || 0); } catch { return 0; }
    }
    return 0;
  }, [cart, product.id]);

  const addToCartSafe = () => {
    const fn =
      cart?.addToCart ||
      cart?.addItem ||
      cart?.add ||
      cart?.addProduct ||
      cart?.addToCartItem;
    if (typeof fn === "function") {
      // try common call signatures
      try {
        fn(product, 1);
        return;
      } catch {}
      try {
        fn(product);
        return;
      } catch {}
    }
    console.warn("No add-to-cart function found on CartContext.");
  };

  const stock = Number(product.stock_qty ?? 0);
  const stockTone =
    stock <= 0
      ? "bg-red-500/90 text-white"
      : stock <= 5
      ? "bg-amber-500/90 text-white"
      : "bg-emerald-500/90 text-white";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group rounded-3xl overflow-hidden border border-white/10 bg-white/80 dark:bg-card/70 backdrop-blur shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative w-full aspect-[384/295] bg-muted overflow-hidden">
        <img
          src={imgOk ? safeSrc : FALLBACK_IMG}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
          loading="lazy"
          onError={() => setImgOk(false)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black bg-black/55 text-white backdrop-blur">
            LIVE
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black",
              stockTone
            )}
          >
            {stock <= 0 ? "OUT" : stock <= 5 ? "LOW" : "IN STOCK"} • {stock}
          </span>
        </div>

        {/* Category chip */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 dark:bg-black/55 border border-white/20 dark:border-white/10 px-3 py-1 text-[11px] font-black text-foreground dark:text-white backdrop-blur">
            <Tag className="h-3.5 w-3.5" />
            {product.category}
          </span>
        </div>

        {/* Actions */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickView?.(product)}
            className="rounded-2xl px-3 py-2 text-xs font-black border border-white/20 dark:border-white/10 bg-white/85 dark:bg-black/55 hover:bg-white dark:hover:bg-black/65 transition-colors shadow-lg text-foreground dark:text-white"
            title="Quick view"
          >
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View
            </span>
          </button>

          {qtyInCart > 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 dark:border-white/10 bg-white/85 dark:bg-black/55 px-2 py-1.5 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={async () => {
                  const next = qtyInCart - 1;
                  if (next <= 0) {
                    await cart.removeFromCart(product.id);
                  } else {
                    await cart.updateQty(product.id, next);
                  }
                }}
                className="h-8 w-8 rounded-xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition"
                title="Decrease"
              >
                <span className="text-lg leading-none font-black">−</span>
              </button>

              <span className="min-w-[24px] text-center text-sm font-black text-foreground dark:text-white">
                {qtyInCart}
              </span>

              <button
                type="button"
                onClick={async () => {
                  await cart.updateQty(product.id, qtyInCart + 1);
                }}
                className="h-8 w-8 rounded-xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition"
                title="Increase"
              >
                <span className="text-lg leading-none font-black">+</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await cart.addToCart(product.id);
                cart.openMiniCart?.();
              }}
              className="rounded-2xl px-3 py-2 text-xs font-black border border-white/20 dark:border-white/10 bg-white/85 dark:bg-black/55 hover:bg-white dark:hover:bg-black/65 transition-colors shadow-lg text-foreground dark:text-white"
              title="Add to cart"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                ADD
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black tracking-tight truncate text-foreground">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unit:{" "}
              <span className="font-semibold text-foreground/80">
                {product.unit || "-"}
              </span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">Price</div>
            <div className="text-xl font-black text-green-600 tracking-tight">
              ₹{Number(product.price || 0).toFixed(0)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/60 dark:bg-card/40 backdrop-blur shadow-sm">
      <div className="w-full aspect-[384/295] bg-muted animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
