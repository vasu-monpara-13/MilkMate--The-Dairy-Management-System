import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Truck } from "lucide-react";

const CONFETTI = Array.from({ length: 22 }).map((_, i) => ({
  id: i,
  left: (i * 9) % 100,
  delay: (i % 8) * 0.06,
  size: 6 + (i % 4),
}));

export default function OrderConfirmedAnimation({
  open,
  orderId,
  onDone,
}: {
  open: boolean;
  orderId?: string;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-center relative overflow-hidden"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
          >
            {/* Confetti */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {CONFETTI.map((c) => (
                <motion.span
                  key={c.id}
                  className="absolute top-[-12px] rounded-sm bg-primary/80"
                  style={{ left: `${c.left}%`, width: c.size, height: c.size }}
                  initial={{ y: -20, rotate: 0, opacity: 0 }}
                  animate={{ y: 520, rotate: 360, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.7, delay: c.delay, ease: "easeOut" }}
                />
              ))}
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>

            <h2 className="text-2xl font-black tracking-tight">
              Order Confirmed!
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Your order has been placed successfully. We’re preparing it for
              delivery.
            </p>

            {orderId ? (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="text-muted-foreground">Order ID</div>
                <div className="font-black tracking-tight">{orderId}</div>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />
              Estimated delivery: 25–45 min
            </div>

            <div className="mt-6">
              <button
                onClick={onDone}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground hover:opacity-95 transition"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
