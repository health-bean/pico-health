-- One food category per food group, and Paleo/AIP rules that follow each
-- diet's own food lists.
--
-- Before: duplicate categories (Dairy + "Dairy & Alternatives", Proteins +
-- Meat & Poultry + Fish & Seafood, two herbs/spices categories, grains split
-- across two) meant category rules missed ~120 foods, and plant milks counted
-- as dairy. Paleo and AIP also had "high lectin" rules; nothing has a lectin
-- rating (no lab database exists), so almost every food showed "not rated
-- yet", and the lectin rule was the only thing excluding legumes.
--
-- Runs in one transaction. Any food or category name that doesn't match
-- raises an error and nothing changes.

-- ── Helpers (session-only) ─────────────────────────────────────────────
create function pg_temp.cat(n text) returns int language plpgsql as $$
declare i int;
begin
  select id into i from food_categories where name = n;
  if i is null then raise exception 'category not found: %', n; end if;
  return i;
end $$;

create function pg_temp.sub(c text, s text) returns int language plpgsql as $$
declare i int;
begin
  select fs.id into i from food_subcategories fs
    join food_categories fc on fc.id = fs.category_id
    where fc.name = c and fs.name = s;
  if i is null then
    insert into food_subcategories (category_id, name) values (pg_temp.cat(c), s) returning id into i;
  end if;
  return i;
end $$;

-- Move curated foods (by exact name) into category/subcategory.
create function pg_temp.move(names text[], c text, s text) returns void language plpgsql as $$
declare n text; target int; hit int;
begin
  target := pg_temp.sub(c, s);
  foreach n in array names loop
    update foods set subcategory_id = target where display_name = n and source = 'curated';
    get diagnostics hit = row_count;
    if hit <> 1 then raise exception 'expected 1 curated food named %, found %', n, hit; end if;
  end loop;
end $$;

-- Move a whole subcategory to another category (optionally renaming it).
create function pg_temp.move_sub(from_c text, s text, to_c text, new_name text) returns void language plpgsql as $$
declare hit int;
begin
  update food_subcategories set category_id = pg_temp.cat(to_c), name = coalesce(new_name, s)
    where category_id = pg_temp.cat(from_c) and name = s;
  get diagnostics hit = row_count;
  if hit <> 1 then raise exception 'subcategory %/% not found', from_c, s; end if;
end $$;

create function pg_temp.food(n text) returns uuid language plpgsql as $$
declare i uuid;
begin
  select id into i from foods where display_name = n and source = 'curated';
  if i is null then raise exception 'curated food not found: %', n; end if;
  return i;
end $$;

-- ── Categories ─────────────────────────────────────────────────────────
insert into food_categories (name) values ('Eggs'), ('Starches & Flours') on conflict (name) do nothing;
update food_categories set name = 'Grains' where name = 'Grains & Starches';
update food_categories set name = 'Legumes' where name = 'Grains & Legumes';
update food_categories set name = 'Plant Milks & Yogurts' where name = 'Dairy & Alternatives';

-- Grains: wheat, other grains and pseudocereals move out of Legumes.
select pg_temp.move_sub('Legumes', 'Breads & Wheat', 'Grains', null);
select pg_temp.move_sub('Legumes', 'Grains', 'Grains', 'Other Grains');
select pg_temp.move_sub('Legumes', 'Pseudocereals', 'Grains', null);
select pg_temp.move(array['Quinoa'], 'Grains', 'Pseudocereals');
select pg_temp.move(array['Cornmeal'], 'Grains', 'Whole Grains');
select pg_temp.move(array['Cornstarch'], 'Grains', 'Refined Grains');
-- What's left of "Gluten-Free Grains" is grain-free: cassava, tapioca, etc.
select pg_temp.move_sub('Grains', 'Gluten-Free Grains', 'Starches & Flours', 'Grain-Free Flours & Noodles');

-- Peanuts are legumes.
select pg_temp.move(array['Peanuts', 'Peanut Butter'], 'Legumes', 'Peanuts');

-- Dairy: one category; plant milks keep their own.
select pg_temp.move(array['A2 Milk', 'Cream', 'Goat Milk', 'Sheep Milk', 'Whole Milk'], 'Dairy', 'Milk & Cream');
select pg_temp.move(array['Butter', 'Ghee', 'Goat Butter'], 'Dairy', 'Butter & Ghee');
select pg_temp.move(array['Cream Cheese', 'Mozzarella', 'Cheddar Cheese', 'Goat Cheese', 'Parmesan'], 'Dairy', 'Cheese');
select pg_temp.move(array['Buttermilk', 'Goat Yogurt', 'Sheep Yogurt', 'Yogurt'], 'Dairy', 'Fermented Dairy');

