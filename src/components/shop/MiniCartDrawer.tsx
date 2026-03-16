import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function MiniCartDrawer() {
  const navigate = useNavigate();
  const { isMiniCartOpen, closeMiniCart, lastAdded, itemCount, total } = useCart();
  const [going, setGoing] = useState(false);

  const addedName = lastAdded?.product?.name || "Item";
  const addedQty = lastAdded?.qty ?? null;
  const addedImg = lastAdded?.product?.image_url || null;
  const addedPrice = lastAdded?.product?.price ?? null;

  const subtitle = useMemo(() => {
    if (addedQty == null || addedPrice == null) return "Cart updated successfully";
    return `Qty: ${addedQty} • ${formatINR(addedPrice)}`;
  }, [addedQty, addedPrice]);

  const goCart = async () => {
    setGoing(true);
    await new Promise((r) => setTimeout(r, 450));
    closeMiniCart();
    navigate("/customer/cart");
    setGoing(false);
  };

  return (
    <Sheet open={isMiniCartOpen} onOpenChange={(v) => (v ? null : closeMiniCart())}>
      <SheetContent side="right" className="w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Added to cart
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-3 flex gap-3"
          >
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
              {addedImg ? <img src={addedImg} className="h-full w-full object-cover" alt={addedName} /> : null}
            </div>
            <div className="flex-1">
              <div className="font-semibold leading-tight">{addedName}</div>
              <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
            </div>
          </motion.div>

          <div className="rounded-2xl border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{itemCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="font-bold">{formatINR(total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={closeMiniCart}>
              Continue
            </Button>

            <Button className="flex-1" onClick={goCart} disabled={going}>
              {going ? (
                <span className="flex items-center gap-2">
                  Opening...
                  <motion.span initial={{ x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  View Cart <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Tip: You can open this anytime from the Cart icon.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
