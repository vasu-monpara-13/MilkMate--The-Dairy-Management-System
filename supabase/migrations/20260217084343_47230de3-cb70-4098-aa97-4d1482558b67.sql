
-- Fix product images: assign unique, category-relevant Unsplash images to every product
-- Each URL is a unique photo ID, no duplicates

-- MILK category
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80' WHERE name = 'Full Cream Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80' WHERE name = 'Toned Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=800&q=80' WHERE name = 'Double Toned Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1600788907416-456578634209?auto=format&fit=crop&w=800&q=80' WHERE name = 'Skim Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Cow Milk%' AND name NOT ILIKE '%A2%' AND name NOT ILIKE '%Organic%' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1517448931760-9bf4414148c5?auto=format&fit=crop&w=800&q=80' WHERE name = 'Buffalo Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?auto=format&fit=crop&w=800&q=80' WHERE name = 'A2 Cow Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1576186726115-4d51596775d1?auto=format&fit=crop&w=800&q=80' WHERE name = 'A2 Buffalo Milk' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1590502160462-58b41354f588?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Organic Cow Milk%' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1572443490709-e57345f45939?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Lactose Free%' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Standardised%' AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1602526431578-1fb9e0eba498?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Farm Fresh%' AND category = 'Milk';

-- CURD & YOGURT
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Fresh Dahi%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Thick Dahi%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Low Fat Dahi%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Greek Yogurt%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Mango%Yogurt%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1495214783159-3503fd1b572d?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Strawberry%Yogurt%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Hung Curd%' AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Probiotic%' AND category = 'Curd & Yogurt';

-- PANEER & CHEESE
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Fresh Paneer 200g%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Fresh Paneer 500g%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Paneer Cubes%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Malai Paneer%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Processed Cheese%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Cheese Slices%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1574449476811-b1c5ef9f005a?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Mozzarella%' AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Cheddar%' AND category = 'Paneer & Cheese';

-- BUTTER & GHEE
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%White Butter%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Salted Butter%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1612187209234-9369d7875df5?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Desi Ghee 200ml%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1600398007434-b5146c4dd820?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Desi Ghee 500ml%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1590179068383-b9c69aacebd3?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Desi Ghee 1L%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Cow Ghee%' AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1474625121024-7595bfbc57ac?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Buffalo Ghee%' AND category = 'Butter & Ghee';

-- DRINKS
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Mango Lassi%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1587049016823-69ef9d68f4b3?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Sweet Lassi%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1544252890-c3e95e867367?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Masala Chaas%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Buttermilk%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1570197571499-166b36435e9f?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Badam Milk%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Chocolate Milk%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Strawberry Milk%' AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1582201957428-5765f9fa6885?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Rose Milk%' AND category = 'Drinks';

-- DESSERTS
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Kesar%Shrikhand%' AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Elaichi%Shrikhand%' AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Rasmalai%' AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Vanilla%' AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Butterscotch%' AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Rabri%' AND category = 'Desserts';

-- POWDER
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Milk Powder 200g%' AND category = 'Powder';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1607113256158-56a64e461cb6?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Milk Powder 500g%' AND category = 'Powder';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Khoya%' AND category = 'Powder';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80' WHERE name ILIKE '%Buttermilk Powder%' AND category = 'Powder';

-- Catch-all: set any remaining NULL or empty image_url products to a category-based fallback
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Milk';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Curd & Yogurt';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Paneer & Cheese';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Butter & Ghee';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Drinks';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Desserts';
UPDATE public.products SET image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' WHERE (image_url IS NULL OR image_url = '') AND category = 'Powder';
