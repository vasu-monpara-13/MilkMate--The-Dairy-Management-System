import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://your-vercel-domain.vercel.app/reset-password",
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Reset link sent to your email 📩");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl backdrop-blur"
      >
        {/* Back */}
        <Link to="/login" className="text-sm flex items-center gap-2 mb-4 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <h2 className="text-2xl font-bold mb-2">Forgot Password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your email to receive a reset link
        </p>

        <div className="relative mb-4">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border py-3 pl-10 pr-4 bg-background focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full py-3 rounded-xl gradient-hero text-white font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>
      </motion.div>
    </div>
  );
}
