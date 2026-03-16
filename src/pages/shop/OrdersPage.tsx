import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, ArrowRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  confirmed: "bg-sky-500/10 text-sky-600",
  packed: "bg-amber-500/10 text-amber-600",
  out_for_delivery: "bg-violet-500/10 text-violet-600",
  delivered: "bg-emerald-500/10 text-emerald-600",
};

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-display">My Orders</h2>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-20 w-20 rounded-full bg-secondary/80 flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground font-display">No orders yet</h2>
        <p className="text-sm text-muted-foreground mt-1">Start by browsing our dairy products</p>
        <Button onClick={() => navigate("/customer/products")} className="mt-5 rounded-xl gap-2">
          <ShoppingBag className="h-4 w-4" /> Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-display">My Orders ({orders.length})</h2>
      {orders.map((order, i) => (
        <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/60 hover:shadow-dairy-hover transition-shadow cursor-pointer" onClick={() => navigate(`/customer/orders/${order.id}`)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground font-display">₹{Number(order.total_amount).toFixed(0)}</p>
                <Badge className={`${statusColors[order.status] || "bg-secondary"} border-0 text-[10px] capitalize mt-1`}>
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default OrdersPage;
