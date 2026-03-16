import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
  to?: string;
  delay?: number;
}

const DashboardCard = ({
  title,
  description,
  icon: Icon,
  iconColorClass = "dairy-icon-blue",
  to,
  delay = 0,
}: DashboardCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => to && navigate(to)}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
      className={`group rounded-2xl border border-border bg-card p-6 shadow-dairy transition-shadow duration-300 hover:shadow-dairy-hover ${to ? "cursor-pointer" : ""}`}
    >
      <div className={`mb-4 inline-flex rounded-xl p-3 ${iconColorClass} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-bold text-card-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default DashboardCard;
