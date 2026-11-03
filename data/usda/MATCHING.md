# USDA FoodData Central matching: Pico curated catalog

Catalog: 454 curated foods (read-only query, 2026-11-03). Sources: FDC bulk downloads (Foundation 2026-10-29, SR Legacy 2018-04, FNDDS 2024-10-31) were used for candidate search. Every chosen record was then fetched from the FDC `/food/{id}` API, and those responses are the source of `usda-nutrients.json`. Branded data was never used.

## Counts

| Confidence | Foods |
|---|---|
| high | 320 |
| medium | 80 |
| low | 8 |
| null | 46 |

Matched foods: 408, using 390 distinct FDC records (some catalog duplicates share a record, e.g. Tuna / Tuna (canned)).

By data type: Foundation 148, SR Legacy 254, Survey (FNDDS) 6.

Energy source (distinct records): 1008: 279, 2048 (Atwater specific): 90, 2047 (Atwater general): 21. Without 1008, the script uses 2048 (Atwater specific) if present, else 2047 (Atwater general). Some Foundation records have no 1005 carbohydrate and report 1050 (by summation) instead. Those carry a `carbsSource` field. Where 2000 is absent, sugars come from 1063 (`sugarsSource`).

Sugar breakdown: 135 matched foods report BOTH fructose and glucose. 128 report lactose, but only 13 of those report lactose > 0 (dairy: A2 Milk, Buttermilk, Cheddar (aged), Cheddar Cheese, Feta, Greek Yogurt, Hemp Seeds, Kefir, Mozzarella, Pumpkin, Whole Milk, Yogurt, Yogurt (plain)). The rest are explicit 0s on plant/meat records. All 6 FNDDS records and many SR records (meats, spices, oils) have no fructose/glucose at all, so fructose scoring needs a fallback for those.

All matched records were confirmed to have energy, protein, fat and carbohydrate. 21 Foundation records were dropped for SR equivalents because their Foundation entries (mostly the 2024-2025 additions) carry sugars/minerals but no energy, fat or carbs. Pawpaw went to null for the same reason. Their notes name the Foundation id in case its sugar detail is wanted later.

## Low-confidence matches

- **Black Rice**: 2710825 `Rice, black, unenriched, raw`. Only a dry/raw record exists, while the catalog has no serving label (normally means cooked). Values are per 100 g DRY. About 3x too high if applied to cooked weight.
- **Coconut Milk**: 170173 `Nuts, coconut milk, canned (liquid expressed from grated meat and water)`. AMBIGUOUS. Canned coconut milk (~200 kcal/100 g) was chosen because it's the cooking staple in elimination diets. Carton coconut-milk BEVERAGE (only a sweetened, fortified SR record, 174116) has ~1/6 the calories. The catalog places this under Plant-Based Alternatives, so the beverage reading is plausible.
- **Coconut Yogurt**: 2707569 `Yogurt, coconut milk`. Only FNDDS "Yogurt, coconut milk". Commercial coconut yogurts vary widely in fat and sugar. No fructose/glucose/lactose breakdown.
- **Corn**: 2710826 `Corn, sweet, yellow and white kernels,  fresh, raw`. AMBIGUOUS. Catalog files this under Grains & Starches/Whole Grains, separate from "Corn (Sweet)". The kernel record (sweet corn, raw) was chosen because that's what people mean by "corn" at a meal. If this is meant to be dry field-corn grain, use SR 170288 "Corn grain, yellow" (~4x the calories).
- **Delicata Squash**: 170489 `Squash, winter, all varieties, raw`. No delicata record. Uses "winter squash, all varieties, raw". Delicata is a C. pepo winter squash, close but not exact.
- **Einkorn**: 2710827 `Einkorn, grain, dry, raw`. Only a dry/raw grain record. No serving label (normally means cooked). Values are per 100 g DRY.
- **Hazelnut Flour**: 2515375 `Nuts, hazelnuts or filberts, raw`. No hazelnut-flour record. Uses raw hazelnuts (hazelnut flour = ground whole hazelnuts). Wrong if the product is defatted hazelnut meal.
- **Rye**: 168884 `Rye grain`. Only a dry rye-grain record. No serving label (normally means cooked). Values are per 100 g DRY.

## No match (fdcId null)

