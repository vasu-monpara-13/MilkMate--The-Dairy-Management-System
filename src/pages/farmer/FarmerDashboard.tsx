// src/pages/farmer/FarmerDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { uploadProductImage } from "@/lib/uploadProductImage";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import {
  Trash2,
  RefreshCw,
  IndianRupee,
  Pencil,
  Save,
  X,
  Eye,
  Search,
  ShoppingBag,
  Package,
  Sparkles,
  Milk,
  Users,
  Sun,
  Filter,
  Plus,
  Minus,
  Tag,
  Image as ImageIcon,
  Beef,
  Truck,
  Receipt,
} from "lucide-react";

import FarmerSidebar, { FarmerMenuId } from "@/components/FarmerSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { StatusBadge } from "@/components/farmer/StatusBadge";
import { calcPayout, DEFAULT_PAYOUT } from "@/lib/dairyPayout";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

// shadcn dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import CattleManagement from "./CattleManagement"
import MilkProduction from "./MilkProduction"
import FarmerCustomers from "./FarmerCustomers"
import CattleMilkLogs from "@/pages/farmer/CattleMilkLogs";

/**
 * ✅ FARMER THEME COLOR
 */
const FARMER_GREEN = "#0ccf3d";

/** ✅ Safe fallback image (always loads) */
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=1200&q=80";

/** ✅ Default create draft (single source of truth) */
const DEFAULT_CREATE_DRAFT = {
  name: "",
  category: "Milk",
  unit: "1L",
  price: "60",
  stock_qty: "20",
  image_url: "",
  is_active: true,
} as const;

/** ✅ Normalize URLs (trim + prevent empty) */
function normalizeImageUrl(url: string | null | undefined) {
  const u = (url || "").trim();
  return u ? u : null;
}

/** ✅ Add/replace cache-bust param so new uploads show instantly (CDN safe) */
function withCacheBust(url: string | null | undefined) {
  const u = normalizeImageUrl(url);
  if (!u) return null;
  try {
    const parsed = new URL(u);
    parsed.searchParams.set("v", String(Date.now()));
    return parsed.toString();
  } catch {
    // if it's not a valid absolute URL, fall back
    const hasQ = u.includes("?");
    const base = u.replace(/([?&])v=\d+/, "$1v=" + Date.now());
    if (base !== u) return base;
    return `${u}${hasQ ? "&" : "?"}v=${Date.now()}`;
  }
}

/**
 * ✅ Client-side validation: try to load as an <img>.
 */
function validateImageUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const u = normalizeImageUrl(url);
    if (!u) return resolve(false);

    const img = new Image();
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(true);
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    // cache-bust
    const cacheBust = u.includes("?") ? "&" : "?";
    img.src = `${u}${cacheBust}cb=${Date.now()}`;
  });
}

function ImageUrlPreview({ url }: { url: string | null | undefined }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [src, setSrc] = useState<string>(normalizeImageUrl(url) || FALLBACK_IMG);

  useEffect(() => {
    const u = normalizeImageUrl(url);
    if (!u) {
      setOk(null);
      setSrc(FALLBACK_IMG);
      return;
    }
    setSrc(u);
    setOk(null);
    validateImageUrl(u, 4500).then((valid) => setOk(valid));
  }, [url]);

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted border border-border/60">
        <img
          src={src}
          alt="preview"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMG;
            setOk(false);
          }}
        />
      </div>
      <div className="min-w-0">
        {normalizeImageUrl(url) ? (
          ok === false ? (
            <p className="text-xs font-semibold text-red-600">
              URL is blocked / broken (won’t show on cards)
            </p>
          ) : ok === true ? (
            <p className="text-xs font-semibold text-emerald-600">
              Image OK (will show on cards)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Checking image…</p>
          )
        ) : (
          <p className="text-xs text-muted-foreground">
            No URL provided (fallback image will be used)
          </p>
        )}
        <p className="text-[11px] text-muted-foreground truncate">
          Tip: Use direct image links or Supabase Storage. Avoid Google/Drive/Instagram links.
        </p>
      </div>
    </div>
  );
}

type MenuId =
  | "dashboard"
  | "cattle"
  | "milkLogs"
  | "production"
  | "products"
  | "customers"
  | "delivery"
  | "billing";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock_qty: number;
  image_url: string | null;
  is_active: boolean;
  farmer_id: string | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  qty: number;
  price: number;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    unit: string;
    category: string;
    price: number;
    farmer_id?: string | null;
  } | null;
  orders: {
    id: string;
    created_at: string;
    status: string;
    total_amount: number;
    user_id: string;
    address_json: any;
  } | null;
};

type FarmerOrder = {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  user_id: string;
  address_json: any;
  items: Array<{
    id: string;
    qty: number;
    price: number;
    product: {
      id: string;
      name: string;
      image_url: string | null;
      unit: string;
      category: string;
    };
  }>;
  farmer_subtotal: number;
};

type SupplyDemandRow = {
  breed: string;
  supply: number;
  demand: number;
  balance: number;
};



type DeliveryRow = {
  id: string;
  farmer_id: string;
  customer_id: string;
  subscription_id: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  qty: number | null;
  rate: number | null;
  status: string | null;

  subscription?: {
    cattle?: {
      name?: string | null;
      breed?: string | null;
      type?: string | null;
    };
    product?: {
      name?: string | null;
    };
  };
};

