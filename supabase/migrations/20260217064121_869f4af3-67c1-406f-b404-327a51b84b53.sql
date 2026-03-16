
-- Fix categories: merge Paneer, Cheese, Others into "Paneer & Cheese"
UPDATE products SET category = 'Paneer & Cheese' WHERE category IN ('Paneer', 'Cheese', 'Others');

-- Update ALL product images to verified product-only photos (no people)
-- Milk
UPDATE products SET image_url = 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Farm Fresh Cow Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1435706/pexels-photo-1435706.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Full Cream Cow Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2198626/pexels-photo-2198626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Buffalo Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1446318/pexels-photo-1446318.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Toned Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/725998/pexels-photo-725998.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Organic A2 Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Skimmed Milk';

-- Curd & Yogurt
UPDATE products SET image_url = 'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Fresh Dahi';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Greek Yogurt Plain';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Flavored Yogurt Mango';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Probiotic Curd';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2693447/pexels-photo-2693447.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Mishti Doi';

-- Paneer & Cheese
UPDATE products SET image_url = 'https://images.pexels.com/photos/4198019/pexels-photo-4198019.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Fresh Paneer';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4198020/pexels-photo-4198020.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Malai Paneer';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4197881/pexels-photo-4197881.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Paneer Block';
UPDATE products SET image_url = 'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Mozzarella Cheese';
UPDATE products SET image_url = 'https://images.pexels.com/photos/773253/pexels-photo-773253.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Cheddar Cheese Block';
UPDATE products SET image_url = 'https://images.pexels.com/photos/5737244/pexels-photo-5737244.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Cheese Slices';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Cream Cheese';
UPDATE products SET image_url = 'https://images.pexels.com/photos/5737247/pexels-photo-5737247.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Cheese Spread Garlic';
UPDATE products SET image_url = 'https://images.pexels.com/photos/6287295/pexels-photo-6287295.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Paneer Tikka Pack';

-- Butter & Ghee
UPDATE products SET image_url = 'https://images.pexels.com/photos/531334/pexels-photo-531334.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Amul Butter';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3680845/pexels-photo-3680845.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Fresh Butter';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4033327/pexels-photo-4033327.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Salted Butter';
UPDATE products SET image_url = 'https://images.pexels.com/photos/5765820/pexels-photo-5765820.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Desi Ghee';
UPDATE products SET image_url = 'https://images.pexels.com/photos/6941025/pexels-photo-6941025.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'A2 Cow Ghee';

-- Drinks
UPDATE products SET image_url = 'https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Mango Lassi';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Rose Lassi';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3727255/pexels-photo-3727255.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Fresh Buttermilk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Cold Coffee';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Badam Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3625372/pexels-photo-3625372.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Chocolate Milk';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3727256/pexels-photo-3727256.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Strawberry Milkshake';

-- Desserts
UPDATE products SET image_url = 'https://images.pexels.com/photos/1352278/pexels-photo-1352278.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Vanilla Ice Cream';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2693447/pexels-photo-2693447.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Shrikhand';
UPDATE products SET image_url = 'https://images.pexels.com/photos/14705134/pexels-photo-14705134.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Rasmalai';
UPDATE products SET image_url = 'https://images.pexels.com/photos/14705135/pexels-photo-14705135.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Rasgulla';
UPDATE products SET image_url = 'https://images.pexels.com/photos/14705136/pexels-photo-14705136.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Gulab Jamun';
UPDATE products SET image_url = 'https://images.pexels.com/photos/5765580/pexels-photo-5765580.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Kulfi Malai';

-- Powder
UPDATE products SET image_url = 'https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Milk Powder';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4110008/pexels-photo-4110008.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Mawa / Khoya';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4397920/pexels-photo-4397920.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Milk Cream';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4397899/pexels-photo-4397899.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Whipping Cream';
UPDATE products SET image_url = 'https://images.pexels.com/photos/4110009/pexels-photo-4110009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' WHERE name = 'Condensed Milk';