- **Banana (green)**: No unripe-banana record. Green bananas are mostly resistant starch with little sugar, so the ripe banana values (high fructose/glucose) would be wrong. Plantain is a different cultivar group.
- **Bone Broth**: No bone-broth record. USDA broth/bouillon records are thin stock with far less protein/collagen than bone broth, and the animal is unspecified.
- **Bone Marrow**: Only record is caribou marrow (Alaska Native). Species mismatch.
- **Broccolini**: No record. Hybrid of broccoli and gai lan. Neither USDA broccoli nor broccoli raab is the same plant.
- **Cashew Milk**: No cashew-milk record in Foundation, SR or FNDDS.
- **Chicken Sausage (fresh)**: No fresh chicken-sausage record. Only smoked multi-meat sausage, or the FNDDS "turkey or chicken sausage" blend. Recipes vary a lot.
- **Coconut Aminos**: No record. Proprietary fermented coconut-sap condiment.
- **Coconut Sugar**: No record.
- **Curry Leaves**: No record.
- **Dandelion Root Tea**: No record.
- **Duck Fat**: No duck-fat record. Goose fat (SR 173572) would be a near-identical proxy but is a different species.
- **Goat Butter**: No goat-butter record. Cow butter would be a close macro proxy but is a different species.
- **Goat Yogurt**: No goat-yogurt record.
- **Green Banana Flour**: No record.
- **Hazelnut Milk**: No record.
- **Hemp Milk**: No record.
- **Hemp Seed Oil**: No record.
- **Kelp Noodles**: No record. Kelp noodles are mostly sodium alginate and water, nothing like raw kelp.
- **Macadamia Oil**: No record.
- **Mango (green)**: No unripe-mango record. Green mango is much lower in sugar than ripe.
- **MCT Oil**: No record.
- **Mizuna**: No record.
- **Monk Fruit**: Only FNDDS "sugar substitute, monk fruit, powder", whose filler (erythritol vs dextrose) varies by product. That makes carb/sugar numbers unreliable.
- **Nutritional Yeast**: No record. Baker's yeast records are a different product, and most nutritional yeast is fortified.
- **Papaya (green)**: No unripe-papaya record. Green papaya is much lower in sugar than ripe.
- **Parsley Root**: No parsley-root (Hamburg parsley) record.
- **Pawpaw**: Only record is Foundation 2727577, which has sugars but no energy, fat or carbohydrate. Can't supply full macros.
- **Perilla**: No perilla leaf record.
- **Pink Peppercorns**: No record (Schinus, not true pepper).
- **Potato Starch**: No potato-starch record. Foundation "Flour, potato" is dehydrated whole potato, a different product (fiber, protein).
- **Pumpkin Seed Oil**: No record.
- **Rooibos Tea**: No record.
- **Sardines (fresh)**: No raw sardine record. Only canned (oil/tomato) records exist, and those carry the oil/sauce and processing.
- **Seaweed (Nori)**: SR "laver, raw" is the right species but the fresh form (~85% water). Nori is dried sheets, so per-100 g values would be ~8x too low. FNDDS "Seaweed, dried" has no stated species.
- **Sheep Yogurt**: No record.
- **Shirataki Noodles**: No record (konjac glucomannan, near-zero calories).
- **Star Anise**: No record. Anise seed is a different plant (Pimpinella vs Illicium).
- **Sumac**: No record.
- **Sweet Potato Glass Noodles**: No record.
- **Sweet Potato Starch**: No record.
- **Tarragon**: Fresh Herbs category but USDA only has DRIED tarragon. Per-100 g values would be ~5-10x too high for fresh.
- **Tiger Nut Flour**: No record.
- **Tiger Nuts**: No record (chufa/Cyperus esculentus).
- **Water Kefir**: No record.
- **White Tea**: No brewed white tea record.
- **Yacon**: No record. Yacon is mostly FOS (fructooligosaccharides), so no other tuber is a valid proxy.

## Judgment calls a reviewer should check

1. **Plain "Salmon"** goes to canned **pink** salmon, drained solids (175175), the same record as Salmon (canned). Pink is the dominant US canned salmon. If the founder intended plain "Salmon" to be the everyday fillet, switch it to Salmon (fresh) (Atlantic farmed, 2684441). That roughly doubles the fat.
2. **Corn** (Whole Grains) uses sweet-corn kernels, not dry grain. A ~4x calorie difference.
3. **Coconut Milk** uses canned, not carton beverage. A ~6x calorie difference.
4. **Grains with no serving label but only a dry record** (Black Rice, Einkorn, Rye) are matched to DRY values. If the app applies them to cooked portions, calories are about 3x too high. Either give these catalog rows an explicit dry serving or treat them as unmatched.
5. **Fat level of unspecified dairy**: Yogurt, Yogurt (plain), Greek Yogurt use whole-milk plain. Cream uses heavy. Kefir uses lowfat (the only SR kefir). Mozzarella uses low-moisture part-skim.
6. **Generic meats** (Beef, Pork, Lamb, Chicken, Turkey, Steak, Ground Beef 80/20, Bison = ground, Ostrich = ground, Chicken Thigh = boneless skinless). Fat depends heavily on cut, and these picks are reasonable defaults, not truths.
7. **Bell Pepper** uses green. Red has about 2x the fructose/glucose, which matters for a fructose-sensitivity app.
8. **Cooked-form exceptions to the raw rule**: Bacon (cooked, restaurant), Bratwurst (cooked), Corned Beef (cooked), Rotisserie Chicken (FNDDS), Ham (cured, unheated). Artichoke, Brussels Sprouts, Edamame, Brown/White Rice and Pasta are cooked because their serving labels say so.
9. **Proxy matches**: A2 Milk is whole milk. Cheddar (aged) is regular cheddar, whose record shows lactose ~0 anyway. Tequila is generic 80-proof spirits. Sea Salt is table salt. Red Pepper Flakes is cayenne. Hazelnut Flour is raw hazelnuts (low). Tapioca Flour is pearl tapioca. Sorrel is "Dock". Escarole and Endive are both USDA "Endive, raw" (Belgian endive is chicory witloof). Fresh Chili (Paprika Pepper) is red hot chili.
10. **Stevia** is pure extract powder, and **Wasabi** is prepared paste (mostly horseradish). Retail products differ.
11. **Ginger** is matched to ground dried ginger, because its catalog row sits under Dried Spices with a 1-tsp serving. Fresh ginger root is a common log, so consider a separate fresh entry (169231).
12. **Sesame / Tahini** uses whole sesame seeds, per the 1-tbsp-seeds serving label. Tahini paste is 170189.
13. **Lima Beans** uses mature (dry) limas, boiled. Frozen baby limas (169135) may be what users mean.
14. FNDDS is used for only 6 foods: Coconut Yogurt, Dragon Fruit, Fish Sauce, Kombucha, Prosciutto, Rotisserie Chicken. None of them has a sugar breakdown.