function formatMoney(n: number) {
  return `₹${Number(n || 0).toFixed(0)}`;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pickNumber(row: any, keys: string[]) {
  for (const k of keys) {
    const n = Number(row?.[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickDate(row: any, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  }
  return null;
}

export default function FarmerDashboard() {
  const { user, profile } = useAuth();

  const [activeSection, setActiveSection] = useState<FarmerMenuId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cattleCount, setCattleCount] = useState(0);
  const [todayMilkLitres, setTodayMilkLitres] = useState<number>(0);
  const [monthlyRevenueReal, setMonthlyRevenueReal] = useState<number>(0);
  const [monthlyRevenueSource, setMonthlyRevenueSource] = useState<"deliveries" | "orders">("orders");
  const [recentMilkLogs, setRecentMilkLogs] = useState<any[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [monthlyOrderRevenue, setMonthlyOrderRevenue] = useState<number>(0);
  const [monthlyTotalRevenue, setMonthlyTotalRevenue] = useState<number>(0); 
  const [topProductName, setTopProductName] = useState<string>("—");
  const [topProductRevenue, setTopProductRevenue] = useState<number>(0);
  const [topCustomerName, setTopCustomerName] = useState<string>("—");
  const [topCustomerSpent, setTopCustomerSpent] = useState<number>(0);
  const [revenueGrowth, setRevenueGrowth] = useState<number>(0);
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; delivery: number; orders: number }[]>([]);
  const [milkSeries, setMilkSeries] = useState<{ label: string; morning: number; evening: number }[]>([]);
  const [topCattle, setTopCattle] = useState<{ name: string; litres: number }[]>([]);
  const [smartInsight, setSmartInsight] = useState<string>("Everything looks stable this week.");
  const [activityFeed, setActivityFeed] = useState<
  {
    id: string;
    type: "milk" | "order" | "delivery";
    title: string;
    time: string;
    value?: string;
  }[]
>([]);
const [advisorTips, setAdvisorTips] = useState<string[]>([]);



const [milkDeliveries, setMilkDeliveries] = useState<DeliveryRow[]>([]);
const [milkDeliverySearch, setMilkDeliverySearch] = useState("");
const [milkDeliveryStatusFilter, setMilkDeliveryStatusFilter] = useState("all");



const [supplyDemand, setSupplyDemand] = useState<SupplyDemandRow[]>([]);

  // inventory
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ProductRow>>({});
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

  
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [inventoryCompact, setInventoryCompact] = useState(false);

  // ✅ delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // add product modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createDraft, setCreateDraft] = useState<{
    name: string;
    category: string;
    unit: string;
    price: string;
    stock_qty: string;
    image_url: string;
    is_active: boolean;
  }>({ ...DEFAULT_CREATE_DRAFT });

  // ✅ Storage upload state
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // orders
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // payout calculator
  const [litres, setLitres] = useState<number>(50);
  const [fat, setFat] = useState<number>(6.2);
  const [snf, setSnf] = useState<number>(8.6);

  const farmerName = profile?.full_name || "Farmer";

  // ✅ OPEN CREATE MODAL (reset ONLY on open)
  const openCreateModal = () => {
    setCreateDraft({ ...DEFAULT_CREATE_DRAFT });

    if (createImagePreview) URL.revokeObjectURL(createImagePreview);
    setCreateImageFile(null);
    setCreateImagePreview("");

    setCreateOpen(true);
  };

 const fetchTodayMilk = async () => {
  if (!user?.id) return;

  const today = toISODate(new Date());

  const { data, error } = await (supabase as any)
    .from("cattle_milk_logs")
    .select("id, milk_l, shift, log_date, created_at, cattle_id")
    .eq("farmer_id", user.id)
    .eq("log_date", today)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("today milk fetch failed:", error.message);
    setTodayMilkLitres(0);
    setRecentMilkLogs([]);
    return;
  }

  const rows = data || [];

  const total = rows.reduce(
    (sum: number, r: any) => sum + Number(r.milk_l || 0),
    0
  );

  setTodayMilkLitres(total);
  setRecentMilkLogs(rows.slice(0, 5));
};

const fetchMonthlyRevenue = async (groupedOrders?: FarmerOrder[]) => {
  if (!user?.id) return;

  const now = new Date();
  const today = toISODate(now);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  console.log("========== MONTHLY REVENUE DEBUG ==========");
  console.log("user.id:", user.id);
  console.log("monthStart:", monthStart);
  console.log("today:", today);

  // 1) DELIVERY REVENUE
  const { data, error } = await (supabase as any)
    .from("deliveries")
    .select("id, qty, rate, delivery_date, created_at, status, customer_id, farmer_id")
    .eq("farmer_id", user.id)
    .gte("delivery_date", monthStart)
    .lte("delivery_date", today)
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false });

  console.log("deliveries query error:", error);
  console.log("deliveries rows count:", (data ?? []).length);
  console.log(
    "deliveries rows:",
    (data ?? []).map((r: any) => ({
      id: r.id,
      delivery_date: r.delivery_date,
      status: r.status,
      qty: r.qty,
      rate: r.rate,
      farmer_id: r.farmer_id,
    }))
  );

  let deliveryRevenue = 0;

  const deliveredRows = (data ?? []).filter((row: any) => {
    const s = String(row.status || "").toLowerCase().trim();
    return s === "delivered";
  });

  console.log("deliveredRows count:", deliveredRows.length);
  console.log(
    "deliveredRows:",
    deliveredRows.map((r: any) => ({
      id: r.id,
      delivery_date: r.delivery_date,
      status: r.status,
      qty: r.qty,
      rate: r.rate,
    }))
  );

  deliveryRevenue = deliveredRows.reduce((sum: number, row: any) => {
    return sum + Number(row.qty || 0) * Number(row.rate || 0);
  }, 0);

  console.log("deliveryRevenue:", deliveryRevenue);

  if (!error && data) {
    setRecentDeliveries(deliveredRows.slice(0, 5));
  } else {
    setRecentDeliveries([]);
  }

  // 2) ORDER REVENUE
  const orders = groupedOrders || [];
  const orderRevenue = orders.reduce((sum, o) => {
    const d = new Date(o.created_at);
    const sameMonth =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth();

    return sameMonth ? sum + Number(o.farmer_subtotal || 0) : sum;
  }, 0);

  console.log("orderRevenue:", orderRevenue);

  // 3) FINAL SETS
  setMonthlyRevenueReal(deliveryRevenue);
  setMonthlyRevenueSource("deliveries");
  setMonthlyOrderRevenue(orderRevenue);
  setMonthlyTotalRevenue(deliveryRevenue + orderRevenue);

  console.log("monthlyTotalRevenue:", deliveryRevenue + orderRevenue);
  console.log("==========================================");
};

  const fetchEverything = async () => {
    if (!user) return;
    setRefreshing(true);
const todayIso = new Date().toISOString().slice(0, 10);

const { data: todayMilkLogs, error: milkErr } = await (supabase as any)
  .from("cattle_milk_logs")
  .select("cattle_id, milk_l, log_date")
  .eq("farmer_id", user.id)
  .eq("log_date", todayIso);

if (milkErr) throw milkErr;

const { data: farmerCattle, error: cattleErr } = await (supabase as any)
  .from("cattle")
  .select("id, breed, farmer_id")
  .eq("farmer_id", user.id);

if (cattleErr) throw cattleErr;

const { data: activeSubs, error: subsErr } = await (supabase as any)
  .from("customer_subscriptions")
  .select("id, product_id, qty, status, start_date, end_date, farmer_id")
  .eq("farmer_id", user.id)
  .eq("status", "active");

if (subsErr) throw subsErr;

const productIds = Array.from(
  new Set((activeSubs || []).map((s: any) => s.product_id).filter(Boolean))
);

let subProducts: any[] = [];

if (productIds.length) {
  const { data: prodRows, error: prodErr } = await (supabase as any)
    .from("products")
    .select("id, name, category")
    .in("id", productIds);

  if (prodErr) throw prodErr;
  subProducts = prodRows || [];
}

    try {
      const cattleList = farmerCattle || [];

const cattleBreedMap = new Map<string, string>();

for (const c of cattleList as any[]) {
  const breed = String(c.breed || "").trim();
  if (!breed) continue;
  cattleBreedMap.set(String(c.id), breed);
}

const supplyMap = new Map<string, number>();

for (const row of (todayMilkLogs || []) as any[]) {
  const cattleId = String(row.cattle_id || "");
  const breed = cattleBreedMap.get(cattleId);
  if (!breed) continue;

  const qty = Number(row.milk_l || 0);
  supplyMap.set(breed, (supplyMap.get(breed) || 0) + qty);
}



// SMART SUPPLY vs DEMAND (today deliveries based)

const normalizeBreed = (v: any) => String(v || "").trim().toLowerCase();

const demandMap = new Map<string, number>();

const { data: deliveriesToday, error: deliveriesTodayErr } = await (supabase as any)
  .from("deliveries")
  .select("subscription_id, qty, status")
  .eq("farmer_id", user.id)
  .eq("delivery_date", todayIso)
  .in("status", ["scheduled", "delivered"]);

if (deliveriesTodayErr) throw deliveriesTodayErr;

const todaySubIds = Array.from(
  new Set(
    ((deliveriesToday || []) as any[])
      .map((d: any) => String(d.subscription_id || "").trim())
      .filter(Boolean)
  )
);

let todaySubs: any[] = [];

if (todaySubIds.length > 0) {
  const { data: subRows, error: subRowsErr } = await (supabase as any)
    .from("customer_subscriptions")
    .select("id, breed")
    .in("id", todaySubIds);

  if (subRowsErr) throw subRowsErr;
  todaySubs = (subRows || []) as any[];
}

const subBreedMap = new Map<string, string>();
for (const s of todaySubs) {
  const breed = normalizeBreed(s.breed);
  if (breed) subBreedMap.set(String(s.id), breed);
}

for (const d of (deliveriesToday || []) as any[]) {
  const breedKey = subBreedMap.get(String(d.subscription_id || ""));
  if (!breedKey) continue;

  const qty = Number(d.qty || 0);
  demandMap.set(breedKey, (demandMap.get(breedKey) || 0) + qty);
}

const allBreeds = Array.from(
  new Set([
    ...Array.from(supplyMap.keys()).map((b) => normalizeBreed(b)),
    ...Array.from(demandMap.keys()).map((b) => normalizeBreed(b)),
  ])
).filter(Boolean);

const supplyDemandRows: SupplyDemandRow[] = allBreeds
  .map((breedKey) => {
    const originalSupplyKey =
      Array.from(supplyMap.keys()).find((k) => normalizeBreed(k) === breedKey) || breedKey;

    const supply = Number(supplyMap.get(originalSupplyKey) || 0);
    const demand = Number(demandMap.get(breedKey) || 0);

    return {
      breed: originalSupplyKey,
      supply,
      demand,
      balance: supply - demand,
    };
  })
  .sort((a, b) => a.breed.localeCompare(b.breed));

setSupplyDemand(supplyDemandRows);

console.log("todayIso", todayIso);
console.log("deliveriesToday", deliveriesToday);
console.log("todaySubs", todaySubs);
console.log("demandMap", Array.from(demandMap.entries()));
console.log("supplyDemandRows", supplyDemandRows); 
    // INVENTORY
      const { data: pData, error: pErr } = await (supabase as any)
        .from("products")
        .select(
          "id,name,category,unit,price,stock_qty,image_url,is_active,farmer_id,created_at"
        )
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;
      setProducts(((pData as ProductRow[]) || []).filter(Boolean));

      // ORDERS
      const selectOrderItems = `
        id, order_id, qty, price,
        products:product_id(id, name, image_url, unit, category, price, farmer_id),
        orders:order_id(id, created_at, status, total_amount, user_id, address_json)
      `;

      const { data: oiData, error: oiErr } = await (supabase as any)
        .from("order_items")
        .select(selectOrderItems)
        .eq("products.farmer_id", user.id)
        .order("order_id", { ascending: false });

      if (oiErr) throw oiErr;
     const grouped = groupOrderItems((oiData as OrderItemRow[]) || []);
        setOrders(grouped);
        await fetchMonthlyRevenue(grouped);

      const { data: deliveriesData, error: deliveriesErr } = await (supabase as any)
  .from("deliveries")
 .select(`
  *,
  subscription:customer_subscriptions!deliveries_customer_subscription_fk (
    cattle:cattle!customer_subscriptions_cattle_fk (
      name,
      breed,
      type
    ),
    product:products!customer_subscriptions_product_fk (
      name
    )
  )
`)
  .eq("farmer_id", user.id)
  .order("delivery_date", { ascending: false })
  .order("created_at", { ascending: false });

    if (deliveriesErr) throw deliveriesErr;

    setMilkDeliveries((deliveriesData as any[]) || []);

    

        // TOP PRODUCT + TOP CUSTOMER (current month, orders based)
// TOP PRODUCT + TOP CUSTOMER (current month, orders based)
const now = new Date();

const monthOrders = grouped.filter((o) => {
  const d = new Date(o.created_at);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
});

// Top Product
const productMap = new Map<string, { name: string; revenue: number }>();

for (const order of monthOrders) {
  for (const item of order.items) {
    const key = item.product.id;
    const current = productMap.get(key) ?? {
      name: item.product.name || "Product",
      revenue: 0,
    };

    current.revenue += Number(item.price || 0) * Number(item.qty || 0);
    productMap.set(key, current);
  }
}

const topProduct = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue)[0];

setTopProductName(topProduct?.name || "—");
setTopProductRevenue(topProduct?.revenue || 0);

// Top Customer
const customerMap = new Map<string, number>();

for (const order of monthOrders) {
  customerMap.set(
    order.user_id,
    (customerMap.get(order.user_id) || 0) + Number(order.farmer_subtotal || 0)
  );
}

const topCustomerEntry = Array.from(customerMap.entries()).sort((a, b) => b[1] - a[1])[0];

if (topCustomerEntry) {
  const [customerId, spent] = topCustomerEntry;
  setTopCustomerName(customerId.slice(0, 8).toUpperCase());
  setTopCustomerSpent(spent || 0);
} else {
  setTopCustomerName("—");
  setTopCustomerSpent(0);
}

      // ===== V4 ANALYTICS: revenue graph + milk graph + top cattle + smart insight =====
const nowv4 = new Date();
const last7Days: string[] = [];

for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(nowv4.getDate() - i);
  last7Days.push(toISODate(d));
}