-- Meat, fish and eggs: "Proteins" splits into Meat & Poultry and Fish & Seafood.
select pg_temp.move(array['Ground Beef', 'Lamb', 'Pork'], 'Proteins', 'Red Meat & Game');
select pg_temp.move(array['Chicken Breast', 'Turkey'], 'Proteins', 'Poultry & Eggs');
select pg_temp.move(array['Cod', 'Salmon', 'Sardines', 'Tuna', 'Smoked Salmon'], 'Proteins', 'Fish & Seafood');
select pg_temp.move(array['Shrimp'], 'Proteins', 'Shellfish');
select pg_temp.move(array['Eggs', 'Eggs (chicken)', 'Eggs (duck)'], 'Eggs', 'Eggs');
select pg_temp.move_sub('Proteins', 'Red Meat & Game', 'Meat & Poultry', null);
select pg_temp.move_sub('Proteins', 'Poultry & Eggs', 'Meat & Poultry', 'Poultry');
select pg_temp.move_sub('Proteins', 'Organ Meats', 'Meat & Poultry', null);
select pg_temp.move_sub('Proteins', 'Cured & Processed Meats', 'Meat & Poultry', null);
select pg_temp.move_sub('Proteins', 'Fish & Seafood', 'Fish & Seafood', 'Fish');
select pg_temp.move_sub('Proteins', 'Shellfish', 'Fish & Seafood', 'Shellfish & Squid');

-- Herbs & spices: one category; sauces and vinegar go to condiments.
select pg_temp.move(array['Black Pepper', 'Cinnamon', 'Cumin', 'Garlic Powder', 'Ginger', 'Turmeric'], 'Herbs & Spices', 'Spices');
select pg_temp.move(array['Salt'], 'Herbs & Spices', 'Seasonings');
select pg_temp.move(array['Oregano'], 'Herbs & Spices', 'Dried Herbs');
select pg_temp.move(array['Basil', 'Rosemary'], 'Herbs & Spices', 'Fresh Herbs');
select pg_temp.move(array['Hot Sauce', 'Soy Sauce'], 'Fermented & Condiments', 'Condiments');
select pg_temp.move(array['Apple Cider Vinegar'], 'Fermented & Condiments', 'Vinegars');

-- Near-duplicate subcategories in Vegetables and Fruits.
update foods set subcategory_id = pg_temp.sub('Fruits', 'Pome Fruits') where subcategory_id = pg_temp.sub('Fruits', 'Pome Fruit');
update foods set subcategory_id = pg_temp.sub('Fruits', 'Stone Fruits') where subcategory_id = pg_temp.sub('Fruits', 'Stone Fruit');
update foods set subcategory_id = pg_temp.sub('Vegetables', 'Cruciferous') where subcategory_id = pg_temp.sub('Vegetables', 'Crucifers');
update foods set subcategory_id = pg_temp.sub('Vegetables', 'Root Vegetables') where subcategory_id = pg_temp.sub('Vegetables', 'Roots & Tubers');

-- Remove the subcategories and categories this emptied. Only ones with no
-- foods left; a non-empty one stays (and would show up in review).
delete from food_subcategories fs
  where not exists (select 1 from foods f where f.subcategory_id = fs.id)
    and fs.category_id in (
      select id from food_categories
      where name in ('Proteins', 'Herbs Spices & Condiments', 'Meat & Poultry', 'Fish & Seafood', 'Plant Milks & Yogurts', 'Legumes', 'Fruits', 'Vegetables')
    );
delete from food_categories fc
  where name in ('Proteins', 'Herbs Spices & Condiments')
    and not exists (select 1 from food_subcategories fs where fs.category_id = fc.id);

update food_subcategories set name = 'Shellfish' where name = 'Shellfish & Squid';

-- Potato starch is made from potatoes (Solanum tuberosum, a nightshade).
update food_trigger_properties
  set nightshade = true,
      sources = coalesce(sources, '{}'::jsonb) || jsonb_build_object('nightshade', jsonb_build_object(
        'ref', 'Made from potato (Solanum tuberosum) — Solanaceae', 'source', 'Botanical'))
  where food_id = pg_temp.food('Potato Starch');

-- ── Protocol rules ─────────────────────────────────────────────────────
-- AIP a80be547-…, Paleo d13e087a-…, Keto b91cf658-…
delete from protocol_rules where property_name = 'lectin';

update protocol_rules set property_values = array['Grains', 'Starches & Flours']
  where protocol_id = 'b91cf658-7ec2-5833-b6b5-71041254b3ea' and property_values = array['Grains & Starches'];
update protocol_rules set property_values = array['Grains']
  where property_values = array['Grains & Starches'];
update protocol_rules set property_values = array['Dairy']
  where property_values = array['Dairy & Alternatives'];

-- Plain wording: what the diet removes, not medical claims.
update protocol_rules set notes = 'AIP removes nightshades (tomato, potato, peppers, eggplant, paprika) during elimination'
  where protocol_id = 'a80be547-6db1-4722-a5a4-60930143a2d9' and property_name = 'nightshade';
update protocol_rules set notes = 'AIP removes all grains during elimination'
  where protocol_id = 'a80be547-6db1-4722-a5a4-60930143a2d9' and property_values = array['Grains'];
update protocol_rules set notes = 'AIP removes dairy during elimination; ghee is among the first foods reintroduced'
  where protocol_id = 'a80be547-6db1-4722-a5a4-60930143a2d9' and property_values = array['Dairy'];
