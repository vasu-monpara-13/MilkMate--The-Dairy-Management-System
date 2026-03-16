import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ShoppingCart, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import ProductCard, { ProductCardSkeleton } from "@/components/shop/ProductCard";
import QuickViewModal from "@/components/shop/QuickViewModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Milk", "Curd & Yogurt", "Paneer & Cheese", "Butter & Ghee", "Drinks", "Desserts", "Powder"];

const ProductsPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [quickView, setQuickView] = useState<any>(null);
  const { itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*").eq("is_active", true);
      setProducts(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== "All") list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    switch (sort) {
      case "price-low": list.sort((a, b) => a.price - b.price); break;
      case "price-high": list.sort((a, b) => b.price - a.price); break;
      case "new": list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      default: list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    }
    return list;
  }, [products, category, search, sort]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 -mx-8 -mt-6 px-8 pt-6 pb-4 bg-white/70 dark:bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search milk, paneer, curd…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-2xl bg-white/80 dark:bg-secondary/40 border-white/10 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 rounded-xl">
            <MapPin className="h-3 w-3" /> Your Area
          </Badge>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px] rounded-xl bg-secondary/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="price-low">Price: Low→High</SelectItem>
              <SelectItem value="price-high">Price: High→Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl relative" onClick={() => navigate("/customer/cart")}>
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filtered.length} products</p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary/80 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
          ))}
        </div>
      )}

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </motion.div>
  );
};

export default ProductsPage;
