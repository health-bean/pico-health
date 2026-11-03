# FODMAP lab data: papers (fodmap-studies.json)

No Monash FODMAP app or website data was used.

## Cutoffs (Monash per-serving "high" thresholds)

**Original source:** Varney J, Barrett J, Scarlata K, Catsos P, Gibson PR, Muir JG. FODMAPs: food composition, defining cutoff values and international application. *J Gastroenterol Hepatol.* 2017;32 Suppl 1:53-61. doi:10.1111/jgh.13698 (PMID 28244665).
- I read only the abstract this session. It names the components that have cutoffs (fructans + GOS as oligosaccharides, mannitol, sorbitol, lactose, and fructose in excess of glucose) and says the cutoffs are per typical serving. The abstract gives no numbers.
- Unpaywall lists a free Wiley PDF, but this session's fetch tooling couldn't retrieve it. The numbers below are therefore **second-hand**.

**Values as quoted second-hand** in Galgano F, Mele MC, Tolve R, et al. Strategies for Producing Low FODMAPs Foodstuffs: Challenges and Perspectives. *Foods.* 2023;12(4):856. doi:10.3390/foods12040856, PMC9956220, CC BY. They appear in section 4, which cites Varney 2017 as ref. [40]. Verbatim:

> "For grains, legume, nuts, and seeds oligosaccharides (fructan and α-galacto-oligosaccharides), the cut-off value is <0.30 g per serving. For vegetables, fruits, and all other products, the oligosaccharides cut-off is <0.20 g per serving and the same cut-off is true for sorbitol or mannitol, whereas for total polyols it is <0.40 g per serving. When fructose in excess to glucose is the only FODMAP present (for fruit or vegetables), the cut-off is <0.40 g per serving instead when there are other FODMAPs, when the value for fructose in excess to glucose is <0.15 g per serving. Finally, for lactose, the cut-off level is <1.00 g per serving size."

Summary. A serve is "low" if it is below these values:

| Component | Cutoff per serve |
|---|---|
| Oligosaccharides (fructans + GOS combined), grains/legumes/nuts/seeds | 0.30 g |
| Oligosaccharides (fructans + GOS combined), vegetables/fruit/other foods | 0.20 g |
| Sorbitol | 0.20 g |
| Mannitol | 0.20 g |
| Total polyols | 0.40 g |
| Excess fructose (when other FODMAPs are present) | 0.15 g |
| Excess fructose (fruit/veg where it is the only FODMAP) | 0.40 g |
| Lactose | 1.00 g |

Other second-hand mentions read this session:
- Watters et al. 2026 *Nutrients* (PMC13567351) quotes Varney as "<0.15 g excess fructose per serving" for grains/cereals.
- Alowo 2025 (PMC11932858) quotes cutoffs of "below 0.3 g/100 g and 0.5 g/100 g for total oligosaccharides and total FODMAP" (its ref 26 = Varney). That is a per-100 g framing and differs from Galgano's per-serving wording.
- Rhys-Jones 2022 *Nutrients* (PMC9607015) mentions "0.5 g FODMAPs per main meal" as a feeding-trial target (meal level, not a per-food cutoff).

Note: the oligosaccharide cutoff applies to **fructans + GOS summed**. The app should add those two components per serving before comparing.

## Papers used (values read this session)

1. **Chumpitazi BP, Lim J, McMeans AR, et al.** Evaluation of FODMAP Carbohydrates Content in Selected Foods in the United States. *J Pediatr.* 2018;199:252-255. doi:10.1016/j.jpeds.2018.03.038, PMC6063767.
   - Access: NIH author manuscript, full text read via NCBI efetch. The PMC licence note says "available for text mining… fair use".
   - Values from Table 1 (g/100 g sample, Megazyme kits, duplicate analysis). The "FOS" column is the Fructan HK assay, i.e. total fructan.
   - Foods: butter, mild cheddar, rice milk, banana, grapes, orange, pineapple, strawberry, tomato, frozen green beans/broccoli/corn/spinach, lettuce, cooked brown/white rice, mayonnaise, peanut butter, mustard.