// 1) DELIVERY REVENUE SERIES (last 7 days)
const { data: deliverySeriesRows } = await (supabase as any)
  .from("deliveries")
  .select("delivery_date, qty, rate, status")
  .eq("farmer_id", user.id)
  .in("delivery_date", last7Days)
  .eq("status", "delivered");

// 2) MILK LOGS SERIES (last 7 days)
const { data: milkRows } = await (supabase as any)
  .from("cattle_milk_logs")
  .select("log_date, shift, milk_l, cattle_id")
  .eq("farmer_id", user.id)
  .in("log_date", last7Days);

// 3) CATTLE MASTER (for leaderboard names)
const { data: cattleRows, error: cattleErr } = await (supabase as any)
  .from("cattle")
  .select("*")
  .eq("farmer_id", user.id);

console.log("cattleErr full =>", JSON.stringify(cattleErr, null, 2));
console.log("cattleRows =>", cattleRows);

// -------- Revenue Series --------
const revenueByDate = new Map<string, { delivery: number; orders: number }>();

for (const day of last7Days) {
  revenueByDate.set(day, { delivery: 0, orders: 0 });
}

for (const row of deliverySeriesRows ?? []) {
  const day = row.delivery_date;
  if (!day || !revenueByDate.has(day)) continue;

  const cur = revenueByDate.get(day)!;
  cur.delivery += Number(row.qty || 0) * Number(row.rate || 0);
  revenueByDate.set(day, cur);
}

for (const order of grouped) {
  const created = new Date(order.created_at);
  const day = toISODate(created);

  if (!revenueByDate.has(day)) continue;

  const cur = revenueByDate.get(day)!;
  cur.orders += Number(order.farmer_subtotal || 0);
  revenueByDate.set(day, cur);
}

const revenueSeriesData = last7Days.map((day) => {
  const cur = revenueByDate.get(day)!;
  const d = new Date(day);
  const label = d.toLocaleDateString([], { day: "2-digit", month: "short" });

  return {
    label,
    delivery: cur.delivery,
    orders: cur.orders,
  };
});

setRevenueSeries(revenueSeriesData);

// -------- Milk Series --------
const milkByDate = new Map<string, { morning: number; evening: number }>();

for (const day of last7Days) {
  milkByDate.set(day, { morning: 0, evening: 0 });
}

for (const row of milkRows ?? []) {
  const day = row.log_date;
  if (!day || !milkByDate.has(day)) continue;

  const cur = milkByDate.get(day)!;
  const litres = Number(row.milk_l || 0);
  const shift = String(row.shift || "").toLowerCase();

  if (shift === "morning") cur.morning += litres;
  else if (shift === "evening") cur.evening += litres;

  milkByDate.set(day, cur);
}

const milkSeriesData = last7Days.map((day) => {
  const cur = milkByDate.get(day)!;
  const d = new Date(day);
  const label = d.toLocaleDateString([], { day: "2-digit", month: "short" });

  return {
    label,
    morning: cur.morning,
    evening: cur.evening,
  };
});

setMilkSeries(milkSeriesData);

// -------- Top Cattle Leaderboard --------
const cattleNameMap = new Map<string, string>();
for (const c of cattleRows ?? []) {
const displayName =
  c.name?.trim() ||
  c.tag_no?.trim() ||
  c.breed?.trim() ||
  `Cattle ${String(c.id).slice(0, 6)}`;
  cattleNameMap.set(c.id, displayName);
}

const cattleLitresMap = new Map<string, number>();

for (const row of milkRows ?? []) {
  const cattleId = row.cattle_id;
  if (!cattleId) continue;

  cattleLitresMap.set(
    cattleId,
    (cattleLitresMap.get(cattleId) || 0) + Number(row.milk_l || 0)
  );
}

const topCattleData = Array.from(cattleLitresMap.entries())
  .map(([id, litres]) => ({
    name: cattleNameMap.get(id) || id,
    litres,
  }))
  .sort((a, b) => b.litres - a.litres)
  .slice(0, 5);

  console.log("cattleRows =>", cattleRows);
console.log("cattleNameMap =>", Array.from(cattleNameMap.entries()));
console.log("topCattleData =>", topCattleData);

console.log("FIRST cattleRows[0] =>", cattleRows?.[0]);
console.log("FIRST milkRows[0] =>", milkRows?.[0]);
console.log("FIRST cattleNameMap entry =>", Array.from(cattleNameMap.entries())[0]);
console.log("topCattleData full =>", JSON.stringify(topCattleData, null, 2));

setTopCattle(topCattleData);

// -------- Smart Insight --------
const totalMorning = milkSeriesData.reduce((s, x) => s + x.morning, 0);
const totalEvening = milkSeriesData.reduce((s, x) => s + x.evening, 0);
const totalDeliveryRevenue = revenueSeriesData.reduce((s, x) => s + x.delivery, 0);
const totalOrderRevenue = revenueSeriesData.reduce((s, x) => s + x.orders, 0);

let insight = "Business is stable this week.";

if (totalMorning > totalEvening + 5) {
  insight = "Morning milk production is stronger than evening this week.";
} else if (totalEvening > totalMorning + 5) {
  insight = "Evening milk production is stronger than morning this week.";
} else if (totalDeliveryRevenue > totalOrderRevenue) {
  insight = "Milk delivery billing is outperforming product sales this week.";
} else if (totalOrderRevenue > totalDeliveryRevenue) {
  insight = "Product sales are outperforming milk delivery billing this week.";
} else if (topCattleData.length > 0) {
  insight = `${topCattleData[0].name} is the top performer in the last 7 days.`;
}

if (topCattleData.length === 0 && revenueSeriesData.every((x) => x.delivery === 0 && x.orders === 0)) {
  insight = "No major activity detected in the last 7 days.";
}

if (totalMorning > totalEvening + 5) {
  insight = "Morning milk production is stronger than evening this week.";
} else if (totalEvening > totalMorning + 5) {
  insight = "Evening milk production is stronger than morning this week.";
} else if (totalDeliveryRevenue > totalOrderRevenue) {
  insight = "Milk delivery billing is outperforming product sales this week.";
} else if (totalOrderRevenue > totalDeliveryRevenue) {
  insight = "Product sales are outperforming milk delivery billing this week.";
} else if (topCattleData.length > 0) {
  insight = `${topCattleData[0].name} is the top performer in the last 7 days.`;
}

setSmartInsight(insight);
const tips: string[] = [];

// Milk pattern
if (totalMorning > totalEvening + 5) {
  tips.push("Morning milk collection is stronger than evening. Focus more on evening yield improvement.");
} else if (totalEvening > totalMorning + 5) {
  tips.push("Evening milk collection is stronger than morning. Your evening production cycle is performing better.");
} else {
  tips.push("Morning and evening milk production are balanced this week.");
}

// Revenue pattern
if (totalOrderRevenue > totalDeliveryRevenue) {
  tips.push("Product sales are outperforming milk delivery billing. You can promote subscriptions to balance recurring revenue.");
} else if (totalDeliveryRevenue > totalOrderRevenue) {
  tips.push("Milk delivery billing is outperforming store orders. Your recurring dairy business is strong.");
} else {
  tips.push("Order revenue and delivery revenue are currently balanced.");
}

// Top product
if (topProduct?.name) {
  tips.push(`${topProduct.name} is your best-performing product this month.`);
}

// Top cattle
if (topCattleData.length > 0) {
  tips.push(`${topCattleData[0].name} is your top cattle performer in the last 7 days.`);
}

// Customer concentration
if (topCustomerEntry) {
  const [, spent] = topCustomerEntry;
  if (Number(spent || 0) > 0) {
    tips.push("Your top customer is contributing a meaningful share of revenue. Consider loyalty offers to retain them.");
  }
}

// Fallback
if (!tips.length) {
  tips.push("Business looks stable. Keep monitoring production, deliveries, and product sales.");
}

