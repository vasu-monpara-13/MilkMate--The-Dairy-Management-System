import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Star, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  description?: string | null;
  image_url: string | null;
  stock_qty: number;
  rating: number | null;
  category: string;
}

interface Props {
  product: Product | null;
  onClose: () => void;
}

const QuickViewModal = ({ product, onClose }: Props) => {
  const { addToCart, updateQty, getProductQty, itemCount } = useCart();
  if (!product) return null;

  const qty = getProductQty(product.id);
  const baseTime = 20;
  const distanceFactor = Math.floor(Math.random() * 6) + 1;
  const loadFactor = Math.min(itemCount * 2, 10);
  const etaMin = baseTime + distanceFactor;
  const etaMax = etaMin + loadFactor + 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg mx-4 md:mx-0 rounded-t-3xl md:rounded-3xl bg-card border border-border overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>

          <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full aspect-video object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />

          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{product.category}</p>
              <h2 className="text-xl font-bold text-foreground font-display">{product.name}</h2>
              <p className="text-sm text-muted-foreground">{product.unit}</p>
            </div>

            {product.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{product.rating}</span>
              </div>
            )}

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Delivery ETA */}
            <div className="rounded-xl bg-secondary/50 p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Delivery in {etaMin}–{etaMax} mins</p>
                <p className="text-[11px] text-muted-foreground">{distanceFactor} km away</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-2xl font-bold text-foreground font-display">₹{product.price}</span>

              {product.stock_qty <= 0 ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : qty === 0 ? (
                <Button onClick={() => addToCart(product.id)} className="rounded-xl gap-1.5">
                  <Plus className="h-4 w-4" /> Add to Cart
                </Button>
              ) : (
                <div className="flex items-center gap-0 rounded-xl border border-primary bg-primary/5 overflow-hidden">
                  <button onClick={() => updateQty(product.id, qty - 1)} className="px-3 py-2 text-primary hover:bg-primary/10">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-primary">{qty}</span>
                  <button onClick={() => updateQty(product.id, qty + 1)} className="px-3 py-2 text-primary hover:bg-primary/10">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickViewModal;
