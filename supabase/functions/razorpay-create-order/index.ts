import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

type AddressInput = {
  full_name?: string;
  mobile?: string;
  house?: string;
  area?: string;
  city?: string;
  pincode?: string;
};

type ItemInput = {
  product_id?: string;
  qty?: number;
  price?: number;
};

type CreateOrderBody = {
  address?: AddressInput;
  items?: ItemInput[];
  total_amount?: number;
  delivery_charge?: number;
  platform_fee?: number;
  discount_amount?: number;
  currency?: string;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function badRequest(message: string, details?: unknown) {
  return jsonResponse(
    {
      error: message,
      details: details ?? null,
    },
    400,
  );
}

function serverError(message: string, details?: unknown) {
  return jsonResponse(
    {
      error: message,
      details: details ?? null,
    },
    500,
  );
}

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function basicAuthHeader() {
  const token = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  return `Basic ${token}`;
}

function getUserIdFromAuthHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const jwt = authHeader.replace("Bearer ", "").trim();
  const parts = jwt.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadRaw = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadRaw);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return serverError("Missing Supabase secrets", {
        need: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return serverError("Missing Razorpay secrets", {
        need: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
      });
    }

    const authHeader = req.headers.get("Authorization");
    const userId = getUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return badRequest("Invalid user session");
    }

    const body = (await req.json()) as CreateOrderBody;
    console.log("BODY RECEIVED:", body);
    console.log("AUTH USER:", userId);

    const address = body.address ?? {};
    const items = Array.isArray(body.items) ? body.items : [];

    const totalAmount = toNumber(body.total_amount);
    const deliveryCharge = toNumber(body.delivery_charge);
    const platformFee = toNumber(body.platform_fee);
    const discountAmount = toNumber(body.discount_amount);
    const currency = sanitizeText(body.currency, "INR").toUpperCase();

    const fullName = sanitizeText(address.full_name);
    const mobile = sanitizeText(address.mobile);
    const house = sanitizeText(address.house);
    const area = sanitizeText(address.area);
    const city = sanitizeText(address.city);
    const pincode = sanitizeText(address.pincode);

    if (!fullName || !mobile || !house || !area || !city || !pincode) {
      return badRequest("Incomplete delivery address");
    }

    if (!items.length) {
      return badRequest("Cart is empty");
    }

    if (totalAmount <= 0) {
      return badRequest("Invalid total amount");
    }

    const normalizedItems = items.map((item, index) => {
      const productId = sanitizeText(item.product_id);
      const qty = toNumber(item.qty);
      const price = toNumber(item.price);

      if (!productId) {
        throw new Error(`Item ${index + 1}: product_id missing`);
      }
      if (qty <= 0) {
        throw new Error(`Item ${index + 1}: invalid qty`);
      }
      if (price < 0) {
        throw new Error(`Item ${index + 1}: invalid price`);
      }

      return {
        product_id: productId,
        qty,
        price,
      };
    });

    const calculatedSubtotal = normalizedItems.reduce(
      (acc, item) => acc + item.qty * item.price,
      0,
    );

    const calculatedGrandTotal =
      calculatedSubtotal + deliveryCharge + platformFee - discountAmount;

    if (Math.abs(calculatedGrandTotal - totalAmount) > 1) {
      return badRequest("Total amount mismatch", {
        frontend_total: totalAmount,
        server_total: calculatedGrandTotal,
        subtotal: calculatedSubtotal,
        delivery_charge: deliveryCharge,
        platform_fee: platformFee,
        discount_amount: discountAmount,
      });
    }

    const amountInPaise = Math.round(totalAmount * 100);
    const razorpayReceipt = `ord_${Date.now()}_${userId.slice(0, 8)}`;

    console.log("CREATING RAZORPAY ORDER:", {
      totalAmount,
      currency,
      amountInPaise,
    });

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: razorpayReceipt,
        payment_capture: 1,
        notes: {
          user_id: userId,
          customer_name: fullName,
          mobile,
          city,
        },
      }),
    });

    const razorpayOrder = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("RAZORPAY ERROR:", razorpayOrder);
      return serverError("Failed to create Razorpay order", razorpayOrder);
    }

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const orderInsertPayload = {
      user_id: userId,
      subtotal: calculatedSubtotal,
      total_amount: totalAmount,
      delivery_charge: deliveryCharge,
      platform_fee: platformFee,
      discount_amount: discountAmount,
      payment_method: "razorpay",
      payment_status: "pending",
      status: "pending",
      address_json: {
        full_name: fullName,
        mobile,
        house,
        area,
        city,
        pincode,
      },
    };

    console.log("ORDER INSERT PAYLOAD:", orderInsertPayload);

    const { data: createdOrder, error: orderError } = await adminClient
      .from("orders")
      .insert(orderInsertPayload)
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      console.error("ORDER INSERT ERROR:", orderError);
      return serverError("Failed to create order in database", orderError);
    }

    const orderId = createdOrder.id as string;

    const orderItemsPayload = normalizedItems.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      qty: item.qty,
      price: item.price,
    }));

    const { error: orderItemsError } = await adminClient
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsError) {
      console.error("ORDER ITEMS INSERT ERROR:", orderItemsError);
      return serverError("Failed to create order items", orderItemsError);
    }

    return jsonResponse({
      ok: true,
      order_id: orderId,
      razorpay_order: razorpayOrder,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("razorpay-create-order fatal error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});