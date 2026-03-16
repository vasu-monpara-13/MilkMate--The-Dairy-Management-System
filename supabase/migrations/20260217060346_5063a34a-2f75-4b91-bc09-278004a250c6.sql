
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL,
  unit text NOT NULL,
  description text,
  image_url text,
  stock_qty int NOT NULL DEFAULT 0,
  rating numeric DEFAULT 4.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read products"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cart items table
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart" ON public.cart_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  delivery_charge numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 5,
  discount_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'unpaid',
  status text NOT NULL DEFAULT 'confirmed',
  address_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Order items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty int NOT NULL,
  price numeric NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Users create own order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Admins manage all order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delivery tracking table
CREATE TABLE public.delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_name text DEFAULT 'Delivery Partner',
  rider_phone text,
  current_distance_km numeric DEFAULT 5.0,
  eta_mins int DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own delivery tracking" ON public.delivery_tracking
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = delivery_tracking.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Admins manage delivery tracking" ON public.delivery_tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed 40+ dairy products with real images
INSERT INTO public.products (name, category, price, unit, description, image_url, stock_qty, rating) VALUES
-- Milk
('Farm Fresh Cow Milk', 'Milk', 30, '500ml', 'Pure and fresh cow milk delivered daily from local farms.', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', 100, 4.5),
('Full Cream Cow Milk', 'Milk', 56, '1L', 'Rich full cream cow milk, perfect for tea and cooking.', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop', 80, 4.7),
('Buffalo Milk', 'Milk', 70, '1L', 'Thick and creamy buffalo milk with high fat content.', 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?w=400&h=400&fit=crop', 60, 4.6),
('Toned Milk', 'Milk', 48, '1L', 'Low-fat toned milk for health-conscious consumers.', 'https://images.unsplash.com/photo-1517448931760-9bf4414148c5?w=400&h=400&fit=crop', 90, 4.3),
('Organic A2 Milk', 'Milk', 90, '1L', 'Premium organic A2 milk from indigenous cow breeds.', 'https://images.unsplash.com/photo-1600788907416-456578634209?w=400&h=400&fit=crop', 40, 4.8),
('Skimmed Milk', 'Milk', 44, '1L', 'Fat-free skimmed milk for a lighter option.', 'https://images.unsplash.com/photo-1587088155172-e9355df99c30?w=400&h=400&fit=crop', 70, 4.2),

-- Curd & Yogurt
('Fresh Dahi', 'Curd & Yogurt', 40, '500g', 'Thick and creamy homemade-style dahi.', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop', 85, 4.4),
('Greek Yogurt Plain', 'Curd & Yogurt', 120, '400g', 'Protein-rich Greek yogurt, thick and creamy.', 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400&h=400&fit=crop', 50, 4.6),
('Mishti Doi', 'Curd & Yogurt', 60, '250g', 'Bengali-style sweet yogurt made with jaggery.', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop', 45, 4.5),
('Flavored Yogurt Mango', 'Curd & Yogurt', 35, '200g', 'Delicious mango-flavored yogurt cup.', 'https://images.unsplash.com/photo-1579954115563-e72bf1381629?w=400&h=400&fit=crop', 60, 4.3),
('Probiotic Curd', 'Curd & Yogurt', 55, '400g', 'Gut-friendly probiotic curd for better digestion.', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop', 55, 4.5),

-- Paneer
('Fresh Paneer', 'Paneer', 80, '200g', 'Soft and fresh cottage cheese, perfect for curries.', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop', 70, 4.6),
('Paneer Block', 'Paneer', 180, '500g', 'Premium quality paneer block for family cooking.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=400&fit=crop', 55, 4.5),
('Malai Paneer', 'Paneer', 100, '200g', 'Extra creamy malai paneer, melts in your mouth.', 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop', 40, 4.7),

-- Cheese
('Mozzarella Cheese', 'Cheese', 150, '200g', 'Stretchy mozzarella perfect for pizza and pasta.', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop', 45, 4.5),
('Cheese Slices', 'Cheese', 120, '200g', 'Processed cheese slices for sandwiches and burgers.', 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&h=400&fit=crop', 65, 4.3),
('Cheddar Cheese Block', 'Cheese', 220, '200g', 'Aged cheddar cheese with sharp flavor.', 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400&h=400&fit=crop', 35, 4.6),
('Cream Cheese', 'Cheese', 160, '200g', 'Smooth and spreadable cream cheese.', 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=400&h=400&fit=crop', 40, 4.4),

-- Butter & Ghee
('Fresh Butter', 'Butter & Ghee', 55, '100g', 'Golden yellow fresh butter from farm milk.', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop', 75, 4.5),
('Amul Butter', 'Butter & Ghee', 250, '500g', 'India''s favorite butter, rich and creamy.', 'https://images.unsplash.com/photo-1588253980616-22e05a44bd7a?w=400&h=400&fit=crop', 60, 4.7),
('Desi Ghee', 'Butter & Ghee', 320, '500ml', 'Pure desi cow ghee with aromatic flavor.', 'https://images.unsplash.com/photo-1631898039984-fd5e255cf49e?w=400&h=400&fit=crop', 50, 4.8),
('A2 Cow Ghee', 'Butter & Ghee', 450, '500ml', 'Premium A2 ghee from grass-fed indigenous cows.', 'https://images.unsplash.com/photo-1612187715738-39cf0406e5e1?w=400&h=400&fit=crop', 30, 4.9),
('Salted Butter', 'Butter & Ghee', 60, '100g', 'Lightly salted butter perfect for toast.', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop', 65, 4.4),

-- Drinks
('Mango Lassi', 'Drinks', 40, '200ml', 'Refreshing mango lassi made with fresh yogurt.', 'https://images.unsplash.com/photo-1527585743534-7113e3211270?w=400&h=400&fit=crop', 80, 4.6),
('Rose Lassi', 'Drinks', 35, '200ml', 'Fragrant rose-flavored lassi, a Rajasthani classic.', 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&h=400&fit=crop', 60, 4.4),
('Fresh Buttermilk', 'Drinks', 25, '200ml', 'Chilled spiced buttermilk (chaas) for summer.', 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop', 90, 4.3),
('Chocolate Milk', 'Drinks', 45, '200ml', 'Rich chocolate flavored milk shake.', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=400&fit=crop', 70, 4.5),
('Strawberry Milkshake', 'Drinks', 50, '250ml', 'Creamy strawberry milkshake made with real fruit.', 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=400&fit=crop', 55, 4.4),
('Cold Coffee', 'Drinks', 55, '250ml', 'Iced cold coffee with cream and sugar.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop', 65, 4.6),
('Badam Milk', 'Drinks', 60, '200ml', 'Almond-enriched milk with saffron and cardamom.', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop', 45, 4.5),

-- Desserts & Sweets
('Shrikhand', 'Desserts', 90, '250g', 'Maharashtrian sweet hung curd dessert with saffron.', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop', 40, 4.5),
('Rasmalai', 'Desserts', 120, '250g', 'Soft cottage cheese dumplings in saffron milk.', 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=400&fit=crop', 35, 4.7),
('Rasgulla', 'Desserts', 100, '500g', 'Spongy Bengali rasgullas in sugar syrup.', 'https://images.unsplash.com/photo-1666190440431-db69d2dad518?w=400&h=400&fit=crop', 50, 4.6),
('Gulab Jamun', 'Desserts', 110, '500g', 'Soft deep-fried milk balls in rose syrup.', 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&h=400&fit=crop', 55, 4.7),
('Vanilla Ice Cream', 'Desserts', 150, '500ml', 'Classic vanilla bean ice cream tub.', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop', 40, 4.4),
('Kulfi Malai', 'Desserts', 30, '1pc', 'Traditional Indian ice cream with nuts.', 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400&h=400&fit=crop', 70, 4.6),

-- Powder & Others
('Milk Powder', 'Powder', 280, '500g', 'Spray-dried whole milk powder for cooking.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop', 45, 4.3),
('Mawa / Khoya', 'Powder', 200, '250g', 'Fresh mawa for making sweets at home.', 'https://images.unsplash.com/photo-1615485500710-aa71100f29aa?w=400&h=400&fit=crop', 30, 4.5),
('Condensed Milk', 'Powder', 95, '400g', 'Sweetened condensed milk for desserts and chai.', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop', 60, 4.4),
('Whipping Cream', 'Powder', 180, '250ml', 'Fresh whipping cream for cakes and desserts.', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop', 35, 4.5),
('Milk Cream', 'Powder', 70, '200ml', 'Fresh milk cream (malai) for cooking.', 'https://images.unsplash.com/photo-1625869777168-50e0dbc31a58?w=400&h=400&fit=crop', 50, 4.3),
('Paneer Tikka Pack', 'Others', 160, '300g', 'Ready-to-cook marinated paneer tikka.', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=400&fit=crop', 25, 4.6),
('Cheese Spread Garlic', 'Others', 85, '200g', 'Garlic-flavored cheese spread for bread.', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop', 55, 4.3);