setAdvisorTips(tips.slice(0, 5));

      // ===== ACTIVITY FEED =====
const activities: any[] = [];

// milk logs
for (const row of milkRows ?? []) {
  activities.push({
    id: `milk-${row.cattle_id}-${row.log_date}-${row.shift}`,
    type: "milk",
    title: `${row.shift} milk recorded`,
    value: `${Number(row.milk_l || 0).toFixed(1)}L`,
    time: row.log_date,
  });
}

// orders
for (const o of grouped.slice(0, 10)) {
  activities.push({
    id: `order-${o.id}`,
    type: "order",
    title: "Customer order placed",
    value: formatMoney(Number(o.farmer_subtotal || 0)),
    time: o.created_at,
  });
}

// deliveries
for (const d of deliverySeriesRows ?? []) {
  activities.push({
    id: `delivery-${d.delivery_date}`,
    type: "delivery",
    title: "Milk delivery completed",
    value: formatMoney(Number(d.qty || 0) * Number(d.rate || 0)),
    time: d.delivery_date,
  });
}

activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

setActivityFeed(activities.slice(0, 8));

      // CATTLE COUNT (optional table)
      const { count: cCount, error: cErr } = await (supabase as any)
        .from("cattle")
        .select("id", { count: "exact", head: true })
        .eq("farmer_id", user.id);

      if (!cErr) setCattleCount(cCount || 0);

        await fetchTodayMilk();
       

      toast({ title: "Updated", description: "Latest farmer data loaded" });
    } catch (e: any) {
      toast({
        title: "Fetch failed",
        description: e?.message || "Could not load farmer data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ Recent activity (REAL)
  const recentActivity = useMemo(() => {
  const lines: Array<{ time: string; text: string; stamp: number }> = [];

  // ORDERS
  for (const o of orders.slice(0, 5)) {
    const stamp = +new Date(o.created_at);

    const time = new Date(o.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push({
      time,
      stamp,
      text: `Order #${o.id.slice(0, 8).toUpperCase()} • ${o.items.length} items • ${formatMoney(o.farmer_subtotal)}`,
    });
  }

  // MILK LOGS
  for (const m of recentMilkLogs.slice(0, 5)) {
    const stamp = +new Date(m.created_at || m.log_date);

    const time = new Date(m.created_at || m.log_date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push({
      time,
      stamp,
      text: `Milk log • ${m.shift === "morning" ? "Morning" : "Evening"} • ${Number(m.milk_l || 0).toFixed(1)}L`,
    });
  }

  // DELIVERIES
  for (const d of recentDeliveries.slice(0, 5)) {
    const stamp = +new Date(d.created_at || d.delivery_date);

    const time = new Date(d.created_at || d.delivery_date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push({
      time,
      stamp,
      text: `Delivery • ${Number(d.qty || 0).toFixed(1)} qty • ${formatMoney(Number(d.qty || 0) * Number(d.rate || 0))}`,
    });
  }

  const merged = lines
    .sort((a, b) => b.stamp - a.stamp)
    .slice(0, 6)
    .map(({ time, text }) => ({ time, text }));

  if (merged.length) return merged;

  return [{ time: "—", text: "No recent live activity yet." }];
}, [orders, recentMilkLogs, recentDeliveries]);

  const stats = useMemo(() => {
    const today = new Date();
    const isToday = (d: string) => {
      const x = new Date(d);
      return (
        x.getFullYear() === today.getFullYear() &&
        x.getMonth() === today.getMonth() &&
        x.getDate() === today.getDate()
      );
    };
    const isThisMonth = (d: string) => {
      const x = new Date(d);
      return x.getFullYear() === today.getFullYear() && x.getMonth() === today.getMonth();
    };

    const todaysOrders = orders.filter((o) => isToday(o.created_at));
    const todaysRevenue = todaysOrders.reduce((s, o) => s + o.farmer_subtotal, 0);

    const monthlyRevenue = orders
      .filter((o) => isThisMonth(o.created_at))
      .reduce((s, o) => s + o.farmer_subtotal, 0);

    const activeCustomers = new Set(
      orders.filter((o) => isThisMonth(o.created_at)).map((o) => o.user_id)
    ).size;

    const liveProducts = products.filter((p) => p.is_active).length;
    const lowStock = products.filter((p) => p.stock_qty <= 5).length;

    return {
      liveProducts,
      lowStock,
      todaysOrders: todaysOrders.length,
      todaysRevenue,
      monthlyRevenue,
      activeCustomers,
    };
  }, [products, orders]);

  const inventoryCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => (categoryFilter === "all" ? true : p.category === categoryFilter))
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)));
  }, [products, productSearch, categoryFilter]);



  const filteredOrders = useMemo(() => {
  const q = orderSearch.trim().toLowerCase();

  const normalizeStatus = (value: string | null | undefined) => {
    const s = String(value || "").toLowerCase().trim();

    if (s === "done" || s === "completed" || s === "success") return "delivered";
    if (s === "out for delivery" || s === "ofd") return "out_for_delivery";
    if (s === "confirm") return "confirmed";
    if (!s) return "pending";

    return s;
  };

  return orders
    .filter((o) => {
      const normalized = normalizeStatus(o.status);
      return statusFilter === "all" ? true : normalized === statusFilter;
    })
    .filter((o) => {
      if (!q) return true;

      const inItems = o.items.some((it) =>
        it.product.name.toLowerCase().includes(q)
      );

      return (
        inItems ||
        o.id.toLowerCase().includes(q) ||
        o.user_id.toLowerCase().includes(q)
      );
    });
}, [orders, orderSearch, statusFilter]);

const shortageAlert = useMemo(() => {
  if (!supplyDemand.length) return null;

  const shortages = supplyDemand.filter((x) => x.balance < 0);
  if (!shortages.length) return null;

  const worst = shortages.sort((a, b) => a.balance - b.balance)[0];

  return {
    breed: worst.breed,
    shortage: Math.abs(worst.balance),
    message: `${worst.breed} milk is short by ${Math.abs(worst.balance).toFixed(1)}L today. Increase production or limit new subscriptions.`,
  };
}, [supplyDemand]);

