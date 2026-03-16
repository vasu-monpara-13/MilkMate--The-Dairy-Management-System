import { useRef } from "react";
import {
  Users,
  ShoppingCart,
  Receipt,
  ShieldCheck,
  Milk,
  CheckCircle,
  Zap,
  Heart,
  Globe,
  Truck,
  CalendarCheck,
  MapPin,
  CreditCard,
  BarChart3,
  Clock,
  Smartphone,
  Shield,
  Target,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import heroBg from "@/assets/hero-bg.jpg";
import featuresBg from "@/assets/features-bg.jpg";
import aboutBg from "@/assets/about-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const Index = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section with Parallax */}
      <section ref={heroRef} id="home" className="relative h-[100vh] flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
          <img src={heroBg} alt="Dairy farm landscape" className="w-full h-[120%] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </motion.div>

        <motion.div className="relative z-10 container mx-auto px-4 text-center" style={{ opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-5 py-2 text-sm font-medium text-white mb-8 border border-white/20"
          >
            <Milk className="h-4 w-4" />
            Smart Dairy Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-display text-5xl md:text-6xl lg:text-8xl font-extrabold text-white mb-6 tracking-tight"
          >
            Milk<span className="text-dairy-sky">Mate</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Manage your dairy farm operations effortlessly — from milk production to live delivery tracking, all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center gap-2 rounded-full gradient-hero text-white font-semibold px-8 py-4 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => scrollTo("features")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold px-8 py-4 hover:bg-white/20 transition-all text-lg"
            >
              Explore Features
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/60 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats Banner */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="gradient-hero py-12"
      >
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "500+", label: "Active Farmers" },
            { value: "10K+", label: "Litres Tracked Daily" },
            { value: "99.9%", label: "Uptime" },
            { value: "50+", label: "Areas Covered" },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeUp} className="text-center">
              <p className="text-3xl md:text-4xl font-display font-extrabold text-white">{stat.value}</p>
              <p className="text-sm text-white/70 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Dashboard Cards Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <span className="inline-block rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold mb-4">
              Dashboard
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Manage Everything
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Quick access to all modules of the dairy management system.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
          >
            {[
              { title: "Farmer Management", description: "Track and manage all farmer profiles and cattle records.", icon: Users, iconColorClass: "dairy-icon-blue", to: "/farmer" },
              { title: "Customer Subscription", description: "Manage milk plans, schedules, and preferences.", icon: ShoppingCart, iconColorClass: "dairy-icon-green", to: "/customer" },
              { title: "Milk Delivery Tracking", description: "Live GPS tracking of milk delivery in real-time.", icon: Truck, iconColorClass: "dairy-icon-sky", to: "/delivery" },
              { title: "Billing System", description: "Generate monthly bills and track payments.", icon: Receipt, iconColorClass: "dairy-icon-amber", to: "/login" },
              { title: "Admin Control", description: "Full system monitoring and area management.", icon: ShieldCheck, iconColorClass: "dairy-icon-purple", to: "/admin" },
            ].map((card, i) => (
              <motion.div key={card.title} custom={i} variants={fadeUp}>
                <DashboardCard {...card} delay={0} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={featuresBg} alt="Dairy features" className="w-full h-full object-cover opacity-[0.04]" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <span className="inline-block rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold mb-4">
              Features
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              A complete toolkit to run your dairy farm smoothly and efficiently.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { title: "Farmer & Dairy Management", description: "Complete cattle tracking, milk recording, and farmer profiles.", icon: Users, iconColorClass: "dairy-icon-blue" },
              { title: "Customer Milk Subscription", description: "Flexible milk plans with quantity, type, and shift selection.", icon: CalendarCheck, iconColorClass: "dairy-icon-green" },
              { title: "Morning & Evening Shifts", description: "Control and schedule milk delivery for both daily shifts.", icon: Clock, iconColorClass: "dairy-icon-amber" },
              { title: "Live Delivery Tracking", description: "Real-time GPS tracking of milk delivery like Zomato/Swiggy.", icon: MapPin, iconColorClass: "dairy-icon-rose" },
              { title: "Automated Billing", description: "Auto-generated monthly invoices with detailed breakdowns.", icon: Receipt, iconColorClass: "dairy-icon-purple" },
              { title: "Online Payments", description: "Pay via Google Pay, UPI, or other digital methods.", icon: CreditCard, iconColorClass: "dairy-icon-sky" },
              { title: "Admin Monitoring", description: "System health, usage stats, and complete control panel.", icon: BarChart3, iconColorClass: "dairy-icon-blue" },
              { title: "Area-wise Delivery", description: "Organize deliveries by geographic zones and routes.", icon: Truck, iconColorClass: "dairy-icon-green" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                className="group rounded-2xl border border-border bg-card p-6 shadow-dairy hover:shadow-dairy-hover transition-all duration-300"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${feature.iconColorClass} transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-base font-bold text-card-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={aboutBg} alt="About dairy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.span custom={0} variants={fadeUp} className="inline-block rounded-full bg-white/15 backdrop-blur-md text-white px-4 py-1.5 text-sm font-semibold mb-4 border border-white/20">
                About MilkMate
              </motion.span>
              <motion.h2 custom={1} variants={fadeUp} className="font-display text-3xl md:text-5xl font-bold text-white mb-6">
                Built for Modern <span className="text-dairy-sky">Dairy Farming</span>
              </motion.h2>
              <motion.p custom={2} variants={fadeUp} className="text-white/75 text-lg leading-relaxed mb-6">
                MilkMate is a comprehensive dairy management system designed to simplify every aspect of your farm operations. Traditional dairy management relies on manual record-keeping, leading to errors, delays, and financial losses.
              </motion.p>
              <motion.p custom={3} variants={fadeUp} className="text-white/75 text-base leading-relaxed mb-8">
                MilkMate solves these problems by providing farmers with digital cattle management, customers with transparent delivery tracking, and administrators with powerful monitoring tools — all in one unified platform.
              </motion.p>

              <motion.div custom={4} variants={fadeUp} className="space-y-4">
                {[
                  { icon: CheckCircle, text: "Complete cattle & production management" },
                  { icon: Zap, text: "Real-time delivery tracking with live map" },
                  { icon: Heart, text: "Customer-friendly subscription system" },
                  { icon: Globe, text: "Multi-area dairy network support" },
                  { icon: Shield, text: "Secure role-based authentication" },
                  { icon: Smartphone, text: "Mobile-responsive design for all devices" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-white/90">
                    <item.icon className="h-5 w-5 text-dairy-sky flex-shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:flex flex-col gap-6"
            >
              {/* Mission & Vision cards */}
              {[
                { icon: Target, title: "Our Mission", text: "To digitize and simplify dairy farm operations for farmers, customers, and administrators across India." },
                { icon: Lightbulb, title: "Our Vision", text: "A future where every dairy farm runs efficiently with technology, ensuring fresh milk delivery and fair billing for everyone." },
                { icon: TrendingUp, title: "Impact", text: "Helping 500+ farmers manage 10,000+ litres daily with zero paperwork and complete transparency." },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-white/10 p-2">
                      <card.icon className="h-5 w-5 text-dairy-sky" />
                    </div>
                    <h3 className="font-display font-bold text-white">{card.title}</h3>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{card.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={0}
        className="py-24 px-4"
      >
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Join hundreds of farmers and dairy managers who trust MilkMate to run their operations efficiently.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center justify-center gap-2 rounded-full gradient-hero text-white font-semibold px-10 py-4 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-lg"
          >
            Start Now — It's Free
          </button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-4 bg-card">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg gradient-hero p-2">
              <Milk className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">MilkMate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 MilkMate — Smart Dairy Farm Management System. Built with ❤️
          </p>
          <div className="flex gap-4">
            <button onClick={() => scrollTo("home")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</button>
            <button onClick={() => scrollTo("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo("about")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
