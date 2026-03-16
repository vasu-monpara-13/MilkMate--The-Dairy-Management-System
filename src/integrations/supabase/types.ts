// D:\milkmate_super_fixed - Copy1\src\integrations\supabase\types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customer_subscriptions: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string | null;
          farmer_id: string | null;

          qty: number | null;
          shift: string | null;
          plan_mode: string | null;
          frequency: string | null;

          weekly_qty: Json | null;
          status: string | null;

          start_date: string | null;
          end_date: string | null;

          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id?: string | null;
          farmer_id?: string | null;

          qty?: number | null;
          shift?: string | null;
          plan_mode?: string | null;
          frequency?: string | null;

          weekly_qty?: Json | null;
          status?: string | null;

          start_date?: string | null;
          end_date?: string | null;

          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          product_id?: string | null;
          farmer_id?: string | null;

          qty?: number | null;
          shift?: string | null;
          plan_mode?: string | null;
          frequency?: string | null;

          weekly_qty?: Json | null;
          status?: string | null;

          start_date?: string | null;
          end_date?: string | null;

          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_subscriptions_farmer_id_fkey";
            columns: ["farmer_id"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };

      products: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          price: number;
          unit: string | null;
          description: string | null;
          image_url: string | null;
          stock_qty: number | null;
          rating: number | null;
          is_active: boolean | null;
          created_at: string | null;
          farmer_id: string | null;
          image_locked: boolean | null;
          plan_type: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          price: number;
          unit?: string | null;
          description?: string | null;
          image_url?: string | null;
          stock_qty?: number | null;
          rating?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          farmer_id?: string | null;
          image_locked?: boolean | null;
          plan_type?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          price?: number;
          unit?: string | null;
          description?: string | null;
          image_url?: string | null;
          stock_qty?: string | number | null; // safe
          rating?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          farmer_id?: string | null;
          image_locked?: boolean | null;
          plan_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey";
            columns: ["farmer_id"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };

      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          qty: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          qty?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          qty?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: string | null;
          is_read: boolean | null;
          action_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          type?: string | null;
          is_read?: boolean | null;
          action_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          type?: string | null;
          is_read?: boolean | null;
          action_url?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          email: string | null;
          mobile_number: string | null;
          role: string | null;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          email?: string | null;
          mobile_number?: string | null;
          role?: string | null;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          email?: string | null;
          mobile_number?: string | null;
          role?: string | null;
        };
        Relationships: [];
      };

      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          message: string;
          status: "open" | "in_progress" | "closed";
          priority: "low" | "normal" | "high" | "urgent";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          message: string;
          status?: "open" | "in_progress" | "closed";
          priority?: "low" | "normal" | "high" | "urgent";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          message?: string;
          status?: "open" | "in_progress" | "closed";
          priority?: "low" | "normal" | "high" | "urgent";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

        cattle: {
  Row: {
    id: string;
    farmer_id: string;

    tag_id: string | null;
    name: string | null;
    breed: string | null;
    gender: string | null;
    dob: string | null;

    status: string | null;
    lactation_stage: string | null;

    purchase_date: string | null;
    purchase_price: number | null;

    image_url: string | null;
    notes: string | null;

    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    farmer_id: string;

    tag_id?: string | null;
    name?: string | null;
    breed?: string | null;
    gender?: string | null;
    dob?: string | null;

    status?: string | null;
    lactation_stage?: string | null;

    purchase_date?: string | null;
    purchase_price?: number | null;

    image_url?: string | null;
    notes?: string | null;

    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    farmer_id?: string;

    tag_id?: string | null;
    name?: string | null;
    breed?: string | null;
    gender?: string | null;
    dob?: string | null;

    status?: string | null;
    lactation_stage?: string | null;

    purchase_date?: string | null;
    purchase_price?: number | null;

    image_url?: string | null;
    notes?: string | null;

    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "cattle_farmer_id_fkey";
      columns: ["farmer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    }
  ];
};

  cattle_milk_logs: {
  Row: {
    id: string;
    farmer_id: string;
    cattle_id: string;

    log_date: string; // date
    shift: string | null; // "morning"/"evening"
    milk_l: number | null;

    fat: number | null;
    snf: number | null;
    price_per_l: number | null;

    notes: string | null;
    created_at: string | null;
    updated_at: string| null;
  };
  Insert: {
    id?: string;
    farmer_id: string;
    cattle_id: string;

    log_date: string;
    shift?: string | null;
    milk_l?: number | null;

    fat?: number | null;
    snf?: number | null;
    price_per_l?: number | null;

    notes?: string | null;
    created_at?: string | null;
    updated_at?: string| null;
  };
  Update: {
    id?: string;
    farmer_id?: string;
    cattle_id?: string;

    log_date?: string;
    shift?: string | null;
    milk_l?: number | null;

    fat?: number | null;
    snf?: number | null;
    price_per_l?: number | null;

    notes?: string | null;
    created_at?: string | null;
    updated_at?: string| null;
  };
  };
  
  deliveries: {
  Row: {
    id: string;
    farmer_id: string;
    customer_id: string;

    address_id: string | null;
    order_id: string | null;
    subscription_id: string | null;

    delivery_date: string | null; // date
    time_slot: string | null; // morning/evening (tumhare table me ye hai)
    shift: string | null; // agar column exists ho (optional)
    qty: number | null;
    rate: number | null;

    status: string | null; // scheduled/delivered/cancelled...
    driver_name: string | null;
    driver_phone: string | null;

    notes: string | null;
    proof_image_url: string | null;

    invoice_id: string | null;
    paid: boolean | null;

    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    farmer_id: string;
    customer_id: string;

    address_id?: string | null;
    order_id?: string | null;
    subscription_id?: string | null;

    delivery_date?: string | null;
    time_slot?: string | null;
    shift?: string | null;
    qty?: number | null;
    rate?: number | null;

    status?: string | null;
    driver_name?: string | null;
    driver_phone?: string | null;

    notes?: string | null;
    proof_image_url?: string | null;

    invoice_id?: string | null;
    paid?: boolean | null;

    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    farmer_id?: string;
    customer_id?: string;

    address_id?: string | null;
    order_id?: string | null;
    subscription_id?: string | null;

    delivery_date?: string | null;
    time_slot?: string | null;
    shift?: string | null;
    qty?: number | null;
    rate?: number | null;

    status?: string | null;
    driver_name?: string | null;
    driver_phone?: string | null;

    notes?: string | null;
    proof_image_url?: string | null;

    invoice_id?: string | null;
    paid?: boolean | null;

    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "deliveries_farmer_id_fkey";
      columns: ["farmer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    },
    {
      foreignKeyName: "deliveries_customer_id_fkey";
      columns: ["customer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    },
    {
      foreignKeyName: "deliveries_subscription_id_fkey";
      columns: ["subscription_id"];
      referencedRelation: "customer_subscriptions";
      referencedColumns: ["id"];
    }
  ];
};

  invoices: {
  Row: {
    id: string;

    farmer_id: string;
    customer_id: string;

    invoice_number: string;
    invoice_date: string;

    period_from: string;
    period_to: string;

    total_litres: number;
    subtotal_amount: number;
    discount_amount: number;
    extra_amount: number;
    final_amount: number;

    paid_amount: number;
    due_amount: number;

    payment_status: string;

    notes: string | null;

    created_at: string;
    updated_at: string;
  };

  Insert: {
    id?: string;

    farmer_id: string;
    customer_id: string;

    invoice_number: string;
    invoice_date?: string;

    period_from: string;
    period_to: string;

    total_litres?: number;
    subtotal_amount?: number;
    discount_amount?: number;
    extra_amount?: number;
    final_amount?: number;

    paid_amount?: number;
    due_amount?: number;

    payment_status?: string;

    notes?: string | null;

    created_at?: string;
    updated_at?: string;
  };

  Update: {
    id?: string;

    farmer_id?: string;
    customer_id?: string;

    invoice_number?: string;
    invoice_date?: string;

    period_from?: string;
    period_to?: string;

    total_litres?: number;
    subtotal_amount?: number;
    discount_amount?: number;
    extra_amount?: number;
    final_amount?: number;

    paid_amount?: number;
    due_amount?: number;

    payment_status?: string;

    notes?: string | null;

    created_at?: string;
    updated_at?: string;
  };

  Relationships: [
    {
      foreignKeyName: "invoices_farmer_id_fkey";
      columns: ["farmer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    },
    {
      foreignKeyName: "invoices_customer_id_fkey";
      columns: ["customer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    }
  ];
};

  invoice_items: {
  Row: {
    id: string;

    invoice_id: string;
    delivery_id: string;

    delivery_date: string | null;

    qty: number;
    rate: number;
    amount: number;

    created_at: string;
  };

  Insert: {
    id?: string;

    invoice_id: string;
    delivery_id: string;

    delivery_date?: string | null;

    qty?: number;
    rate?: number;
    amount?: number;

    created_at?: string;
  };

  Update: {
    id?: string;

    invoice_id?: string;
    delivery_id?: string;

    delivery_date?: string | null;

    qty?: number;
    rate?: number;
    amount?: number;

    created_at?: string;
  };

  Relationships: [
    {
      foreignKeyName: "invoice_items_invoice_id_fkey";
      columns: ["invoice_id"];
      referencedRelation: "invoices";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "invoice_items_delivery_id_fkey";
      columns: ["delivery_id"];
      referencedRelation: "deliveries";
      referencedColumns: ["id"];
    }
  ];
};

  invoice_payments: {
  Row: {
    id: string;

    invoice_id: string;
    farmer_id: string;
    customer_id: string;

    amount: number;
    payment_date: string;

    payment_method: string;

    reference_note: string | null;

    created_at: string;
  };

  Insert: {
    id?: string;

    invoice_id: string;
    farmer_id: string;
    customer_id: string;

    amount: number;
    payment_date?: string;

    payment_method?: string;

    reference_note?: string | null;

    created_at?: string;
  };

  Update: {
    id?: string;

    invoice_id?: string;
    farmer_id?: string;
    customer_id?: string;

    amount?: number;
    payment_date?: string;

    payment_method?: string;

    reference_note?: string | null;

    created_at?: string;
  };

  Relationships: [
    {
      foreignKeyName: "invoice_payments_invoice_id_fkey";
      columns: ["invoice_id"];
      referencedRelation: "invoices";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "invoice_payments_farmer_id_fkey";
      columns: ["farmer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    },
    {
      foreignKeyName: "invoice_payments_customer_id_fkey";
      columns: ["customer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    }
  ];
};

  Relationships: [
    {
      foreignKeyName: "cattle_milk_logs_farmer_id_fkey";
      columns: ["farmer_id"];
      referencedRelation: "profiles";
      referencedColumns: ["user_id"];
    },
    {
      foreignKeyName: "cattle_milk_logs_cattle_id_fkey";
      columns: ["cattle_id"];
      referencedRelation: "cattle";
      referencedColumns: ["id"];
    }
  ];


    };

    Views: {};
    Functions: {
      add_to_cart: {
        Args: {
          p_product_id: string;
          p_delta?: number;
        };
        Returns: void;
      };
      apply_invoice_payment: {
  Args: {
    p_invoice_id: string;
    p_amount: number;
    p_payment_method?: string;
    p_reference_note?: string | null;
  };
  Returns: void;
};
    };
    Enums: {};
    CompositeTypes: {};
  };
};