update protocol_rules set notes = 'AIP removes nuts and seeds during elimination'
  where protocol_id = 'a80be547-6db1-4722-a5a4-60930143a2d9' and property_values = array['Nuts & Seeds'];
update protocol_rules set notes = 'Paleo leaves out grains'
  where protocol_id = 'd13e087a-90e4-7a55-d8d7-93263476d50c' and property_values = array['Grains'];
update protocol_rules set notes = 'Paleo leaves out dairy; many plans allow butter and ghee'
  where protocol_id = 'd13e087a-90e4-7a55-d8d7-93263476d50c' and property_values = array['Dairy'];

insert into protocol_rules (protocol_id, rule_type, property_name, property_values, status, rule_order, notes) values
  ('a80be547-6db1-4722-a5a4-60930143a2d9', 'category', null, array['Legumes'], 'avoid', 2,
   'AIP removes legumes, including soy and peanuts, during elimination'),
  ('a80be547-6db1-4722-a5a4-60930143a2d9', 'category', null, array['Eggs'], 'avoid', 6,
   'AIP removes eggs during elimination; yolks are among the first foods reintroduced'),
  ('d13e087a-90e4-7a55-d8d7-93263476d50c', 'category', null, array['Legumes'], 'avoid', 2,
   'Paleo leaves out legumes, including soy and peanuts');

-- ── Food-specific exceptions ───────────────────────────────────────────
-- For foods a diet's list names that no category or rating catches.
create function pg_temp.override(protocol uuid, names text[], st text, reason text) returns void language plpgsql as $$
declare n text;
begin
  foreach n in array names loop
    insert into protocol_food_overrides (protocol_id, food_id, status, override_reason, notes)
      values (protocol, pg_temp.food(n), st, reason, 'migration 20261111100000')
      on conflict (protocol_id, food_id) do update set status = excluded.status, override_reason = excluded.override_reason, notes = excluded.notes;
  end loop;
end $$;

-- AIP
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9', array['Coffee'], 'avoid', 'AIP removes coffee during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9', array['Dark Chocolate / Cocoa', 'Cocoa Butter'], 'avoid', 'AIP removes chocolate and cocoa during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9', array['Beer', 'Hard Cider', 'Red Wine', 'White Wine', 'Tequila'], 'avoid', 'AIP removes alcohol during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Anise Seed', 'Caraway Seed', 'Coriander Seed', 'Cumin', 'Fenugreek', 'Mustard Seed', 'Nutmeg', 'Mace', 'Mustard (prepared)'],
  'avoid', 'AIP removes seed-based spices during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Black Pepper', 'Allspice', 'Cardamom', 'Star Anise', 'Pink Peppercorns'],
  'avoid', 'AIP removes berry- and fruit-based spices during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Sesame Oil', 'Sunflower Oil', 'Safflower Oil', 'Grapeseed Oil', 'Rice Bran Oil', 'Flaxseed Oil', 'Hemp Seed Oil', 'Pumpkin Seed Oil', 'Walnut Oil', 'Macadamia Oil'],
  'avoid', 'AIP removes seed and nut oils during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Almond Milk', 'Cashew Milk', 'Hazelnut Milk', 'Hemp Milk'], 'avoid', 'Made from nuts or seeds, which AIP removes during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Oat Milk', 'Rice Milk'], 'avoid', 'Made from grain, which AIP removes during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Soy Milk', 'Soy Sauce', 'Tamari', 'Miso'], 'avoid', 'Made from soy, a legume AIP removes during elimination');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Sugar', 'Stevia', 'Monk Fruit'], 'avoid', 'AIP removes refined sugar and non-nutritive sweeteners');
select pg_temp.override('a80be547-6db1-4722-a5a4-60930143a2d9',
  array['Coconut (dried)', 'Chestnuts'], 'allowed', 'Allowed on AIP: coconut and chestnuts are not treated as nuts');

-- Paleo
select pg_temp.override('d13e087a-90e4-7a55-d8d7-93263476d50c',
  array['Butter', 'Ghee', 'Goat Butter'], 'moderation', 'Many Paleo plans allow grass-fed butter and ghee');
select pg_temp.override('d13e087a-90e4-7a55-d8d7-93263476d50c',
  array['Sugar'], 'avoid', 'Paleo leaves out refined sugar');
select pg_temp.override('d13e087a-90e4-7a55-d8d7-93263476d50c',
  array['Sunflower Oil', 'Safflower Oil', 'Grapeseed Oil', 'Rice Bran Oil'], 'avoid', 'Paleo leaves out industrial seed oils');
select pg_temp.override('d13e087a-90e4-7a55-d8d7-93263476d50c',
  array['Oat Milk', 'Rice Milk'], 'avoid', 'Made from grain, which Paleo leaves out');
select pg_temp.override('d13e087a-90e4-7a55-d8d7-93263476d50c',
  array['Soy Milk', 'Soy Sauce', 'Tamari', 'Miso'], 'avoid', 'Made from soy, a legume Paleo leaves out');
