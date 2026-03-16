import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, Truck, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CartPage = () => {
  const {
    items, loading, subtotal, deliveryCharge, platformFee, discount, total, itemCount,
    couponCode, setCouponCode, applyCoupon, removeCoupon,
    updateQty, removeFromCart,
  } = useCart();
  const navigate = useNavigate();

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-5">
          <ShoppingBag className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground font-display">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">Looks like you haven't added any dairy products yet. Start shopping!</p>
        <Button onClick={() => navigate("/customer/products")} className="mt-6 rounded-xl gap-2">
          <ShoppingBag className="h-4 w-4" /> Browse Dairy Products
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Item List */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-lg font-bold text-foreground font-display">Cart ({itemCount} items)</h2>
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="rounded-2xl border border-border/60 bg-card p-4 flex gap-4"
            >
              <img src={item.product.image_url || "/placeholder.svg"} alt={item.product.name} className="h-20 w-20 rounded-xl object-cover bg-secondary/30" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{item.product.name}</h3>
                <p className="text-xs text-muted-foreground">{item.product.unit}</p>
                <p className="text-base font-bold text-foreground mt-1 font-display">₹{item.product.price * item.qty}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeFromCart(item.product_id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center rounded-xl border border-primary bg-primary/5 overflow-hidden">
                  <button onClick={() => updateQty(item.product_id, item.qty - 1)} className="px-2 py-1 text-primary hover:bg-primary/10">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-primary">{item.qty}</span>
                  <button onClick={() => updateQty(item.product_id, item.qty + 1)} className="px-2 py-1 text-primary hover:bg-primary/10">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Order Summary */}
      <div className="space-y-4">
        <Card className="border-border/60 sticky top-20">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-foreground font-display">Order Summary</h3>

            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="pl-9 rounded-xl text-xs"
                />
              </div>
              {discount > 0 ? (
                <Button variant="outline" size="sm" onClick={() => removeCoupon()} className="rounded-xl">
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => applyCoupon()} className="rounded-xl text-xs">
                  Apply
                </Button>
              )}
            </div>
            {discount > 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">
                MILK10 applied • ₹{discount.toFixed(0)} off
              </Badge>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Delivery</span>
                <span>{deliveryCharge === 0 ? <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">FREE</Badge> : `₹${deliveryCharge}`}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee</span><span>₹{platformFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>-₹{discount.toFixed(0)}</span>
                </div>
              )}
              <Separator />
              <motion.div
                key={total}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="flex justify-between font-bold text-foreground text-base"
              >
                <span>Total</span><span className="font-display">₹{total.toFixed(0)}</span>
              </motion.div>
            </div>

            {subtotal < 299 && (
              <p className="text-[11px] text-muted-foreground text-center">Add ₹{(299 - subtotal).toFixed(0)} more for free delivery</p>
            )}

            <Button onClick={() => navigate("/customer/checkout")} className="w-full rounded-xl gap-2 h-11">
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CartPage;