2. **Ferjančič B, Korošec M, Kočevar Baloh A, Bertoncelj J.** Fructan content in most commonly consumed Slovenian foods and estimation of daily fructan consumption. *Front Nutr.* 2024;11:1446771. doi:10.3389/fnut.2024.1446771, PMC11327153, CC BY.
   - Values from Table 1: total fructan, AOAC 999.03 (Megazyme), fresh-weight column.
   - The apple and cauliflower FW values don't exactly match DW × (1 − water); the reported FW value is used and the mismatch is flagged in sampleDescription.
   - Nut FW values come from a fat-content conversion.
3. **Matias S, Perez-Junkera G, Martínez O, et al.** FODMAP Content Like-by-like Comparison in Spanish Gluten-free and Gluten-containing Cereal-based Products. *Plant Foods Hum Nutr.* 2024;79(2):545-550. doi:10.1007/s11130-024-01177-8, PMC11178640, CC BY.
   - Values from Table 1, gluten-containing bread group mean: fructans, excess fructose, sorbitol.
   - The methods and n are in Supplementary 1, which I did not read.
   - I didn't use the pasta group because I couldn't confirm whether it was dry or cooked. I also skipped raffinose, because it is only part of GOS.
4. **Laatikainen R, Koskenpato J, Hongisto SM, et al.** Randomised clinical trial: low-FODMAP rye bread vs. regular rye bread… *Aliment Pharmacol Ther.* 2016;44(5):460-470. doi:10.1111/apt.13726, PMC5113694, CC BY-NC.
   - Values from Table 1, regular rye bread: fructans 1.1 and mannitol 0.3 g/100 g. Mapped to catalog "Rye".
5. **Whelan K, Abrahmsohn O, David GJ, et al.** Fructan content of commonly consumed wheat, rye and gluten-free breads. *Int J Food Sci Nutr.* 2011;62(5):498-503. doi:10.3109/09637486.2011.553588.
   - Abstract only. Rye bread fructan 1.94 g/100 g.
6. **Prichard R, Rossi M, Muir J, et al.** FODMAP content of foods commonly consumed by ethnic minority groups in the UK. *Int J Food Sci Nutr.* 2016;67(4):383-390. doi:10.3109/09637486.2016.1163328.
   - Abstract only. Guava (fructans 0.41; GOS not detected) and fenugreek seeds (fructans 1.11; GOS 1.27 g/100 g).
   - Channa dal (0.13 / 0.36) was not used: it is split Bengal gram and the preparation is unclear, so it isn't clearly "Chickpeas".
7. **Alghamdi BA, Alshumrani ES, Saeed MSB, et al.** Sugar composition… honey samples from Saudi Arabian markets. *Saudi J Biol Sci.* 2020;27(12):3720-3726. doi:10.1016/j.sjbs.2020.08.018, PMC7714983, CC BY-NC-ND.
   - Values from the Table 2 average of 14 honeys (fructose 34.77%, glucose 26.70%). Excess fructose was computed as 8.07 g/100 g.
8. **Panseri S, Pavlovic R, Castrica M, et al.** Determination of Carbohydrates in Lactose-Free Dairy Products to Support Food Labelling. *Foods.* 2021;10(6):1219. doi:10.3390/foods10061219, PMC8229749, CC BY.
   - Values from Table 4: lactose in UHT whole milk (4.10) and UHT semi-skimmed milk (4.39), n=3 each.
   - Not used: "PDO hard cheese" (lactose < LOD), because the cheese isn't named, so I couldn't map it to Parmesan with certainty. Raw milk (2.67) was also left out because it is an unusual value for farm milk.
