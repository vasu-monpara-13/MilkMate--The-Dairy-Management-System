
INSERT INTO products (name, category, price, unit, description, stock_qty, is_active, rating, image_url) VALUES
-- Milk (12 new)
('Skim Milk', 'Milk', 48, '1 Liter', 'Fat-free milk for the health-conscious lifestyle', 120, true, 4.0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Cow Milk', 'Milk', 62, '1 Liter', 'Pure farm-fresh cow milk delivered daily', 180, true, 4.3, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80'),
('Buffalo Milk', 'Milk', 72, '1 Liter', 'Rich and creamy buffalo milk with high fat content', 140, true, 4.4, 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=800&q=80'),
('A2 Cow Milk', 'Milk', 120, '1 Liter', 'Premium A2 protein milk from desi cows, easier to digest', 60, true, 4.7, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('A2 Buffalo Milk', 'Milk', 130, '1 Liter', 'Nutrient-dense A2 buffalo milk for the whole family', 50, true, 4.6, 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=800&q=80'),
('Organic Cow Milk', 'Milk', 95, '1 Liter', '100% organic milk from grass-fed cows, free from additives', 80, true, 4.8, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80'),
('Lactose Free Milk', 'Milk', 85, '1 Liter', 'Easy-to-digest lactose-free milk for sensitive stomachs', 70, true, 4.2, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Full Cream Milk 500ml', 'Milk', 38, '500 ml', 'Half-liter pack of rich full cream milk', 200, true, 4.1, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80'),
('Standardized Milk', 'Milk', 54, '1 Liter', 'Consistent quality standardized milk with 4.5% fat', 160, true, 4.0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Farm Fresh Raw Milk', 'Milk', 58, '1 Liter', 'Unprocessed raw milk straight from the farm', 90, true, 4.5, 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=800&q=80'),
('Organic Buffalo Milk', 'Milk', 110, '1 Liter', 'Premium organic buffalo milk, naturally rich in calcium', 45, true, 4.6, 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=800&q=80'),
('Toned Milk 500ml', 'Milk', 32, '500 ml', 'Convenient half-liter toned milk pack', 190, true, 4.0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),

-- Curd & Yogurt (8 new)
('Thick Dahi', 'Curd & Yogurt', 45, '400g', 'Extra thick set curd, perfect for raita and desserts', 100, true, 4.3, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Low Fat Dahi', 'Curd & Yogurt', 40, '400g', 'Light and healthy low-fat curd for daily consumption', 110, true, 4.1, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Mango Yogurt', 'Curd & Yogurt', 35, '200g', 'Creamy mango-flavored yogurt made with real fruit', 90, true, 4.4, 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80'),
('Strawberry Yogurt', 'Curd & Yogurt', 35, '200g', 'Luscious strawberry yogurt with real berry pieces', 85, true, 4.3, 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80'),
('Hung Curd', 'Curd & Yogurt', 60, '300g', 'Thick strained curd, ideal for dips and marinades', 70, true, 4.5, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Probiotic Yogurt', 'Curd & Yogurt', 55, '200g', 'Gut-friendly probiotic yogurt with live cultures', 65, true, 4.6, 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80'),
('Organic Fresh Dahi', 'Curd & Yogurt', 65, '400g', 'Certified organic curd from grass-fed cow milk', 50, true, 4.7, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Mishti Doi', 'Curd & Yogurt', 50, '250g', 'Traditional Bengali sweet yogurt, caramelized perfection', 60, true, 4.5, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),

-- Paneer & Cheese (8 new)
('Fresh Paneer 200g', 'Paneer & Cheese', 160, '200g', 'Soft and fresh cottage cheese, perfect for curries', 80, true, 4.4, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'),
('Paneer Cubes', 'Paneer & Cheese', 180, '250g', 'Pre-cut paneer cubes for quick cooking convenience', 70, true, 4.2, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'),
('Malai Paneer', 'Paneer & Cheese', 220, '300g', 'Ultra-soft malai paneer with rich creamy texture', 55, true, 4.6, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'),
('Cheese Slices', 'Paneer & Cheese', 120, '200g (10 slices)', 'Smooth processed cheese slices for sandwiches', 100, true, 4.1, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80'),
('Mozzarella Cheese', 'Paneer & Cheese', 250, '200g', 'Stretchy mozzarella perfect for pizza and pasta', 60, true, 4.5, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80'),
('Cheddar Cheese', 'Paneer & Cheese', 280, '200g', 'Sharp and aged cheddar with bold flavor', 50, true, 4.4, 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?auto=format&fit=crop&w=800&q=80'),
('Cream Cheese', 'Paneer & Cheese', 190, '150g', 'Smooth cream cheese spread for bagels and dips', 65, true, 4.3, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80'),
('Fresh Paneer 500g', 'Paneer & Cheese', 320, '500g', 'Family-size fresh paneer block, farm-made quality', 40, true, 4.5, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'),

-- Butter & Ghee (6 new)
('White Butter', 'Butter & Ghee', 180, '250g', 'Hand-churned white butter with natural aroma', 75, true, 4.5, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80'),
('Desi Ghee 200ml', 'Butter & Ghee', 220, '200 ml', 'Traditional desi ghee slow-cooked for rich flavor', 90, true, 4.6, 'https://images.unsplash.com/photo-1600398142498-7d91f1f0b3a6?auto=format&fit=crop&w=800&q=80'),
('Desi Ghee 1L', 'Butter & Ghee', 850, '1 Liter', 'Premium desi ghee in value family pack', 40, true, 4.7, 'https://images.unsplash.com/photo-1600398142498-7d91f1f0b3a6?auto=format&fit=crop&w=800&q=80'),
('Cow Ghee', 'Butter & Ghee', 550, '500 ml', 'Pure A2 cow ghee made from bilona method', 55, true, 4.8, 'https://images.unsplash.com/photo-1600398142498-7d91f1f0b3a6?auto=format&fit=crop&w=800&q=80'),
('Buffalo Ghee', 'Butter & Ghee', 480, '500 ml', 'Rich buffalo ghee with aromatic golden color', 60, true, 4.4, 'https://images.unsplash.com/photo-1600398142498-7d91f1f0b3a6?auto=format&fit=crop&w=800&q=80'),
('Unsalted Butter', 'Butter & Ghee', 160, '200g', 'Pure unsalted butter for baking and cooking', 85, true, 4.2, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80'),

-- Drinks (6 new)
('Sweet Lassi', 'Drinks', 40, '250 ml', 'Traditional sweet lassi churned to creamy perfection', 120, true, 4.3, 'https://images.unsplash.com/photo-1571006682505-da820120013e?auto=format&fit=crop&w=800&q=80'),
('Masala Chaas', 'Drinks', 30, '250 ml', 'Spiced buttermilk with cumin and mint for digestion', 140, true, 4.2, 'https://images.unsplash.com/photo-1571006682505-da820120013e?auto=format&fit=crop&w=800&q=80'),
('Buttermilk', 'Drinks', 25, '250 ml', 'Refreshing plain buttermilk, naturally cooling', 150, true, 4.0, 'https://images.unsplash.com/photo-1571006682505-da820120013e?auto=format&fit=crop&w=800&q=80'),
('Badam Milk', 'Drinks', 55, '200 ml', 'Rich almond-infused milk with saffron and cardamom', 80, true, 4.5, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'),
('Chocolate Milk', 'Drinks', 45, '200 ml', 'Indulgent chocolate-flavored milk kids love', 100, true, 4.4, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'),
('Strawberry Milk', 'Drinks', 45, '200 ml', 'Sweet strawberry-flavored milk, naturally pink', 95, true, 4.3, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'),
('Rose Milk', 'Drinks', 45, '200 ml', 'Fragrant rose-infused milk, a classic refresher', 90, true, 4.2, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'),

-- Desserts (5 new)
('Shrikhand Elaichi', 'Desserts', 80, '200g', 'Cardamom-flavored shrikhand, silky smooth finish', 50, true, 4.5, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Rasmalai Pack', 'Desserts', 150, '500g (6 pcs)', 'Soft rasmalai dumplings in sweetened milk', 40, true, 4.7, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Rabri Cup', 'Desserts', 70, '150g', 'Traditional slow-cooked sweetened condensed milk', 55, true, 4.4, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
('Ice Cream Butterscotch', 'Desserts', 180, '500 ml', 'Premium butterscotch ice cream with crunchy bits', 45, true, 4.3, 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80'),
('Gulab Jamun Pack', 'Desserts', 120, '500g (12 pcs)', 'Soft golden gulab jamuns in rose-scented syrup', 60, true, 4.6, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),

-- Powder (4 new)
('Milk Powder 500g', 'Powder', 320, '500g', 'Premium spray-dried milk powder for all uses', 70, true, 4.2, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Khoya (Mawa)', 'Powder', 280, '250g', 'Fresh khoya for making sweets and rich gravies', 50, true, 4.5, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Skimmed Milk Powder', 'Powder', 250, '500g', 'Low-fat skimmed milk powder for health-conscious use', 65, true, 4.1, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'),
('Buttermilk Powder', 'Powder', 180, '200g', 'Instant buttermilk powder, just add water', 55, true, 4.0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80');