const filteredMilkDeliveries = useMemo(() => {
  const q = milkDeliverySearch.trim().toLowerCase();

  return milkDeliveries
    .filter((d) => {
      const s = String(d.status || "").toLowerCase().trim();
      return milkDeliveryStatusFilter === "all" ? true : s === milkDeliveryStatusFilter;
    })
    .filter((d) => {
      if (!q) return true;

      return [
        d.id,
        d.customer_id,
        d.subscription_id,
        d.delivery_date,
        d.time_slot,
        d.status,
        String(d.qty ?? ""),
        String(d.rate ?? ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
}, [milkDeliveries, milkDeliverySearch, milkDeliveryStatusFilter]);

  const payout = useMemo(
    () => calcPayout(litres, fat, snf, DEFAULT_PAYOUT),
    [litres, fat, snf]
  );

  // inventory edit
  const startEdit = (p: ProductRow) => {
    // reset edit image state
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditImageFile(null);
    setEditingId(p.id);
    setDraft({
      price: p.price,
      stock_qty: p.stock_qty,
      is_active: p.is_active,
      image_url: p.image_url,
      category: p.category,
      unit: p.unit,
      name: p.name,
    });
  };

  const cancelEdit = () => {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditImageFile(null);
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async (p: ProductRow) => {
    if (!user) return;

    try {
      let finalUrl: string | null = null;

      // 1) If farmer picked a new image file in edit mode, upload it and use returned public URL
      if (editImageFile) {
        setUploadingEditImage(true);
        try {
          const uploaded = await uploadProductImage(editImageFile, user.id);
          finalUrl = withCacheBust((uploaded as any)?.publicUrl || null);
        } finally {
          setUploadingEditImage(false);
        }
      }

      // 2) Else use the URL field (optional)
      if (!finalUrl) {
        const nextUrl = normalizeImageUrl(String(draft.image_url ?? p.image_url ?? ""));
        if (nextUrl) {
          const ok = await validateImageUrl(nextUrl, 5000);
          if (!ok) {
            toast({
              title: "Invalid image URL",
              description: "This link is broken/blocked (404/403). Use a direct image URL or upload a file.",
              variant: "destructive",
            });
            return;
          }
          finalUrl = withCacheBust(nextUrl) || nextUrl;
        } else {
          finalUrl = null;
        }
      }

      const patch: Partial<ProductRow> = {
        price: Number(draft.price ?? p.price),
        stock_qty: Number(draft.stock_qty ?? p.stock_qty),
        is_active: Boolean(draft.is_active ?? p.is_active),
        image_url: finalUrl,
        category: String(draft.category ?? p.category),
        unit: String(draft.unit ?? p.unit),
        name: String(draft.name ?? p.name),
      };

      const { error } = await (supabase as any)
        .from("products")
        .update({
          price: patch.price,
          stock_qty: patch.stock_qty,
          is_active: patch.is_active,
          image_url: patch.image_url,
          category: patch.category,
          unit: patch.unit,
          name: patch.name,
        })
        .eq("id", p.id)
        .eq("farmer_id", user.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, ...(patch as any) } : x))
      );

      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
      setEditImagePreview(null);
      setEditImageFile(null);

      setEditingId(null);
      setDraft({});
      toast({ title: "Saved", description: "Product updated successfully" });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not update product",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (p: ProductRow) => {
    if (!user) return;
    const next = !p.is_active;

    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));

    const { error } = await (supabase as any)
      .from("products")
      .update({ is_active: next })
      .eq("id", p.id)
      .eq("farmer_id", user.id);

    if (error) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !next } : x)));
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: next ? "Product LIVE" : "Product PAUSED", description: p.name });
  };

  const adjustStock = async (p: ProductRow, delta: number) => {
    if (!user) return;
    const nextStock = Math.max(0, (p.stock_qty || 0) + delta);

    // optimistic
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock_qty: nextStock } : x)));

    const { error } = await (supabase as any)
      .from("products")
      .update({ stock_qty: nextStock })
      .eq("id", p.id)
      .eq("farmer_id", user.id);

    if (error) {
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, stock_qty: p.stock_qty } : x))
      );
      toast({ title: "Stock update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Stock updated", description: `${p.name} → ${nextStock}` });
  };

  // ✅ DELETE (Confirm Dialog)
  const askDeleteProduct = (p: ProductRow) => {
    setDeleteTarget(p);
    setDeleteOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!user || !deleteTarget) return;

    const p = deleteTarget;
    const prev = products;

    // optimistic UI remove
    setDeleting(true);
    setProducts((list) => list.filter((x) => x.id !== p.id));

    try {
      const { error } = await (supabase as any)
        .from("products")
        .delete()
        .eq("id", p.id)
        .eq("farmer_id", user.id);

      if (error) throw error;

      toast({ title: "Deleted", description: `${p.name} removed from inventory` });
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e: any) {
      setProducts(prev);
      toast({
        title: "Delete failed",
        description: e?.message || "Could not delete product",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ✅ ONE correct picker function
  const onPickCreateImage = (file: File | null) => {
    setCreateImageFile(file);

    if (createImagePreview) URL.revokeObjectURL(createImagePreview);

    if (!file) {
      setCreateImagePreview("");
      return;
    }

    const preview = URL.createObjectURL(file);
    setCreateImagePreview(preview);

    // if file chosen, clear URL
    setCreateDraft((d) => ({ ...d, image_url: "" }));
  };

  // ✅ FINAL createProduct (Storage upload OR URL fallback)
  const createProduct = async () => {
    if (!user) return;

    const name = createDraft.name.trim();
    const category = createDraft.category.trim();
    const unit = createDraft.unit.trim();
    const price = Number(createDraft.price);
    const stock_qty = Number(createDraft.stock_qty);

    if (!name || !category || !unit || Number.isNaN(price) || Number.isNaN(stock_qty)) {
      toast({
        title: "Missing fields",
        description: "Please fill name, category, unit, price, stock.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      let finalImageUrl: string | null = null;

      // 1) Upload selected file
      if (createImageFile) {
        setUploadingImage(true);
        try {
          const uploaded = await uploadProductImage(createImageFile, user.id);
          finalImageUrl =
            typeof uploaded === "string" ? uploaded : (uploaded as any)?.publicUrl ?? null;
        } finally {
          setUploadingImage(false);
        }
      }

      // 2) Else use URL (optional)
      if (!finalImageUrl) {
        const normalized = normalizeImageUrl(createDraft.image_url);
        if (normalized) {
          const ok = await validateImageUrl(normalized, 5000);
          if (!ok) {
            toast({
              title: "Invalid image URL",
              description:
                "This link is broken/blocked (404/403). Use another direct link or upload.",
              variant: "destructive",
            });
            return;
          }
          finalImageUrl = normalized;
        }
      }

      // 3) Insert into DB
      const { data, error } = await (supabase as any)
        .from("products")
        .insert({
          name,
          category,
          unit,
          price,
          stock_qty,
          image_url: finalImageUrl,
          is_active: Boolean(createDraft.is_active),
          farmer_id: user.id,
        })
        .select("id,name,category,unit,price,stock_qty,image_url,is_active,farmer_id,created_at")
        .single();

      if (error) throw error;

      // 4) Update UI instantly
      setProducts((prev) => [data as ProductRow, ...prev]);

      // 5) Close + reset
      setCreateOpen(false);
      setCreateDraft({ ...DEFAULT_CREATE_DRAFT });

      if (createImagePreview) URL.revokeObjectURL(createImagePreview);
      setCreateImageFile(null);
      setCreateImagePreview("");

      toast({ title: "Product added", description: "Inventory updated" });
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.message || "Could not add product",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    if (!user?.id) return;

    const normalizedStatus = status === "done" ? "delivered" : status;

    const { data, error } = await (supabase as any)
      .from("orders")
      .update({ status: normalizedStatus })
      .eq("id", orderId)
      .select();

   

    if (error) throw error;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: normalizedStatus } : o
      )
    );

    toast({
      title: "Status updated",
      description: `Order marked ${normalizedStatus}`,
    });

    await fetchEverything();
  } catch (e: any) {
    console.error("ORDER STATUS UPDATE FAILED =>", e);
    toast({
      title: "Status failed",
      description: e?.message || "Could not update order status",
      variant: "destructive",
    });
  }
};

const updateMilkDeliveryStatus = async (
  deliveryId: string,
  status: "scheduled" | "out_for_delivery" | "delivered"
) => {
  try {
    if (!user?.id) return;

    const { error } = await (supabase as any)
      .from("deliveries")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId)
      .eq("farmer_id", user.id);

    if (error) throw error;

    setMilkDeliveries((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status } : d))
    );

    toast({
      title: "Delivery updated",
      description:
        status === "scheduled"
          ? "Marked as scheduled"
          : status === "out_for_delivery"
          ? "Marked as out for delivery"
          : "Marked as delivered",
    });

    await fetchEverything();
  } catch (e: any) {
    console.error("MILK DELIVERY STATUS UPDATE FAILED =>", e);
    toast({
      title: "Delivery update failed",
      description: e?.message || "Could not update milk delivery status",
      variant: "destructive",
    });
  }
};

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background">
      <FarmerSidebar
        activeSection={activeSection}
        onSectionChange={(id: any) => setActiveSection(id as MenuId)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarCollapsed ? "pl-[68px]" : "pl-[280px]"
        )}
      >
        {children}
      </div>
    </div>
  );

  if (!user) {
    return (
      <Shell>
        <div className="p-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <p className="font-semibold text-foreground">Not logged in</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please login as a farmer to view this page.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="p-6">
          <div className="h-10 w-56 rounded-xl bg-muted animate-pulse" />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ✅ Delete Confirmation Dialog (global) */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently remove <b>{deleteTarget.name}</b> from your inventory.
                </>
              ) : (
                "This will permanently remove the product from your inventory."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteProduct();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <div className="p-6 lg:p-8 space-y-7">
        {/* TOP BAR */}
       
        {/* DASHBOARD */}
        {activeSection === "dashboard" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6">
              <StatCard
                title="Total Cattle"
                value={String(cattleCount)}
                icon={Beef}
                accent={FARMER_GREEN}
              />
              <StatCard
                title="Today's Milk"
                value={`${todayMilkLitres.toFixed(1)}L`}
                icon={Milk}
                accent="#3b82f6"
              />
              <StatCard
                title="Active Customers"
                value={String(stats.activeCustomers)}
                icon={Users}
                accent="#f59e0b"
              />
              <StatCard
                title="Subscription Revenue"
                value={formatMoney(monthlyRevenueReal)}
                icon={Receipt}
                accent="#10b981"
              />

              <StatCard
                title="Product Order Revenue"
                value={formatMoney(monthlyOrderRevenue)}
                icon={IndianRupee}
                accent="#0ea5e9"
              />

              <StatCard
                title="Total Business Revenue"
                value={formatMoney(monthlyTotalRevenue)}
                icon={Sparkles}
                accent="#8b5cf6"
              />
            </div>

              {/* DASHBOARD INSIGHTS V3 */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm">
    <CardContent className="p-5">
      <p className="text-xs text-muted-foreground">Top Product (This Month)</p>
      <h3 className="text-lg font-bold mt-1 text-foreground">{topProductName}</h3>
      <p className="text-sm text-emerald-600 font-semibold mt-1">
        {formatMoney(topProductRevenue)}
      </p>
    </CardContent>
  </Card>

  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm">
    <CardContent className="p-5">
      <p className="text-xs text-muted-foreground">Top Customer</p>
     <h3 className="text-lg font-bold mt-1 text-foreground">{topCustomerName || "—"}</h3>
      <p className="text-sm text-blue-600 font-semibold mt-1">
        {formatMoney(topCustomerSpent)}
      </p>
    </CardContent>
  </Card>

  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm">
    <CardContent className="p-5">
      <p className="text-xs text-muted-foreground">Order Revenue</p>
      <h3 className="text-lg font-bold mt-1 text-foreground">
        {formatMoney(monthlyOrderRevenue)}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">From dairy products</p>
    </CardContent>
  </Card>

  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm">
    <CardContent className="p-5">
      <p className="text-xs text-muted-foreground">Total Business</p>
      <h3 className="text-lg font-bold mt-1 text-foreground">
        {formatMoney(monthlyTotalRevenue)}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
Milk + Products combined
</p>

<p className="text-xs font-semibold text-emerald-600 mt-1">
📈 {revenueGrowth}% vs last month
</p>
    </CardContent>
  </Card>
</div>

            {/* DASHBOARD V4 ANALYTICS */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
  {/* Revenue Trend */}
  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm shadow-sm xl:col-span-2 overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-extrabold text-foreground">
            Revenue Trend
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Last 7 days • Delivery vs Orders
          </p>
        </div>
      </div>

      <div className="mt-5 h-[300px]">
  {revenueSeries.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No revenue trend data
    </div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={revenueSeries}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="delivery"
          name="Delivery Revenue"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="orders"
          name="Order Revenue"
          stroke="#0ea5e9"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )}
</div>
    </CardContent>
  </Card>

  {/* Smart Insight */}
  <Card className="rounded-3xl border-border/60 overflow-hidden h-fit">
    <CardContent className="p-6 space-y-4">
      <p className="font-display text-xl font-extrabold text-foreground">
  AI Business Advisor
</p>
<p className="text-sm text-muted-foreground mt-1">
  Smart recommendations from your live dairy data
</p>

  <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
  {advisorTips.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      No advisor tips yet
    </div>
  ) : (
    advisorTips.map((tip, idx) => (
      <div
        key={idx}
        className="rounded-2xl border border-border/60 bg-background/60 p-3 shadow-sm"
      >
        <p className="text-sm text-foreground leading-6">
          <span className="mr-2">🤖</span>
          {tip}
        </p>
      </div>
    ))
  )}
</div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/20 p-4 relative overflow-hidden">
  <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
  <p className="text-sm leading-6 text-foreground pl-2">{smartInsight}</p>
</div>


      <div className="mt-5 grid grid-cols-1 gap-3">
        <div className="rounded-2xl border border-border/60 p-4 bg-background/60">
          <p className="text-xs text-muted-foreground">7-Day Delivery Revenue</p>
          <p className="mt-1 font-bold text-emerald-600">
            {formatMoney(revenueSeries.reduce((s, x) => s + x.delivery, 0))}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 p-4 bg-background/60">
          <p className="text-xs text-muted-foreground">7-Day Order Revenue</p>
          <p className="mt-1 font-bold text-sky-600">
            {formatMoney(revenueSeries.reduce((s, x) => s + x.orders, 0))}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>

{/* MILK + CATTLE ANALYTICS */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
  {/* Milk Production Trend */}
  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm shadow-sm xl:col-span-2 overflow-hidden">
    <CardContent className="p-6">
      <div>
        <p className="font-display text-xl font-extrabold text-foreground">
          Milk Production Trend
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Last 7 days • Morning vs Evening
        </p>
      </div>

     <div className="mt-5 h-[300px]">
  {milkSeries.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No milk trend data
    </div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={milkSeries}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        <Bar dataKey="morning" name="Morning Milk" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        <Bar dataKey="evening" name="Evening Milk" fill="#6366f1" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )}
</div>
    </CardContent>
  </Card>

  {/* Top Cattle */}
  <Card className="rounded-3xl border-border/60 bg-card/90 backdrop-blur-sm overflow-hidden">
    <CardContent className="p-6">
      <p className="font-display text-xl font-extrabold text-foreground">
        Top Cattle
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Last 7 days leaderboard
      </p>

      <div className="mt-5 space-y-3">
        {topCattle.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No cattle production data
          </div>
        ) : (
          topCattle.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/20 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
  {idx === 0 ? "👑 " : `#${idx + 1} `}{item.name}
</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {item.litres.toFixed(1)}L
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
</div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="border-border/60 xl:col-span-2 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-extrabold text-foreground">
                        Quick actions
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Common actions that actually work.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="rounded-xl gap-2"
                      onClick={fetchEverything}
                      disabled={refreshing}
                    >
                      <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => {
                        setActiveSection("products");
                        openCreateModal();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <Plus className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Add product</p>
                          <p className="text-xs text-muted-foreground">
                            Create a new inventory item
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => setActiveSection("products")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Manage inventory</p>
                          <p className="text-xs text-muted-foreground">
                            Update price/stock/images
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => setActiveSection("production")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <Milk className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Milk production</p>
                          <p className="text-xs text-muted-foreground">
                            Record today’s collection
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => setActiveSection("cattle")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <Beef className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Cattle</p>
                          <p className="text-xs text-muted-foreground">
                            Manage cow/buffalo list
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => setActiveSection("delivery")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Delivery</p>
                          <p className="text-xs text-muted-foreground">
                            Assign routes & drivers
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left hover:bg-secondary/40 transition"
                      onClick={() => setActiveSection("billing")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: FARMER_GREEN }}
                        >
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">Billing</p>
                          <p className="text-xs text-muted-foreground">
                            Invoices & payments
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {shortageAlert && (
<Card className="border-border/60 overflow-hidden">
<CardContent className="p-6">

<div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">

<p className="font-display text-lg font-extrabold text-red-600">
AI Shortage Alert
</p>

<p className="text-sm text-muted-foreground mt-1">
{shortageAlert.message}
</p>

</div>

</CardContent>
</Card>
)}

              <Card className="border-border/60 overflow-hidden">
  <CardContent className="p-6 space-y-3">
    
    <p className="font-display text-xl font-extrabold text-foreground">
      Smart Supply vs Demand
    </p>

    {supplyDemand.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        No breed-wise data for today
      </div>
    ) : (
      supplyDemand.map((row) => (
        <div
          key={row.breed}
          className="flex items-center justify-between rounded-2xl border border-border/60 p-4"
        >
          <div>
            <p className="font-semibold">{row.breed}</p>
            <p className="text-xs text-muted-foreground">
              Supply {row.supply.toFixed(1)}L • Demand {row.demand.toFixed(1)}L
            </p>
          </div>

          <div
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              row.balance >= 0
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            )}
          >
            {row.balance >= 0 ? "Remaining" : "Shortage"}{" "}
            {Math.abs(row.balance).toFixed(1)}L
          </div>
        </div>
      ))
    )}

  </CardContent>
</Card>

              <Card className="border-border/60 overflow-hidden">
                <CardContent className="p-6">
                  <p className="font-display text-xl font-extrabold text-foreground">
                    Recent activity
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Live feed from your real data.
                  </p>
                  <div className="mt-5 space-y-3">
                   {recentActivity.map((a, idx) => (
  <div
    key={idx}
    className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/20 p-3"
  >
    <div className="flex items-center gap-3">

      <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-background border border-border">
        {a.text.includes("Milk") && "🥛"}
        {a.text.includes("Order") && "🛒"}
        {a.text.includes("Delivery") && "🚚"}
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{a.text}</p>
        <p className="text-xs text-muted-foreground">{a.time}</p>
      </div>

    </div>
  </div>
))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* CATTLE MANAGEMENT */}
        {activeSection === "cattle" && <CattleManagement/>}

        {/* MILK LOGS */}
        {activeSection === "milkLogs" && <CattleMilkLogs />}

        {/* MILK PRODUCTION */}
        {activeSection === "production" && <MilkProduction/>}

        {/* CUSTOMERS */}
        {activeSection === "customers" && <FarmerCustomers/>}

        {/* PRODUCTS */}
        {activeSection === "products" && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
              <div className="p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: FARMER_GREEN }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl font-extrabold text-foreground truncate">
                        Dairy Products{" "}
                        <span className="text-muted-foreground text-base font-semibold">
                          • Inventory
                        </span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Upload image to Supabase Storage OR use direct URL.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search product name..."
                      className="pl-9 rounded-xl w-full sm:w-64"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Categories</option>
                    {inventoryCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="secondary"
                    className="rounded-xl gap-2"
                    onClick={() => setInventoryCompact((v) => !v)}
                  >
                    <Package className="h-4 w-4" />
                    {inventoryCompact ? "Comfort" : "Compact"}
                  </Button>

                  {/* ✅ FIXED: NO resetting inside onOpenChange */}
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="rounded-xl gap-2"
                        style={{ backgroundColor: FARMER_GREEN }}
                        onClick={openCreateModal}
                      >
                        <Plus className="h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[560px] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-display">Add a new product</DialogTitle>
                      </DialogHeader>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Product name
                          </label>
                          <Input
                            className="rounded-xl mt-1"
                            value={createDraft.name}
                            onChange={(e) =>
                              setCreateDraft((d) => ({ ...d, name: e.target.value }))
                            }
                            placeholder="e.g., Fresh Cow Milk"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">
                            Category
                          </label>
                          <Input
                            className="rounded-xl mt-1"
                            value={createDraft.category}
                            onChange={(e) =>
                              setCreateDraft((d) => ({ ...d, category: e.target.value }))
                            }
                            placeholder="Milk / Curd / Paneer"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Unit</label>
                          <Input
                            className="rounded-xl mt-1"
                            value={createDraft.unit}
                            onChange={(e) =>
                              setCreateDraft((d) => ({ ...d, unit: e.target.value }))
                            }
                            placeholder="1L / 500ml / 1kg"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">
                            Price (₹)
                          </label>
                          <Input
                            type="number"
                            className="rounded-xl mt-1"
                            value={createDraft.price}
                            onChange={(e) =>
                              setCreateDraft((d) => ({ ...d, price: e.target.value }))
                            }
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Stock</label>
                          <Input
                            type="number"
                            className="rounded-xl mt-1"
                            value={createDraft.stock_qty}
                            onChange={(e) =>
                              setCreateDraft((d) => ({ ...d, stock_qty: e.target.value }))
                            }
                          />
                        </div>

                        {/* ✅ FILE UPLOAD + URL */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Product Image (Upload or URL)
                          </label>

                          <div
                            className={cn(
                              "mt-2 rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 transition",
                              "hover:bg-secondary/30"
                            )}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (!f) return;
                              if (!f.type.startsWith("image/")) {
                                toast({ title: "Only images allowed", variant: "destructive" });
                                return;
                              }
                              onPickCreateImage(f);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  Drag & drop an image here
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  PNG/JPG/WebP • Stored in Supabase Storage
                                </p>
                              </div>

                              <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-secondary/40">
                                Choose File
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    if (!f.type.startsWith("image/")) {
                                      toast({
                                        title: "Only images allowed",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    onPickCreateImage(f);
                                  }}
                                />
                              </label>
                            </div>

                            {(createImagePreview || createDraft.image_url) && (
                              <div className="mt-3 flex items-center gap-3">
                                <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border/60 bg-muted">
                                  <img
                                    src={createImagePreview || createDraft.image_url || FALLBACK_IMG}
                                    alt="preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = FALLBACK_IMG;
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  {createImageFile ? (
                                    <p className="text-xs font-semibold text-foreground truncate">
                                      {createImageFile.name}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground truncate">
                                      URL preview
                                    </p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {createImageFile
                                      ? "Will upload to Supabase Storage on Create."
                                      : "If URL breaks, fallback will be used."}
                                  </p>
                                </div>

                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="rounded-xl"
                                  onClick={() => onPickCreateImage(null)}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Or paste Image URL (optional)
                            </label>
                            <Input
                              className="rounded-xl mt-1"
                              value={createDraft.image_url}
                              onChange={(e) =>
                                setCreateDraft((d) => ({ ...d, image_url: e.target.value }))
                              }
                              placeholder="https://..."
                              disabled={!!createImageFile}
                            />
                            <ImageUrlPreview url={createDraft.image_url} />
                          </div>
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2">
                          <button
                            onClick={() => setCreateDraft((d) => ({ ...d, is_active: !d.is_active }))}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                              createDraft.is_active
                                ? "bg-emerald-500/10 border-emerald-200 text-emerald-700"
                                : "bg-muted/30 border-border text-foreground"
                            )}
                          >
                            <Sparkles className="h-4 w-4" />
                            {createDraft.is_active ? "LIVE on store" : "PAUSED"}
                          </button>

                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              className="rounded-xl"
                              onClick={() => setCreateOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="rounded-xl gap-2"
                              style={{ backgroundColor: FARMER_GREEN }}
                              onClick={createProduct}
                              disabled={creating || uploadingImage}
                            >
                              {creating || uploadingImage ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  {uploadingImage ? "Uploading..." : "Creating..."}
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Create
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="secondary"
                    className="rounded-xl gap-2"
                    onClick={() =>
                      toast({
                        title: "Pro tips",
                        description: "Upload image to Supabase Storage to avoid broken URLs.",
                      })
                    }
                  >
                    <Filter className="h-4 w-4" />
                    Help
                  </Button>
                </div>
              </div>
            </div>

            {/* Inventory quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold">Total Products</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
                    {products.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold">LIVE</p>
                  <p
                    className="mt-1 font-display text-2xl font-extrabold"
                    style={{ color: FARMER_GREEN }}
                  >
                    {stats.liveProducts}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold">Low Stock (≤5)</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-amber-600">
                    {stats.lowStock}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold">Out of Stock</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-red-600">
                    {products.filter((p) => p.stock_qty <= 0).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Grid */}
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-foreground">Product Library</p>
                    <p className="text-sm text-muted-foreground">
                      Images never blank (fallback auto). Delete included.
                    </p>
                  </div>
                </div>

                <div className={cn("p-5", inventoryCompact ? "pt-4" : "")}>
                  {filteredProducts.length === 0 ? (
                    <PremiumEmptyState
                      onAdd={openCreateModal}
                      green={FARMER_GREEN}
                      hint={
                        products.length === 0
                          ? "No products yet. Add your first item."
                          : "No match found."
                      }
                    />
                  ) : (
                    <div
                      className={cn(
                        "grid gap-6",
                        inventoryCompact
                          ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                      )}
                    >
                      {filteredProducts.map((p) => {
                        const isEditing = editingId === p.id;

                        const stockTone =
                          p.stock_qty <= 0
                            ? "bg-red-600 text-white border border-white/20 shadow-lg"
                            : p.stock_qty <= 5
                            ? "bg-amber-500 text-black border border-white/30 shadow-lg"
                            : "bg-emerald-600 text-white border border-white/20 shadow-lg";

                        const safeSrc = normalizeImageUrl(p.image_url) || FALLBACK_IMG;

                        return (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="rounded-3xl border border-border/60 bg-card overflow-hidden hover:shadow-md transition-shadow"
                          >
                            {/* ✅ BIGGER IMAGE CARD (increased) */}
                            <div className="relative h-[280px] w-full bg-muted">
                              <img
                                src={safeSrc}
                                alt={p.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                              <div className="absolute top-3 left-3 flex gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur",
                                    p.is_active
                                      ? "bg-black/60 text-white"
                                      : "bg-white/80 text-foreground border border-border/60"
                                  )}
                                >
                                  {p.is_active ? "LIVE" : "PAUSED"}
                                </span>

                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold",
                                    stockTone
                                  )}
                                >
                                  {p.stock_qty <= 0
                                    ? "OUT"
                                    : p.stock_qty <= 5
                                    ? "LOW"
                                    : "IN STOCK"}{" "}
                                  • {p.stock_qty}
                                </span>
                              </div>

                              <div className="absolute bottom-3 left-3">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 border border-border/60 px-3 py-1 text-[11px] font-bold text-foreground">
                                  <Tag className="h-3.5 w-3.5" />
                                  {p.category}
                                </span>
                              </div>

                              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                <button
                                  onClick={() => toggleActive(p)}
                                  className="rounded-2xl px-3 py-2 text-xs font-bold border border-border bg-white/85 hover:bg-white transition-colors"
                                  style={{ color: p.is_active ? FARMER_GREEN : "inherit" }}
                                >
                                  {p.is_active ? "Pause" : "Go Live"}
                                </button>

                                {/* ✅ Delete button on image */}
                                <button
                                  onClick={() => askDeleteProduct(p)}
                                  className="rounded-2xl px-3 py-2 text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                  title="Delete product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className={cn("p-6", inventoryCompact ? "p-4" : "")}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate">{p.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    Unit:{" "}
                                    <span className="font-semibold text-foreground/80">
                                      {p.unit}
                                    </span>
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-[11px] text-muted-foreground">Price</p>
                                  <p
                                    className="font-display text-lg font-extrabold"
                                    style={{ color: FARMER_GREEN }}
                                  >
                                    ₹{Number(p.price || 0).toFixed(0)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/30 p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground font-semibold">
                                    Stock control
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl"
                                      onClick={() => adjustStock(p, -5)}
                                    >
                                      <Minus className="h-4 w-4" />5
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl"
                                      onClick={() => adjustStock(p, -1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl"
                                      onClick={() => adjustStock(p, +1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl"
                                      onClick={() => adjustStock(p, +5)}
                                    >
                                      <Plus className="h-4 w-4" />5
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                {!isEditing ? (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl gap-2"
                                      onClick={() => startEdit(p)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl gap-2"
                                      onClick={() =>
                                        toast({
                                          title: "Preview",
                                          description: p.image_url
                                            ? "Image shown on the card."
                                            : "No image_url, fallback is used.",
                                        })
                                      }
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl gap-2"
                                      disabled={uploadingEditImage}
                                      onClick={() => saveEdit(p)}
                                    >
                                      <Save className="h-4 w-4" />
                                      {uploadingEditImage ? "Uploading..." : "Save"}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl gap-2"
                                      onClick={cancelEdit}
                                    >
                                      <X className="h-4 w-4" />
                                      Cancel
                                    </Button>
                                  </div>
                                )}

                                <span
                                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                                  style={{
                                    backgroundColor: `${FARMER_GREEN}12`,
                                    color: FARMER_GREEN,
                                  }}
                                >
                                  ID: {p.id.slice(0, 6).toUpperCase()}
                                </span>
                              </div>

                              {isEditing && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-4 space-y-3"
                                >
                                  <Separator />
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Name
                                      </p>
                                      <Input
                                        className="rounded-xl"
                                        value={String(draft.name ?? p.name)}
                                        onChange={(e) =>
                                          setDraft((d) => ({ ...d, name: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Category
                                      </p>
                                      <Input
                                        className="rounded-xl"
                                        value={String(draft.category ?? p.category)}
                                        onChange={(e) =>
                                          setDraft((d) => ({
                                            ...d,
                                            category: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Unit
                                      </p>
                                      <Input
                                        className="rounded-xl"
                                        value={String(draft.unit ?? p.unit)}
                                        onChange={(e) =>
                                          setDraft((d) => ({ ...d, unit: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Price
                                      </p>
                                      <Input
                                        type="number"
                                        className="rounded-xl"
                                        value={String(draft.price ?? p.price)}
                                        onChange={(e) =>
                                          setDraft((d) => ({
                                            ...d,
                                            price: Number(e.target.value),
                                          }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Stock
                                      </p>
                                      <Input
                                        type="number"
                                        className="rounded-xl"
                                        value={String(draft.stock_qty ?? p.stock_qty)}
                                        onChange={(e) =>
                                          setDraft((d) => ({
                                            ...d,
                                            stock_qty: Number(e.target.value),
                                          }))
                                        }
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className="text-[11px] text-muted-foreground mb-1">
                                        Image URL
                                      </p>
                                      <Input
                                        className="rounded-xl"
                                        value={String(draft.image_url ?? p.image_url ?? "")}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setDraft((d) => ({
                                            ...d,
                                            image_url: v,
                                          }));
                                          // If farmer starts typing a URL, clear any picked file (OR behavior)
                                          if (v.trim()) {
                                            if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                            setEditImagePreview(null);
                                            setEditImageFile(null);
                                          }
                                        }}
                                        placeholder="https://..."
                                      />
                                      <div className="mt-2">
                                        
                                      <div className="my-3 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-border/60" />
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                          OR
                                        </span>
                                        <div className="h-px flex-1 bg-border/60" />
                                      </div>

                                      <div
                                        className={cn(
                                          "rounded-2xl border border-border/60 bg-secondary/20 p-3 transition",
                                          "hover:bg-secondary/30"
                                        )}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          const f = e.dataTransfer.files?.[0];
                                          if (!f) return;
                                          if (!f.type.startsWith("image/")) {
                                            toast({
                                              title: "Invalid file",
                                              description: "Please select an image file (png/jpg/webp).",
                                              variant: "destructive",
                                            });
                                            return;
                                          }
                                          // OR behavior: picking a file clears the URL field
                                          setDraft((d) => ({ ...d, image_url: "" }));
                                          if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                          setEditImageFile(f);
                                          setEditImagePreview(URL.createObjectURL(f));
                                        }}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                              Upload new image
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                              PNG/JPG/WebP • Stored in Supabase Storage
                                            </p>
                                          </div>

                                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-secondary/40">
                                            <ImageIcon className="h-4 w-4" />
                                            {editImageFile ? "Change" : "Choose File"}
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                if (!f.type.startsWith("image/")) {
                                                  toast({
                                                    title: "Invalid file",
                                                    description: "Please select an image file (png/jpg/webp).",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                                // OR behavior: picking a file clears the URL field
                                                setDraft((d) => ({ ...d, image_url: "" }));
                                                if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                                setEditImageFile(f);
                                                setEditImagePreview(URL.createObjectURL(f));
                                              }}
                                            />
                                          </label>
                                        </div>

                                        {editImagePreview && (
                                          <div className="mt-3 flex items-center gap-3">
                                            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border/60 bg-muted">
                                              <img
                                                src={editImagePreview}
                                                alt="preview"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                                                }}
                                              />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-foreground truncate">
                                                {editImageFile?.name || "Selected image"}
                                              </p>
                                              <p className="text-[11px] text-muted-foreground truncate">
                                                Will upload to Supabase Storage on Save.
                                              </p>
                                            </div>

                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              className="rounded-xl"
                                              onClick={() => {
                                                if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                                setEditImagePreview(null);
                                                setEditImageFile(null);
                                              }}
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                        )}
                                      </div>

                                      <ImageUrlPreview
                                        url={editImagePreview || String(draft.image_url ?? p.image_url ?? "")}
                                      />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        

        {/* DELIVERY placeholder */}
        {activeSection === "delivery" && (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 border-b border-border/60 flex items-center justify-between">
                <div>
                 <h2 className="font-display font-bold text-foreground">Product Orders</h2>
                  <p className="text-sm text-muted-foreground">
                    Cart and product orders placed by customers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search order / product..."
                      className="pl-9 rounded-xl w-full sm:w-64"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="out_for_delivery">Out for delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                    <p className="font-semibold text-foreground">No orders found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When customers buy your products, orders will appear here.
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              Order #{o.id.slice(0, 8).toUpperCase()}
                            </span>
                            <StatusBadge status={o.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => updateOrderStatus(o.id, "confirmed")}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => updateOrderStatus(o.id, "out_for_delivery")}
                          >
                            O.F.D
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => updateOrderStatus(o.id, "delivered")}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "milk_deliveries" && (
  <Card className="border-border/60 overflow-hidden">
    <CardContent className="p-0">
      <div className="p-5 border-b border-border/60 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-foreground">Milk Deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Subscription milk deliveries for your customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search date / customer / status..."
              className="pl-9 rounded-xl w-full sm:w-64"
              value={milkDeliverySearch}
              onChange={(e) => setMilkDeliverySearch(e.target.value)}
            />
          </div>

          <select
            value={milkDeliveryStatusFilter}
            onChange={(e) => setMilkDeliveryStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
           <option value="all">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {filteredMilkDeliveries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold text-foreground">No milk deliveries found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Subscription delivery rows will appear here.
            </p>
          </div>
        ) : (
          filteredMilkDeliveries.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                   <div className="flex flex-col">
  <span className="text-sm font-bold text-foreground">
    {d.subscription?.cattle?.breed
      ? `${d.subscription.cattle.breed} ${d.subscription.cattle.type === "buffalo" ? "Buffalo" : "Cow"} Milk`
      : d.subscription?.product?.name || "Milk Product"}
  </span>

  <span className="text-xs text-muted-foreground">
    Delivery #{d.id.slice(0, 8).toUpperCase()}
  </span>
</div>
                    <StatusBadge status={d.status || "scheduled"} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Date: {d.delivery_date || "—"} • Slot: {d.time_slot || "—"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Qty: {Number(d.qty || 0).toFixed(1)}L • Rate: ₹{Number(d.rate || 0)}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => updateMilkDeliveryStatus(d.id, "scheduled")}
                  >
                    Scheduled
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => updateMilkDeliveryStatus(d.id, "out_for_delivery")}
                  >
                    Out for Delivery
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => updateMilkDeliveryStatus(d.id, "delivered")}
                  >
                    Delivered
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
)}

        {/* BILLING placeholder */}
        {activeSection === "billing" && (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-6">
              <h2 className="font-display font-bold text-foreground">Billing & Payments</h2>
              <p className="text-sm text-muted-foreground mt-1">Payout calculator</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Litres</p>
                  <Input
                    type="number"
                    className="rounded-xl"
                    value={String(litres)}
                    onChange={(e) => setLitres(Number(e.target.value))}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">FAT</p>
                  <Input
                    type="number"
                    step="0.1"
                    className="rounded-xl"
                    value={String(fat)}
                    onChange={(e) => setFat(Number(e.target.value))}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">SNF</p>
                  <Input
                    type="number"
                    step="0.1"
                    className="rounded-xl"
                    value={String(snf)}
                    onChange={(e) => setSnf(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Per litre rate</p>
                  <p className="font-display font-bold text-foreground">
                    {formatMoney(payout.perLitre)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground">Total payout</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatMoney(payout.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- helpers ---------------- */
function groupOrderItems(rows: OrderItemRow[]): FarmerOrder[] {
  const map = new Map<string, FarmerOrder>();

  for (const r of rows) {
    if (!r.orders) continue;

    const o = r.orders;
    const orderId = o.id;

    if (!map.has(orderId)) {
      map.set(orderId, {
        id: orderId,
        created_at: o.created_at,
        status: o.status || "pending",
        total_amount: o.total_amount,
        user_id: o.user_id,
        address_json: o.address_json,
        items: [],
        farmer_subtotal: 0,
      });
    }

    const entry = map.get(orderId)!;

    if (r.products) {
      const lineTotal = (r.price || 0) * (r.qty || 0);
      entry.farmer_subtotal += lineTotal;

      entry.items.push({
        id: r.id,
        qty: r.qty,
        price: r.price,
        product: {
          id: r.products.id,
          name: r.products.name,
          image_url: r.products.image_url,
          unit: r.products.unit,
          category: r.products.category,
        },
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-background px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-semibold text-foreground">
              {typeof entry.value === "number"
                ? entry.name?.toLowerCase().includes("milk")
                  ? `${entry.value.toFixed(1)}L`
                  : formatMoney(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- UI components ---------------- */
function StatCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: any;
  accent: string;
}) {
  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4">{title}</p>
        <p className="font-display text-3xl font-extrabold mt-1" style={{ color: accent }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function PremiumEmptyState({
  onAdd,
  green,
  hint,
}: {
  onAdd: () => void;
  green: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center bg-gradient-to-b from-muted/30 to-transparent">
      <div
        className="mx-auto h-14 w-14 rounded-3xl flex items-center justify-center text-white shadow-sm"
        style={{ backgroundColor: green }}
      >
        <ShoppingBag className="h-6 w-6" />
      </div>
      <p className="mt-4 font-display text-xl font-extrabold text-foreground">
        No products found
      </p>
      <p className="text-sm text-muted-foreground mt-1">{hint}</p>

      <div className="mt-6 flex items-center justify-center gap-2">
        <Button className="rounded-xl gap-2" style={{ backgroundColor: green }} onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  );
}