9. **Torbica AM, Miljić M, Radosavljević M.** FODMAP Profile of Wholegrain Pasta. *Foods.* 2025;14(4):667. doi:10.3390/foods14040667, PMC11853891, CC BY.
   - Values from Tables 2 (dry) and 3 (cooked), refined wheat/durum pasta samples 1–4, HPAEC-PAD.
   - Fructan rows are short-chain FOS only (kestose + nystose + kestopentaose), so they are set to **excluded**. GOS is raffinose + stachyose + verbascose, summed by me.
10. **Alowo D, Olum S, Mukisa IM, Ongeng D.** Effect of thermal and non-thermal processing on FODMAPs content in millet, sorghum, soybean and sesame varieties. *Front Nutr.* 2025;12:1520510. doi:10.3389/fnut.2025.1520510, PMC11932858, CC BY.
    - Values from Table 2 / Table 4, unprocessed grains (oven-dried at 50 °C).
    - Millet here is **finger millet** (Eleusine coracana). Soybean was not mapped (no catalog item).

Supporting (not a value source): Liljebo T et al. 2020 *BMC Nutr* (PMC7499970). Its Table 1 describes Whelan 2011's sampling (pooled, 5 brands). It is a database compilation and has no new lab values.

## Looked at but not used

- **Muir JG et al. 2007** *J Agric Food Chem* 55:6619, doi:10.1021/jf070623x. Abstract gives only ranges (e.g. garlic/artichoke/shallot/leek/onion 1.2–17.4 g/100 g fw).
- **Muir JG et al. 2009** *J Agric Food Chem* 57:554, doi:10.1021/jf802700e. Abstract gives only ranges and says apple, pear, mango, clingstone peach and watermelon contain excess fructose, with no numbers.
- **Biesiekierski JR et al. 2011** *J Hum Nutr Diet* 24:154, doi:10.1111/j.1365-277x.2010.01139.x. Abstract gives g per portion without portion weights.
- **Tuck C et al. 2018** *J Hum Nutr Diet* 31:422, doi:10.1111/jhn.12546. Abstract gives g per serve without serve weights (e.g. tempeh 0.26 g/serve, nutritional yeast 0.01 g/serve, canned coconut milk 0.24 g/serve).
- **Yao CK et al. 2014** *J Hum Nutr Diet* 27 Suppl 2:263, doi:10.1111/jhn.12144. Abstract has no numbers.
- **Pitsch J et al. 2021** *Foods* 10:894 (PMC8074121). Bread and flour FOS in g/kg with no clear wet/dry basis; bread values look like dry matter. Skipped.
- **Aprea E et al. 2017** *Sci Rep* 7:44950 (PMC5359574). Apple sorbitol, fructose and glucose for 40 batches, but no overall mean (sorbitol range 0.13–1.29 g/100 g; fructose always > glucose). I didn't average the batches myself. It could be added per cultivar if wanted.
- **Saraiva A et al. 2022** agave syrup review (PMC9222424). No usable fructose/glucose figures for commercial syrup (one value is fructose as % of reducing sugars only).
- **Varney J, Gibson P, Muir J. 2023** *Rev Esp Enferm Dig* 115:337. Letter; no cutoff numbers in the abstract.

## Needs library access (paywalled, high value)

