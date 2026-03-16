import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Truck, MapPin, ArrowLeft, Clock } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "packed", label: "Packed", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simDistance, setSimDistance] = useState(5.2);

  useEffect(() => {
    if (!orderId) return;
    Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*, products:product_id(name, image_url, unit)").eq("order_id", orderId),
    ]).then(([o, oi]) => {
      setOrder(o.data);
      setItems((oi.data || []).map((d: any) => ({ ...d, product: d.products })));
      setLoading(false);
    });
  }, [orderId]);

  // Simulate delivery distance decreasing
  useEffect(() => {
    if (!order || order.status === "delivered") return;
    const interval = setInterval(() => {
      setSimDistance(prev => Math.max(0.1, prev - 0.3));
    }, 3000);
    return () => clearInterval(interval);
  }, [order]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!order) return <p className="text-muted-foreground">Order not found</p>;

  const stepIndex = STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/customer/orders")} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Status stepper */}
          <Card className="border-border/60">
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground font-display mb-5">Order Status</h3>
              <div className="flex items-center gap-0">
                {STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: active ? 1.1 : 1 }}
                        className={cn(
                          "z-10 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                          done ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
                        )}
                      >
                        <step.icon className="h-4 w-4" />
                      </motion.div>
                      <p className={cn("text-xs mt-2 font-medium", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                      {i < STEPS.length - 1 && (
                        <div className={cn("absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5", done && i < stepIndex ? "bg-primary" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Map-like tracking card */}
          {order.status !== "delivered" && (
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                  {/* Simulated map background */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }} />

                  {/* Route line */}
                  <div className="absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-primary/30">
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.max(10, 100 - simDistance * 15)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>

                  {/* Store pin */}
                  <div className="absolute left-[15%] top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                      <Package className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] text-center mt-1 font-medium text-muted-foreground">Store</p>
                  </div>

                  {/* Delivery dot */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2"
                    animate={{ left: `${15 + (85 - 15) * (1 - simDistance / 5.2)}%` }}
                    transition={{ duration: 1 }}
                  >
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg animate-pulse">
                      <Truck className="h-3 w-3" />
                    </div>
                  </motion.div>

                  {/* Customer pin */}
                  <div className="absolute right-[15%] top-1/2 -translate-y-1/2 translate-x-1/2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] text-center mt-1 font-medium text-muted-foreground">You</p>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Rider is {simDistance.toFixed(1)} km away</span>
                  </div>
                  <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> ~{Math.ceil(simDistance * 5)} mins</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order items */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-foreground font-display">Items ({items.length})</h3>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.product?.image_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded-lg object-cover bg-secondary/30" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product?.unit} × {item.qty}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">₹{(item.price * item.qty).toFixed(0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary sidebar */}
        <Card className="border-border/60 h-fit">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-foreground font-display">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{(Number(order.total_amount) - Number(order.delivery_charge) - Number(order.platform_fee) + Number(order.discount_amount)).toFixed(0)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{Number(order.delivery_charge) === 0 ? "FREE" : `₹${Number(order.delivery_charge).toFixed(0)}`}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Platform Fee</span><span>₹{Number(order.platform_fee).toFixed(0)}</span></div>
              {Number(order.discount_amount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{Number(order.discount_amount).toFixed(0)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-foreground text-base"><span>Total</span><span className="font-display">₹{Number(order.total_amount).toFixed(0)}</span></div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p>Payment: <span className="capitalize font-medium text-foreground">{order.payment_method}</span></p>
              <p>Status: <span className="capitalize font-medium text-foreground">{order.payment_status}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderDetailPage;
