import { useState, useEffect } from "react";
import { Milk, LogIn, Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (!isHome) {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { label: "Home", id: "home" },
    { label: "Features", id: "features" },
    { label: "About", id: "about" },
  ];

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur-lg shadow-dairy border-b border-border"
          : isHome
          ? "bg-transparent"
          : "bg-card/95 backdrop-blur-lg shadow-dairy border-b border-border"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <div className="rounded-lg gradient-hero p-2 group-hover:scale-110 transition-transform">
            <Milk className="h-5 w-5 text-white" />
          </div>
          <span
            className={`font-display text-xl font-bold transition-colors ${
              scrolled || !isHome ? "text-foreground" : "text-white"
            }`}
          >
            MilkMate
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 ${
                scrolled || !isHome
                  ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </button>
          ))}
          <ThemeToggle className={scrolled || !isHome ? "" : "text-white/80 hover:text-white hover:bg-white/10"} />
          <button
            onClick={() => navigate("/login")}
            className="ml-2 inline-flex items-center gap-2 rounded-full gradient-hero px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <LogIn className="h-4 w-4" />
            Login
          </button>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            scrolled || !isHome ? "text-foreground" : "text-white"
          }`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-lg border-b border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <ThemeToggle />
                <span className="text-xs text-muted-foreground">Theme</span>
              </div>
              <button
                onClick={() => { setMobileOpen(false); navigate("/login"); }}
                className="rounded-lg gradient-hero px-4 py-3 text-sm font-semibold text-white text-center mt-2"
              >
                Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