| Paper | DOI | Why it matters |
|---|---|---|
| Varney J et al. 2017 *J Gastroenterol Hepatol* 32 S1:53-61 | 10.1111/jgh.13698 | Primary source for the cutoffs (verify the Galgano quote). Unpaywall says a free Wiley PDF exists; the founder can likely open it directly. |
| Muir JG et al. 2007 *J Agric Food Chem* 55(16):6619-27 | 10.1021/jf070623x | Fructans + free fructose in 60 vegetables and 43 fruits: garlic, onion, leek, shallot, artichoke, etc. |
| Muir JG et al. 2009 *J Agric Food Chem* 57(2):554-65 | 10.1021/jf802700e | Full FODMAP profile (sorbitol, mannitol, GOS, excess fructose) for 45 vegetables and 41 fruits: apple, pear, mango, watermelon, stone fruit, mushrooms, cauliflower, avocado. |
| Biesiekierski JR et al. 2011 *J Hum Nutr Diet* 24(2):154-76 | 10.1111/j.1365-277x.2010.01139.x | 55 grains, breads, pulses: wheat bread/pasta, rye, lentils, chickpeas, kidney beans. |
| Yao CK et al. 2014 *J Hum Nutr Diet* 27 S2:263-75 | 10.1111/jhn.12144 | Sorbitol/mannitol in 73 foods: mushrooms, stone fruit, avocado, cauliflower. |
| Tuck C et al. 2018 *J Hum Nutr Diet* 31(3):422-35 | 10.1111/jhn.12546 | 35 plant/vegan foods incl. canned vs dried legumes, tempeh, tofu, cashew/nut milks. |
| Prichard R et al. 2016 *Int J Food Sci Nutr* 67(4):383-90 | 10.3109/09637486.2016.1163328 | Full table of 20 foods (only 5 in the abstract). |
| Whelan K et al. 2011 *Int J Food Sci Nutr* 62(5):498-503 | 10.3109/09637486.2011.553588 | Fructan in 9 bread types (wholemeal, white, granary, rye). |
| Jovanovic-Malinovska R et al. 2014 *Int J Food Prop* 17:949-965 | 10.1080/10942912.2012.680221 | Sugars, polyols and FOS/fructans in 32 fruits + 41 vegetables (garlic, scallion, nectarine, watermelon mannitol). Unpaywall says open; fetch was blocked. |
| Schmidt M, Sciurba E. 2021 *Eur Food Res Technol* | 10.1007/s00217-020-03633-6 | FODMAPs in common wheat and rye breads. Unpaywall says CC BY; Springer redirected to a login, so I couldn't read it. |
| Ispiryan L, Zannini E, Arendt EK. 2020 *J Cereal Sci* 92:102916 | 10.1016/j.jcs.2020.102916 | FODMAP profile of cereal ingredients (wheat, rye, pulses). Unpaywall flags a ScienceDirect copy; not fetched. |
| Ispiryan L et al. 2021 *Food Chem* 343:128549 | 10.1016/j.foodchem.2020.128549 | Cereals, pseudo-cereals, chickpea, lentil (raw vs malted). |
| Gélinas P et al. 2016 *Int J Food Sci Technol* | 10.1111/ijfs.13022 | Fructans in bread and pasta from ancient vs modern wheat. |
| Van Loo J et al. 1995 *Crit Rev Food Sci Nutr* 35(6):525-52 | 10.1080/10408399509527714 | Classic inulin/oligofructose table (onion, garlic, leek, asparagus, Jerusalem artichoke, banana, wheat). Partly a review, so check its original sources. |

Priority foods with **no** usable lab value this session: garlic, legumes (lentils, chickpeas, kidney beans), mango, watermelon, stone fruits, mushrooms, asparagus, avocado, yogurt, soft cheese, agave, cashews, pistachios. The Muir 2007/2009, Biesiekierski 2011, Yao 2014 and Tuck 2018 papers above would cover most of them.

## Cutoffs VERIFIED (2026-11-02) against Varney 2017 full text, Table 1 (Wiley, Free Access, read in browser)
Per serving, per sitting. Low if below:
- Oligosaccharides (total fructans + GOS): <0.30 g for core grain products, legumes, nuts, seeds; <0.20 g for vegetables, fruits, all other products
- Sorbitol or mannitol: <0.20 g each; total polyols <0.40 g
- Excess fructose (fructose − glucose): <0.15 g; <0.40 g for fresh fruit/veg when it is the only FODMAP present
- Lactose: <1.00 g
Table 2 gives worked per-serve examples (Monash data): apple pink lady 165 g, orange 130 g, mushroom 74 g, onion 36 g, zucchini 66 g, wheat bread 49 g, GF bread, quinoa pasta 155 g cooked, haricot beans 88 g boiled.
