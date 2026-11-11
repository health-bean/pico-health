/**
 * Seed script for Pico Health domain data.
 *
 * Run:  npx tsx lib/db/seed.ts
 *   or: npm run db:seed
 *
 * Idempotent — uses INSERT ... ON CONFLICT DO NOTHING throughout.
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  console.error("Set it in your shell or .env.local before running this script.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

// ─── Protocol IDs (fixed for cross-referencing) ─────────────────────────
const PROTOCOL_IDS = {
  AIP: "a80be547-6db1-4722-a5a4-60930143a2d9",
  KETO: "b91cf658-7ec2-5833-b6b5-71041254b3ea",
  LOW_FODMAP: "c02d0769-8fd3-6944-c7c6-82152365c4fb",
  PALEO: "d13e087a-90e4-7a55-d8d7-93263476d50c",
  LOW_HISTAMINE: "e24f198b-a005-8b66-e9e8-a4374587e60d",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── Food Categories ────────────────────────────────────────────────────

const FOOD_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Meat & Poultry",
  "Fish & Seafood",
  "Eggs",
  "Dairy",
  "Plant Milks & Yogurts",
  "Grains",
  "Legumes",
  "Starches & Flours",
  "Nuts & Seeds",
  "Fats & Oils",
  "Herbs & Spices",
  "Fermented & Condiments",
] as const;

// ─── Food Subcategories ─────────────────────────────────────────────────
// Production's catalog has moved on from this seed; category names match it
// (migration 20261111100000) so protocol category rules work in dev too.

const FOOD_SUBCATEGORIES: Record<string, string[]> = {
  Vegetables: [
    "Leafy Greens",
    "Root Vegetables",
    "Cruciferous",
    "Nightshades",
    "Other Fresh Vegetables",
  ],
  Fruits: ["Berries", "Citrus", "Tropical", "Stone Fruits", "Pome Fruits"],
  Dairy: ["Fresh Dairy", "Fermented Dairy"],
  "Plant Milks & Yogurts": ["Plant-Based Alternatives"],
  Grains: ["Whole Grains", "Refined Grains"],
  "Starches & Flours": ["Gluten-Free Grains"],
  "Meat & Poultry": ["Red Meat", "Poultry", "Game"],
  "Fish & Seafood": ["Freshwater Fish", "Saltwater Fish", "Shellfish"],
  Eggs: ["Eggs"],
  Legumes: ["Legumes"],
  "Nuts & Seeds": ["Tree Nuts", "Seeds", "Nut Butters"],
  "Fats & Oils": ["Cooking Oils", "Animal Fats", "Other Fats"],
  "Herbs & Spices": ["Fresh Herbs", "Dried Spices"],
  "Fermented & Condiments": ["Sauces & Condiments", "Vinegars & Fermented"],
};

// ─── Foods ──────────────────────────────────────────────────────────────

interface FoodDef {
  name: string;
  subcategory: string;
  isCommon: boolean;
  trigger: {
    oxalate?: string;
    histamine?: string;
    lectin?: string;
    nightshade?: boolean;
    fodmap?: string;
    salicylate?: string;
    amines?: string;
    glutamates?: string;
    sulfites?: string;
    goitrogens?: string;
    purines?: string;
    phytoestrogens?: string;
    phytates?: string;
    tyramine?: string;
  };
}

// Sources:
// - Histamine: SIGHI (Swiss Interest Group Histamine Intolerance) Food Compatibility List
// - Oxalate: Harvard T.H. Chan School of Public Health / The Kidney Dietitian (Melanie Betz MS, RD)
// - FODMAP: Monash University Low FODMAP Diet
// - Lectin: Dr. Steven Gundry / The Plant Paradox
// - AIP: Dr. Sarah Ballantyne / The Paleo Mom
const FOODS: FoodDef[] = [
  // ── Vegetables ──────────────────────────────────────────────────────
  // Sources: Spinach oxalate=755mg/serving (Harvard), histamine SIGHI 2-3
  { name: "Spinach", subcategory: "Leafy Greens", isCommon: true, trigger: { oxalate: "very_high", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", goitrogens: "low", phytates: "moderate" } },
  // Kale oxalate=2mg/cup (Harvard), goitrogens high (cruciferous)
  { name: "Kale", subcategory: "Leafy Greens", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", goitrogens: "high" } },
  // Broccoli histamine SIGHI 1, FODMAP moderate at 75g (Monash)
  { name: "Broccoli", subcategory: "Cruciferous", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low", goitrogens: "moderate" } },
  // Cauliflower FODMAP high (mannitol, Monash)
  { name: "Cauliflower", subcategory: "Cruciferous", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low", goitrogens: "moderate" } },
  // Sweet potato oxalate=28mg/cup (Harvard moderate), FODMAP moderate at 75g (Monash mannitol)
  { name: "Sweet Potato", subcategory: "Root Vegetables", isCommon: true, trigger: { oxalate: "moderate", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low" } },
  { name: "Carrot", subcategory: "Root Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate" } },
  // Tomato: SIGHI 3 (very_high histamine + liberator), oxalate=7mg (low, Harvard), lectin high (nightshade)
  { name: "Tomato", subcategory: "Nightshades", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "high", nightshade: true, fodmap: "low", salicylate: "high", glutamates: "high", amines: "moderate" } },
  // Bell pepper: SIGHI 0 (low histamine), FODMAP low at 75g (Monash)
  { name: "Bell Pepper", subcategory: "Nightshades", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "moderate", nightshade: true, fodmap: "low", salicylate: "high" } },
  // Eggplant: SIGHI 2-3, oxalate=11mg (moderate), lectin moderate (nightshade)
  { name: "Eggplant", subcategory: "Nightshades", isCommon: true, trigger: { oxalate: "moderate", histamine: "high", lectin: "moderate", nightshade: true, fodmap: "low", salicylate: "high" } },
  { name: "Zucchini", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Onion: FODMAP very high in fructans (Monash)
  { name: "Onion", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low", sulfites: "low" } },
  // Garlic: SIGHI 1 (moderate histamine), FODMAP extremely high in fructans (Monash)
  { name: "Garlic", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "high", salicylate: "moderate" } },
  // Asparagus: FODMAP high above 42g (Monash fructans)
  { name: "Asparagus", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low", purines: "moderate" } },
  // Celery: oxalate=3-5mg (low, Harvard), FODMAP moderate (Monash mannitol)
  { name: "Celery", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "high" } },
  { name: "Cucumber", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate" } },
  // Beet: oxalate=76mg/serving (high, Harvard), FODMAP high >60g (Monash fructans/GOS)
  { name: "Beet", subcategory: "Root Vegetables", isCommon: true, trigger: { oxalate: "high", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  { name: "Cabbage", subcategory: "Cruciferous", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low", goitrogens: "moderate" } },
  // Brussels sprouts: SIGHI 1, FODMAP moderate (Monash fructans)
  { name: "Brussels Sprouts", subcategory: "Cruciferous", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "moderate", goitrogens: "moderate" } },
  // Artichoke: FODMAP very high (Monash fructans)
  { name: "Artichoke", subcategory: "Other Fresh Vegetables", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  // Avocado: oxalate=19mg (moderate, Harvard), FODMAP moderate (sorbitol, low at 1/8 fruit, Monash)
  { name: "Avocado", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "moderate", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "high", amines: "moderate", tyramine: "moderate" } },
  // Potato: nightshade, high lectin, FODMAP low (Monash), oxalate low
  { name: "Potato", subcategory: "Nightshades", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "high", nightshade: true, fodmap: "low", salicylate: "low" } },
  // Lettuce: all levels low (SIGHI 0, Harvard <5mg, Monash freely low)
  { name: "Lettuce", subcategory: "Leafy Greens", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Mushrooms: SIGHI 1-2, FODMAP high mannitol (Monash)
  { name: "Mushrooms", subcategory: "Other Fresh Vegetables", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  // Bok Choy: FODMAP low (Monash), goitrogens moderate (cruciferous)
  { name: "Bok Choy", subcategory: "Cruciferous", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", goitrogens: "moderate" } },
  // Fennel: FODMAP high (Monash fructans)
  { name: "Fennel", subcategory: "Other Fresh Vegetables", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "moderate" } },
  // Leeks: FODMAP high white part (Monash fructans), green part is low
  { name: "Leeks", subcategory: "Other Fresh Vegetables", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },

  // ── Fruits ──────────────────────────────────────────────────────────
  // Blueberries: FODMAP moderate (Monash, low at 40g)
  { name: "Blueberries", subcategory: "Berries", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "high" } },
  // Strawberries: SIGHI 2-3 histamine liberator, oxalate=4mg (low, Harvard), FODMAP low (Monash)
  { name: "Strawberries", subcategory: "Berries", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Raspberries: oxalate=48mg/cup (high, Harvard), FODMAP low (Monash)
  { name: "Raspberries", subcategory: "Berries", isCommon: true, trigger: { oxalate: "high", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  { name: "Blackberries", subcategory: "Berries", isCommon: true, trigger: { oxalate: "moderate", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Banana: FODMAP moderate ripe (Monash fructans increase with ripeness), unripe is low
  { name: "Banana", subcategory: "Tropical", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "moderate", nightshade: false, fodmap: "moderate", salicylate: "low", amines: "moderate", tyramine: "moderate" } },
  // Apple: FODMAP high (Monash fructose + sorbitol)
  { name: "Apple", subcategory: "Pome Fruits", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "moderate" } },
  // Orange: SIGHI 2 histamine liberator (citrus), FODMAP low (Monash)
  { name: "Orange", subcategory: "Citrus", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate", amines: "low" } },
  // Lemon: SIGHI 1 (moderate, mild citrus liberator), FODMAP low (Monash)
  { name: "Lemon", subcategory: "Citrus", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Mango: SIGHI 1 (moderate), FODMAP high (Monash fructose)
  { name: "Mango", subcategory: "Tropical", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "high", salicylate: "high" } },
  // Pineapple: SIGHI 2-3 histamine liberator, FODMAP low (Monash)
  { name: "Pineapple", subcategory: "Tropical", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate", amines: "moderate" } },
  // Grapes: FODMAP low (Monash)
  { name: "Grapes", subcategory: "Berries", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Watermelon: FODMAP high (Monash fructose + fructans + mannitol)
  { name: "Watermelon", subcategory: "Tropical", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  // Peach: FODMAP moderate (Monash sorbitol), SIGHI 0
  { name: "Peach", subcategory: "Stone Fruits", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "moderate", amines: "low" } },
  // Pear: FODMAP high (Monash fructose + sorbitol)
  { name: "Pear", subcategory: "Pome Fruits", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  // Grapefruit: SIGHI 2 histamine liberator (citrus)
  { name: "Grapefruit", subcategory: "Citrus", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate", amines: "moderate" } },
  // Coconut: FODMAP moderate (Monash sorbitol in desiccated)
  { name: "Coconut", subcategory: "Tropical", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "moderate" } },

  // ── Meat & Poultry ──────────────────────────────────────────────────
  // All fresh meats: SIGHI 0 (low histamine when fresh). Histamine rises with storage/aging.
  { name: "Chicken Breast", subcategory: "Poultry", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "moderate" } },
  // Ground beef: SIGHI 0-1 when fresh (low), purines high
  { name: "Ground Beef", subcategory: "Red Meat", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "high", amines: "low" } },
  { name: "Turkey", subcategory: "Poultry", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "moderate" } },
  // Lamb: SIGHI 0-1 when fresh
  { name: "Lamb", subcategory: "Red Meat", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "high" } },
  // Pork: SIGHI 0-1 when fresh (processed pork like bacon/ham is HIGH)
  { name: "Pork", subcategory: "Red Meat", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "moderate", amines: "low" } },
  { name: "Eggs", subcategory: "Poultry", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", sulfites: "low" } },

  // ── Fish & Seafood ──────────────────────────────────────────────────
  // Salmon: SIGHI 0-1 fresh/frozen (moderate), canned/smoked is high
  { name: "Salmon", subcategory: "Saltwater Fish", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "low", purines: "moderate", amines: "moderate" } },
  // Tuna: SIGHI 3 (very_high), especially canned — scombroid fish
  { name: "Tuna", subcategory: "Saltwater Fish", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "low", nightshade: false, fodmap: "low", purines: "high", amines: "high" } },
  // Shrimp: SIGHI 2 (histamine liberator)
  { name: "Shrimp", subcategory: "Shellfish", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", purines: "high" } },
  // Sardines: SIGHI 3 (always canned, very_high)
  { name: "Sardines", subcategory: "Saltwater Fish", isCommon: false, trigger: { oxalate: "low", histamine: "very_high", lectin: "low", nightshade: false, fodmap: "low", purines: "high", amines: "high" } },
  { name: "Cod", subcategory: "Saltwater Fish", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", purines: "moderate" } },

  // ── Dairy & Alternatives ────────────────────────────────────────────
  // Milk: FODMAP high lactose (Monash)
  { name: "Whole Milk", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "low" } },
  { name: "Butter", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Cheddar: SIGHI 3 (very_high, aged cheese), tyramine high
  { name: "Cheddar Cheese", subcategory: "Fermented Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "low", nightshade: false, fodmap: "low", tyramine: "high", amines: "high" } },
  // Yogurt: SIGHI 2 (high, fermented), FODMAP moderate (Monash lactose)
  { name: "Yogurt", subcategory: "Fermented Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "low", nightshade: false, fodmap: "moderate", tyramine: "moderate", amines: "moderate" } },
  { name: "Cream", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low" } },
  { name: "Goat Cheese", subcategory: "Fermented Dairy", isCommon: false, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "low", tyramine: "moderate" } },
  { name: "Ghee", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Parmesan: SIGHI 3 (very aged), FODMAP low (negligible lactose, Monash)
  { name: "Parmesan", subcategory: "Fermented Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "low", nightshade: false, fodmap: "low", tyramine: "high", amines: "high" } },
  // Mozzarella: fresh = low histamine, FODMAP low (Monash)
  { name: "Mozzarella", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  // Cream Cheese: FODMAP moderate (Monash lactose)
  { name: "Cream Cheese", subcategory: "Fresh Dairy", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "moderate", salicylate: "low" } },

  // ── Grains & Starches ───────────────────────────────────────────────
  // White rice: FODMAP low (Monash), lectin low (hull removed)
  { name: "White Rice", subcategory: "Refined Grains", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "low" } },
  // Brown rice: oxalate=13mg (moderate, Harvard), lectin moderate (hull), histamine SIGHI 1
  { name: "Brown Rice", subcategory: "Whole Grains", isCommon: true, trigger: { oxalate: "moderate", histamine: "low", lectin: "moderate", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate" } },
  // Oats: oxalate=14mg (moderate, Harvard), histamine SIGHI 0, FODMAP moderate (Monash)
  { name: "Oats", subcategory: "Whole Grains", isCommon: true, trigger: { oxalate: "moderate", histamine: "low", lectin: "moderate", nightshade: false, fodmap: "moderate", salicylate: "low", phytates: "moderate", goitrogens: "low" } },
  // Quinoa: oxalate=61mg (very_high, Harvard!), FODMAP low (Monash)
  { name: "Quinoa", subcategory: "Gluten-Free Grains", isCommon: true, trigger: { oxalate: "very_high", histamine: "low", lectin: "moderate", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate" } },
  // Bread (Wheat): histamine SIGHI 1 (moderate), FODMAP high fructans (Monash), lectin high (WGA)
  { name: "Bread (Wheat)", subcategory: "Refined Grains", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "high", nightshade: false, fodmap: "high", salicylate: "low", phytates: "moderate", glutamates: "low" } },
  // Pasta: histamine SIGHI 1 (moderate), FODMAP high (Monash wheat fructans)
  { name: "Pasta", subcategory: "Refined Grains", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "high", nightshade: false, fodmap: "high", salicylate: "low", phytates: "low" } },
  // Corn: lectin high, FODMAP moderate (Monash GOS + sorbitol at 1/2 cob)
  { name: "Corn", subcategory: "Whole Grains", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "high", nightshade: false, fodmap: "moderate", salicylate: "low" } },

  // ── Nuts & Seeds ────────────────────────────────────────────────────
  // Almonds: oxalate=122mg/oz (very_high, Harvard), histamine SIGHI 1 (moderate), FODMAP moderate at 10 nuts (Monash)
  { name: "Almonds", subcategory: "Tree Nuts", isCommon: true, trigger: { oxalate: "very_high", histamine: "moderate", lectin: "moderate", nightshade: false, fodmap: "moderate", salicylate: "moderate", phytates: "high" } },
  // Walnuts: oxalate=31mg/oz (high, Harvard), histamine SIGHI 2 (high)
  { name: "Walnuts", subcategory: "Tree Nuts", isCommon: true, trigger: { oxalate: "high", histamine: "high", lectin: "moderate", nightshade: false, fodmap: "low", salicylate: "high", phytates: "high" } },
  // Cashews: oxalate=49mg/oz (high, Harvard), FODMAP high GOS (Monash)
  { name: "Cashews", subcategory: "Tree Nuts", isCommon: true, trigger: { oxalate: "high", histamine: "moderate", lectin: "moderate", nightshade: false, fodmap: "high", salicylate: "low", phytates: "moderate" } },
  // Macadamia: low across the board, FODMAP low (Monash)
  { name: "Macadamia Nuts", subcategory: "Tree Nuts", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "low" } },
  // Pecans: oxalate low, FODMAP low (Monash)
  { name: "Pecans", subcategory: "Tree Nuts", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate", phytates: "moderate" } },
  // Pistachios: FODMAP high (Monash fructans + GOS)
  { name: "Pistachios", subcategory: "Tree Nuts", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "high", salicylate: "moderate", phytates: "moderate" } },
  { name: "Pumpkin Seeds", subcategory: "Seeds", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate" } },
  // Sunflower seeds: SIGHI 1-2 (moderate, histamine liberator)
  { name: "Sunflower Seeds", subcategory: "Seeds", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate" } },
  { name: "Flaxseed", subcategory: "Seeds", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate", phytoestrogens: "high" } },
  { name: "Chia Seeds", subcategory: "Seeds", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "moderate" } },
  // Peanuts: oxalate=27mg (high, Harvard), histamine SIGHI 2 (high), lectin high (legume)
  { name: "Peanuts", subcategory: "Nut Butters", isCommon: true, trigger: { oxalate: "high", histamine: "high", lectin: "high", nightshade: false, fodmap: "low", salicylate: "low", phytates: "high", amines: "moderate" } },
  // Hemp seeds: low across the board
  { name: "Hemp Seeds", subcategory: "Seeds", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low", phytates: "low" } },

  // ── Fats & Oils ─────────────────────────────────────────────────────
  { name: "Olive Oil", subcategory: "Cooking Oils", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  { name: "Coconut Oil", subcategory: "Cooking Oils", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  { name: "Avocado Oil", subcategory: "Cooking Oils", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate" } },
  { name: "MCT Oil", subcategory: "Other Fats", isCommon: false, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },

  // ── Herbs, Spices & Condiments ──────────────────────────────────────
  // Turmeric: oxalate high at ~10mg/tsp (Harvard), SIGHI 0
  { name: "Turmeric", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "high", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Ginger: SIGHI 1 (moderate histamine), oxalate low (1.6mg/day, Harvard)
  { name: "Ginger", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Cinnamon: oxalate low (very low soluble), SIGHI 0
  { name: "Cinnamon", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  // Black pepper: SIGHI 2 (high histamine), oxalate moderate
  { name: "Black Pepper", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "moderate", histamine: "high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate" } },
  { name: "Salt", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "low" } },
  { name: "Rosemary", subcategory: "Fresh Herbs", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  { name: "Basil", subcategory: "Fresh Herbs", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  { name: "Oregano", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "high" } },
  { name: "Cumin", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "low", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate" } },
  // Garlic powder: FODMAP high fructans (Monash, same as fresh garlic)
  { name: "Garlic Powder", subcategory: "Dried Spices", isCommon: true, trigger: { oxalate: "low", histamine: "moderate", lectin: "low", nightshade: false, fodmap: "high", salicylate: "moderate" } },
  // Apple cider vinegar: SIGHI 3 (very_high, all vinegars)
  { name: "Apple Cider Vinegar", subcategory: "Vinegars & Fermented", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "low", nightshade: false, fodmap: "low", salicylate: "moderate", amines: "moderate", sulfites: "moderate" } },
  // Soy sauce: SIGHI 3 (very_high, fermented), tyramine high, glutamates high
  { name: "Soy Sauce", subcategory: "Sauces & Condiments", isCommon: true, trigger: { oxalate: "low", histamine: "very_high", lectin: "moderate", nightshade: false, fodmap: "low", salicylate: "low", amines: "high", glutamates: "high", tyramine: "high", phytoestrogens: "high" } },
  // Hot sauce: SIGHI 2 (high, contains vinegar + nightshade peppers)
  { name: "Hot Sauce", subcategory: "Sauces & Condiments", isCommon: true, trigger: { oxalate: "low", histamine: "high", lectin: "moderate", nightshade: true, fodmap: "low", salicylate: "high" } },
];

// ─── Symptoms ───────────────────────────────────────────────────────────

const SYMPTOMS = [
  // Pain
  { name: "Joint Pain", category: "Pain", isCommon: true },
  { name: "Headache", category: "Pain", isCommon: true },
  { name: "Migraine", category: "Pain", isCommon: true },
  { name: "Muscle Pain", category: "Pain", isCommon: true },
  { name: "Stomach Pain", category: "Pain", isCommon: true },
  { name: "Chest Pain", category: "Pain", isCommon: false },
  // Cognitive
  { name: "Brain Fog", category: "Cognitive", isCommon: true },
  { name: "Difficulty Concentrating", category: "Cognitive", isCommon: true },
  { name: "Memory Issues", category: "Cognitive", isCommon: false },
  // Energy
  { name: "Fatigue", category: "Energy", isCommon: true },
  { name: "Low Energy", category: "Energy", isCommon: true },
  { name: "Insomnia", category: "Energy", isCommon: true },
  { name: "Restless Sleep", category: "Energy", isCommon: true },
  // GI
  { name: "Bloating", category: "GI", isCommon: true },
  { name: "Gas", category: "GI", isCommon: true },
  { name: "Nausea", category: "GI", isCommon: true },
  { name: "Diarrhea", category: "GI", isCommon: true },
  { name: "Constipation", category: "GI", isCommon: true },
  { name: "Acid Reflux", category: "GI", isCommon: true },
  // Skin
  { name: "Rash", category: "Skin", isCommon: true },
  { name: "Hives", category: "Skin", isCommon: true },
  { name: "Eczema Flare", category: "Skin", isCommon: true },
  { name: "Acne", category: "Skin", isCommon: true },
  // Other
  { name: "Anxiety", category: "Other", isCommon: true },
  { name: "Heart Palpitations", category: "Other", isCommon: false },
];

// ─── Supplements ────────────────────────────────────────────────────────

const SUPPLEMENTS = [
  // Vitamins
  { name: "Vitamin D3", category: "Vitamins", commonDosage: "2000-5000 IU" },
  { name: "Vitamin C", category: "Vitamins", commonDosage: "500-1000 mg" },
  { name: "Vitamin B12", category: "Vitamins", commonDosage: "1000-5000 mcg" },
  { name: "Vitamin B Complex", category: "Vitamins", commonDosage: "1 capsule" },
  { name: "Vitamin A", category: "Vitamins", commonDosage: "5000-10000 IU" },
  { name: "Vitamin E", category: "Vitamins", commonDosage: "400 IU" },
  { name: "Vitamin K2", category: "Vitamins", commonDosage: "100-200 mcg" },
  // Minerals
  { name: "Magnesium Glycinate", category: "Minerals", commonDosage: "200-400 mg" },
  { name: "Zinc", category: "Minerals", commonDosage: "15-30 mg" },
  { name: "Iron", category: "Minerals", commonDosage: "18-65 mg" },
  { name: "Selenium", category: "Minerals", commonDosage: "100-200 mcg" },
  { name: "Calcium", category: "Minerals", commonDosage: "500-1000 mg" },
  { name: "Potassium", category: "Minerals", commonDosage: "99-200 mg" },
  // Fatty Acids
  { name: "Omega-3 Fish Oil", category: "Fatty Acids", commonDosage: "1000-3000 mg" },
  { name: "Evening Primrose Oil", category: "Fatty Acids", commonDosage: "1000-1300 mg" },
  { name: "Krill Oil", category: "Fatty Acids", commonDosage: "500-1000 mg" },
  // Probiotics
  { name: "Lactobacillus", category: "Probiotics", commonDosage: "10-50 billion CFU" },
  { name: "Saccharomyces Boulardii", category: "Probiotics", commonDosage: "250-500 mg" },
  { name: "Multi-Strain Probiotic", category: "Probiotics", commonDosage: "25-100 billion CFU" },
  // Adaptogens
  { name: "Ashwagandha", category: "Adaptogens", commonDosage: "300-600 mg" },
  { name: "Rhodiola", category: "Adaptogens", commonDosage: "200-400 mg" },
  { name: "Holy Basil", category: "Adaptogens", commonDosage: "300-600 mg" },
  { name: "Lion's Mane", category: "Adaptogens", commonDosage: "500-1000 mg" },
  // Digestive
  { name: "Betaine HCl", category: "Digestive", commonDosage: "325-650 mg" },
  { name: "Digestive Enzymes", category: "Digestive", commonDosage: "1-2 capsules" },
  { name: "L-Glutamine", category: "Digestive", commonDosage: "2-5 g" },
  { name: "Slippery Elm", category: "Digestive", commonDosage: "400-800 mg" },
  // Other
  { name: "Collagen Peptides", category: "Other", commonDosage: "10-20 g" },
  { name: "Quercetin", category: "Other", commonDosage: "500-1000 mg" },
  { name: "NAC", category: "Other", commonDosage: "600-1200 mg" },
  { name: "Turmeric/Curcumin", category: "Other", commonDosage: "500-1000 mg" },
  { name: "Berberine", category: "Other", commonDosage: "500-1500 mg" },
  { name: "CoQ10", category: "Other", commonDosage: "100-300 mg" },
  { name: "Melatonin", category: "Other", commonDosage: "0.5-5 mg" },
];

// ─── Medications ────────────────────────────────────────────────────────

const MEDICATIONS = [
  // Hormones
  { name: "Levothyroxine", category: "Hormones" },
  { name: "Liothyronine", category: "Hormones" },
  { name: "Hydrocortisone", category: "Hormones" },
  { name: "DHEA", category: "Hormones" },
  { name: "Progesterone", category: "Hormones" },
  // Anti-inflammatory
  { name: "Ibuprofen", category: "Anti-inflammatory" },
  { name: "Naproxen", category: "Anti-inflammatory" },
  { name: "Prednisone", category: "Anti-inflammatory" },
  { name: "Hydroxychloroquine", category: "Anti-inflammatory" },
  // GI
  { name: "Omeprazole", category: "GI" },
  { name: "Famotidine", category: "GI" },
  { name: "Ondansetron", category: "GI" },
  // Pain
  { name: "Acetaminophen", category: "Pain" },
  { name: "Gabapentin", category: "Pain" },
  { name: "Tramadol", category: "Pain" },
  // Allergy
  { name: "Cetirizine", category: "Allergy" },
  { name: "Loratadine", category: "Allergy" },
  { name: "Diphenhydramine", category: "Allergy" },
  { name: "Montelukast", category: "Allergy" },
  // Autoimmune
  { name: "Methotrexate", category: "Autoimmune" },
  { name: "Sulfasalazine", category: "Autoimmune" },
  { name: "Azathioprine", category: "Autoimmune" },
  // Other
  { name: "Amitriptyline", category: "Other" },
  { name: "LDN (Low Dose Naltrexone)", category: "Other" },
  { name: "Doxycycline", category: "Other" },
];

// ─── Detox Types ────────────────────────────────────────────────────────

const DETOX_TYPES = [
  // Heat
  { name: "Sauna", category: "Heat" },
  { name: "Infrared Sauna", category: "Heat" },
  { name: "Steam Room", category: "Heat" },
  // Bath
  { name: "Epsom Salt Bath", category: "Bath" },
  { name: "Detox Bath", category: "Bath" },
  { name: "Bentonite Clay Bath", category: "Bath" },
  // Manual
  { name: "Dry Brushing", category: "Manual" },
  { name: "Lymphatic Massage", category: "Manual" },
  { name: "Oil Pulling", category: "Manual" },
  // Cold
  { name: "Cold Plunge", category: "Cold" },
  { name: "Cold Shower", category: "Cold" },
  // Internal
  { name: "Coffee Enema", category: "Internal" },
];

// ─── Protocols ──────────────────────────────────────────────────────────

const PROTOCOLS = [
  {
    id: PROTOCOL_IDS.AIP,
    name: "AIP (Autoimmune Protocol)",
    description:
      "An elimination diet designed to reduce inflammation and identify food triggers for autoimmune conditions. Removes grains, dairy, eggs, nightshades, nuts, seeds, and legumes.",
    category: "Elimination",
    durationWeeks: 8,
    hasPhases: true,
  },
  {
    id: PROTOCOL_IDS.KETO,
    name: "Keto",
    description:
      "A high-fat, very low-carbohydrate diet that shifts the body into ketosis. Restricts grains, most fruits, starchy vegetables, and sugar.",
    category: "Metabolic",
    durationWeeks: 12,
    hasPhases: false,
  },
  {
    id: PROTOCOL_IDS.LOW_FODMAP,
    name: "Low FODMAP",
    description:
      "Reduces fermentable carbohydrates (Fermentable Oligo- Di- Mono-saccharides And Polyols) to manage IBS and digestive symptoms.",
    category: "Digestive",
    durationWeeks: 6,
    hasPhases: true,
  },
  {
    id: PROTOCOL_IDS.PALEO,
    name: "Paleo",
    description:
      "Based on foods similar to what might have been eaten during the Paleolithic era. Avoids grains, legumes, dairy, refined sugar, and processed foods.",
    category: "Ancestral",
    durationWeeks: null,
    hasPhases: false,
  },
  {
    id: PROTOCOL_IDS.LOW_HISTAMINE,
    name: "Low Histamine",
    description:
      "Eliminates foods high in histamine or that trigger histamine release to manage histamine intolerance, mast cell activation, and related conditions.",
    category: "Elimination",
    durationWeeks: 4,
    hasPhases: true,
  },
];

// ─── Protocol Phase IDs (fixed for cross-referencing) ────────────────────

const PHASE_IDS = {
  // AIP
  AIP_ELIMINATION: "f35a2a9c-b116-4c77-a0a0-100000000001",
  AIP_REINTRODUCTION: "f35a2a9c-b116-4c77-a0a0-100000000002",
  AIP_MAINTENANCE: "f35a2a9c-b116-4c77-a0a0-100000000003",
  // Low FODMAP
  FODMAP_ELIMINATION: "f35a2a9c-b116-4c77-a0a0-200000000001",
  FODMAP_REINTRODUCTION: "f35a2a9c-b116-4c77-a0a0-200000000002",
  FODMAP_PERSONALIZATION: "f35a2a9c-b116-4c77-a0a0-200000000003",
  // Low Histamine
  HISTAMINE_ELIMINATION: "f35a2a9c-b116-4c77-a0a0-300000000001",
  HISTAMINE_REINTRODUCTION: "f35a2a9c-b116-4c77-a0a0-300000000002",
} as const;

// ─── Protocol Phases ────────────────────────────────────────────────────

interface PhaseDef {
  id: string;
  protocolId: string;
  name: string;
  slug: string;
  phaseOrder: number;
  durationWeeks: number | null;
  description: string;
  guidance: string;
}

const PROTOCOL_PHASES: PhaseDef[] = [
  // AIP Phases
  {
    id: PHASE_IDS.AIP_ELIMINATION,
    protocolId: PROTOCOL_IDS.AIP,
    name: "Elimination",
    slug: "elimination",
    phaseOrder: 1,
    durationWeeks: 4,
    description: "Strict avoidance of grains, dairy, eggs, nightshades, nuts, seeds, and legumes to calm inflammation.",
    guidance: "Focus on quality meats, fish, non-nightshade vegetables, fruits, healthy fats (coconut, olive oil, avocado oil), and bone broth. Avoid all grains, dairy, eggs, nightshades (tomato, pepper, eggplant, potato), nuts, seeds, legumes, refined sugar, alcohol, and NSAIDs.",
  },
  {
    id: PHASE_IDS.AIP_REINTRODUCTION,
    protocolId: PROTOCOL_IDS.AIP,
    name: "Reintroduction",
    slug: "reintroduction",
    phaseOrder: 2,
    durationWeeks: 8,
    description: "Systematic food trials — reintroduce one food at a time with 3-day observation windows.",
    guidance: "Reintroduce foods one at a time. Eat a small amount on day 1, a normal portion on day 2, then observe for 3 days. Track symptoms carefully. Suggested order: egg yolks, ghee, seeds (flax, chia), nuts (macadamia first), nightshade spices, then dairy. If symptoms return, remove the food and wait 1 week before trying the next.",
  },
  {
    id: PHASE_IDS.AIP_MAINTENANCE,
    protocolId: PROTOCOL_IDS.AIP,
    name: "Maintenance",
    slug: "maintenance",
    phaseOrder: 3,
    durationWeeks: null,
    description: "Personal tolerance map — eat based on your reintroduction results.",
    guidance: "You now have a personalized diet based on your reintroduction results. Continue avoiding foods that triggered symptoms. Periodically re-test failed foods (every 3-6 months) as tolerance can improve. Maintain an anti-inflammatory baseline with nutrient-dense whole foods.",
  },

  // Low FODMAP Phases
  {
    id: PHASE_IDS.FODMAP_ELIMINATION,
    protocolId: PROTOCOL_IDS.LOW_FODMAP,
    name: "Elimination",
    slug: "elimination",
    phaseOrder: 1,
    durationWeeks: 4,
    description: "Strict low FODMAP eating to establish a symptom baseline.",
    guidance: "Avoid all high-FODMAP foods: onion, garlic, wheat, apples, pears, watermelon, mushrooms, cauliflower, artichokes, cashews, pistachios, milk, yogurt, legumes, and honey. Eat low-FODMAP staples: rice, oats (small amounts), potatoes, carrots, zucchini, lettuce, chicken, fish, eggs, firm tofu, lactose-free dairy, and berries.",
  },
  {
    id: PHASE_IDS.FODMAP_REINTRODUCTION,
    protocolId: PROTOCOL_IDS.LOW_FODMAP,
    name: "Reintroduction",
    slug: "reintroduction",
    phaseOrder: 2,
    durationWeeks: 7,
    description: "Challenge one FODMAP group at a time — fructose, lactose, fructans, GOS, polyols.",
    guidance: "Test one FODMAP group over 3 days with increasing portions, then take 3 washout days before the next group. Order: fructose (honey, mango), lactose (milk, yogurt), sorbitol (avocado, peach), mannitol (mushrooms, cauliflower), fructans-grain (bread, pasta), fructans-veg (garlic, onion), GOS (legumes, cashews). Log symptoms carefully after each challenge.",
  },
  {
    id: PHASE_IDS.FODMAP_PERSONALIZATION,
    protocolId: PROTOCOL_IDS.LOW_FODMAP,
    name: "Personalization",
    slug: "personalization",
    phaseOrder: 3,
    durationWeeks: null,
    description: "Your personalized FODMAP tolerance map — eat known safe amounts.",
    guidance: "Based on your reintroduction results, you know your personal thresholds for each FODMAP group. Re-expand your diet to include tolerated foods at safe portions. Continue to limit problem FODMAPs but don't restrict unnecessarily. Re-test failed groups every few months as tolerance can change.",
  },

  // Low Histamine Phases
  {
    id: PHASE_IDS.HISTAMINE_ELIMINATION,
    protocolId: PROTOCOL_IDS.LOW_HISTAMINE,
    name: "Elimination",
    slug: "elimination",
    phaseOrder: 1,
    durationWeeks: 3,
    description: "Strict low histamine eating to establish a symptom baseline.",
    guidance: "Avoid high-histamine foods: aged cheese, cured/smoked meats, canned fish, vinegar, soy sauce, fermented foods (sauerkraut, kombucha, yogurt), alcohol, spinach, tomato, eggplant, avocado, strawberries, citrus, dried fruits, and leftovers. Eat fresh-cooked meats, fresh fish, most fresh vegetables, rice, potatoes, fresh fruits (except citrus/strawberry), and fresh dairy (butter, cream, fresh mozzarella).",
  },
  {
    id: PHASE_IDS.HISTAMINE_REINTRODUCTION,
    protocolId: PROTOCOL_IDS.LOW_HISTAMINE,
    name: "Reintroduction",
    slug: "reintroduction",
    phaseOrder: 2,
    durationWeeks: 6,
    description: "Gradually reintroduce moderate-histamine foods to find your threshold.",
    guidance: "Start with moderate-histamine foods one at a time: fresh citrus, avocado, spinach (cooked), yogurt, mild aged cheese. Test each food for 2-3 days before moving to the next. Your histamine bucket is cumulative — symptoms depend on total load, not just one food. Track timing carefully since reactions can be delayed 12-24 hours.",
  },
];

// ─── Protocol Rules ─────────────────────────────────────────────────────

interface ProtocolRule {
  protocolId: string;
  ruleType: string;
  propertyName: string | null;
  propertyValues: string[];
  status: string;
  ruleOrder: number;
  notes: string | null;
}

const PROTOCOL_RULES: ProtocolRule[] = [
  // ── AIP ─────────────────────────────────────────────────────────────
  // AIP and Paleo are food-group lists, not lectin cutoffs (no lab lectin data
  // exists). Foods a list names that no category catches (coffee, seed
  // spices, seed oils…) are protocol_food_overrides: migration 20261111100000.
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "property", propertyName: "nightshade", propertyValues: ["true"], status: "avoid", ruleOrder: 1, notes: "AIP removes nightshades (tomato, potato, peppers, eggplant, paprika) during elimination" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Legumes"], status: "avoid", ruleOrder: 2, notes: "AIP removes legumes, including soy and peanuts, during elimination" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Grains"], status: "avoid", ruleOrder: 3, notes: "AIP removes all grains during elimination" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Dairy"], status: "avoid", ruleOrder: 4, notes: "AIP removes dairy during elimination; ghee is among the first foods reintroduced" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Nuts & Seeds"], status: "avoid", ruleOrder: 5, notes: "AIP removes nuts and seeds during elimination" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Eggs"], status: "avoid", ruleOrder: 6, notes: "AIP removes eggs during elimination; yolks are among the first foods reintroduced" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Meat & Poultry", "Fish & Seafood"], status: "allowed", ruleOrder: 6, notes: "Quality meats and seafood are AIP staples" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Vegetables"], status: "allowed", ruleOrder: 7, notes: "Non-nightshade vegetables are encouraged" },
  { protocolId: PROTOCOL_IDS.AIP, ruleType: "category", propertyName: null, propertyValues: ["Fruits"], status: "allowed", ruleOrder: 8, notes: "Fruits allowed in moderation" },

  // ── Keto ─────────────────────────────────────────────────────────────
  { protocolId: PROTOCOL_IDS.KETO, ruleType: "category", propertyName: null, propertyValues: ["Grains", "Starches & Flours"], status: "avoid", ruleOrder: 1, notes: "All grains and starches too high in carbs" },
  { protocolId: PROTOCOL_IDS.KETO, ruleType: "category", propertyName: null, propertyValues: ["Fruits"], status: "caution", ruleOrder: 2, notes: "Most fruits too high in sugar; berries in small amounts OK" },
  { protocolId: PROTOCOL_IDS.KETO, ruleType: "category", propertyName: null, propertyValues: ["Meat & Poultry", "Fish & Seafood"], status: "allowed", ruleOrder: 3, notes: "Protein and fat sources are keto staples" },
  { protocolId: PROTOCOL_IDS.KETO, ruleType: "category", propertyName: null, propertyValues: ["Fats & Oils"], status: "allowed", ruleOrder: 4, notes: "Healthy fats are the primary energy source" },
  { protocolId: PROTOCOL_IDS.KETO, ruleType: "category", propertyName: null, propertyValues: ["Nuts & Seeds"], status: "allowed", ruleOrder: 5, notes: "Most nuts and seeds are keto-friendly" },

  // ── Low FODMAP ──────────────────────────────────────────────────────
  { protocolId: PROTOCOL_IDS.LOW_FODMAP, ruleType: "property", propertyName: "fodmap", propertyValues: ["high"], status: "avoid", ruleOrder: 1, notes: "High FODMAP foods trigger IBS symptoms" },
  { protocolId: PROTOCOL_IDS.LOW_FODMAP, ruleType: "property", propertyName: "fodmap", propertyValues: ["moderate"], status: "caution", ruleOrder: 2, notes: "Moderate FODMAP — test tolerance" },
  { protocolId: PROTOCOL_IDS.LOW_FODMAP, ruleType: "property", propertyName: "fodmap", propertyValues: ["low"], status: "allowed", ruleOrder: 3, notes: "Low FODMAP foods are safe" },

  // ── Paleo ───────────────────────────────────────────────────────────
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Grains"], status: "avoid", ruleOrder: 1, notes: "Paleo leaves out grains" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Legumes"], status: "avoid", ruleOrder: 2, notes: "Paleo leaves out legumes, including soy and peanuts" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Dairy"], status: "avoid", ruleOrder: 2, notes: "Paleo leaves out dairy; many plans allow butter and ghee" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Meat & Poultry", "Fish & Seafood"], status: "allowed", ruleOrder: 3, notes: "Quality animal proteins are Paleo staples" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Vegetables", "Fruits"], status: "allowed", ruleOrder: 4, notes: "Whole vegetables and fruits encouraged" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Nuts & Seeds"], status: "allowed", ruleOrder: 5, notes: "Nuts and seeds allowed on Paleo" },
  { protocolId: PROTOCOL_IDS.PALEO, ruleType: "category", propertyName: null, propertyValues: ["Fats & Oils"], status: "allowed", ruleOrder: 6, notes: "Natural fats encouraged" },

  // ── Low Histamine ───────────────────────────────────────────────────
  { protocolId: PROTOCOL_IDS.LOW_HISTAMINE, ruleType: "property", propertyName: "histamine", propertyValues: ["high"], status: "avoid", ruleOrder: 1, notes: "High histamine foods trigger symptoms" },
  { protocolId: PROTOCOL_IDS.LOW_HISTAMINE, ruleType: "property", propertyName: "histamine", propertyValues: ["moderate"], status: "caution", ruleOrder: 2, notes: "Moderate histamine — test tolerance" },
  { protocolId: PROTOCOL_IDS.LOW_HISTAMINE, ruleType: "property", propertyName: "tyramine", propertyValues: ["high"], status: "avoid", ruleOrder: 4, notes: "Tyramine worsens histamine intolerance" },
  { protocolId: PROTOCOL_IDS.LOW_HISTAMINE, ruleType: "property", propertyName: "histamine", propertyValues: ["low"], status: "allowed", ruleOrder: 5, notes: "Low histamine foods are safe" },
];

// ─── Seed Functions ─────────────────────────────────────────────────────

async function seedFoodCategories() {
  log("Seeding food_categories...");
  for (const name of FOOD_CATEGORIES) {
    await sql`
      INSERT INTO food_categories (name)
      VALUES (${name})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  log(`  -> ${FOOD_CATEGORIES.length} categories`);
}

async function seedFoodSubcategories() {
  log("Seeding food_subcategories...");
  let count = 0;
  for (const [categoryName, subcategories] of Object.entries(FOOD_SUBCATEGORIES)) {
    // Get category id
    const [cat] = await sql`
      SELECT id FROM food_categories WHERE name = ${categoryName}
    `;
    if (!cat) {
      log(`  !! Category not found: ${categoryName}`);
      continue;
    }
    for (const subName of subcategories) {
      await sql`
        INSERT INTO food_subcategories (category_id, name)
        VALUES (${cat.id}, ${subName})
        ON CONFLICT DO NOTHING
      `;
      count++;
    }
  }
  log(`  -> ${count} subcategories`);
}

async function seedFoods() {
  log("Seeding foods and trigger properties...");
  let count = 0;

  for (let i = 0; i < FOODS.length; i++) {
    const food = FOODS[i];

    // Get subcategory id
    const [sub] = await sql`
      SELECT id FROM food_subcategories WHERE name = ${food.subcategory}
    `;
    if (!sub) {
      log(`  !! Subcategory not found: ${food.subcategory} (for ${food.name})`);
      continue;
    }

    // Insert food
    const [inserted] = await sql`
      INSERT INTO foods (display_name, subcategory_id, display_order, is_common)
      VALUES (${food.name}, ${sub.id}, ${i + 1}, ${food.isCommon})
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    // If it was a new insert, also insert trigger properties
    if (inserted) {
      const t = food.trigger;
      await sql`
        INSERT INTO food_trigger_properties (
          food_id, oxalate, histamine, lectin, nightshade, fodmap,
          salicylate, amines, glutamates, sulfites, goitrogens,
          purines, phytoestrogens, phytates, tyramine
        )
        VALUES (
          ${inserted.id},
          ${t.oxalate || "unknown"},
          ${t.histamine || "unknown"},
          ${t.lectin || "unknown"},
          ${t.nightshade ?? false},
          ${t.fodmap || "unknown"},
          ${t.salicylate || "unknown"},
          ${t.amines || "unknown"},
          ${t.glutamates || "unknown"},
          ${t.sulfites || "unknown"},
          ${t.goitrogens || "unknown"},
          ${t.purines || "unknown"},
          ${t.phytoestrogens || "unknown"},
          ${t.phytates || "unknown"},
          ${t.tyramine || "unknown"}
        )
        ON CONFLICT DO NOTHING
      `;
      count++;
    }
  }
  log(`  -> ${count} new foods with trigger properties`);
}

async function seedProtocols() {
  log("Seeding protocols...");
  for (const p of PROTOCOLS) {
    await sql`
      INSERT INTO protocols (id, name, description, category, duration_weeks, has_phases, is_active)
      VALUES (${p.id}, ${p.name}, ${p.description}, ${p.category}, ${p.durationWeeks}, ${p.hasPhases}, true)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  log(`  -> ${PROTOCOLS.length} protocols`);
}

async function seedProtocolPhases() {
  log("Seeding protocol_phases...");
  let count = 0;
  for (const p of PROTOCOL_PHASES) {
    await sql`
      INSERT INTO protocol_phases (id, protocol_id, name, slug, phase_order, duration_weeks, description, guidance)
      VALUES (${p.id}, ${p.protocolId}, ${p.name}, ${p.slug}, ${p.phaseOrder}, ${p.durationWeeks}, ${p.description}, ${p.guidance})
      ON CONFLICT (id) DO NOTHING
    `;
    count++;
  }
  log(`  -> ${count} phases`);
}

async function seedProtocolRules() {
  log("Seeding protocol_rules...");
  let count = 0;
  for (const r of PROTOCOL_RULES) {
    await sql`
      INSERT INTO protocol_rules (protocol_id, rule_type, property_name, property_values, status, rule_order, notes)
      VALUES (${r.protocolId}, ${r.ruleType}, ${r.propertyName}, ${r.propertyValues}, ${r.status}, ${r.ruleOrder}, ${r.notes})
      ON CONFLICT DO NOTHING
    `;
    count++;
  }
  log(`  -> ${count} rules`);
}

async function seedSymptoms() {
  log("Seeding symptoms_database...");
  for (const s of SYMPTOMS) {
    await sql`
      INSERT INTO symptoms_database (name, category, is_common)
      VALUES (${s.name}, ${s.category}, ${s.isCommon})
      ON CONFLICT DO NOTHING
    `;
  }
  log(`  -> ${SYMPTOMS.length} symptoms`);
}

async function seedSupplements() {
  log("Seeding supplements_database...");
  for (const s of SUPPLEMENTS) {
    await sql`
      INSERT INTO supplements_database (name, category, common_dosage)
      VALUES (${s.name}, ${s.category}, ${s.commonDosage})
      ON CONFLICT DO NOTHING
    `;
  }
  log(`  -> ${SUPPLEMENTS.length} supplements`);
}

async function seedMedications() {
  log("Seeding medications_database...");
  for (const m of MEDICATIONS) {
    await sql`
      INSERT INTO medications_database (name, category)
      VALUES (${m.name}, ${m.category})
      ON CONFLICT DO NOTHING
    `;
  }
  log(`  -> ${MEDICATIONS.length} medications`);
}

async function seedDetoxTypes() {
  log("Seeding detox_types...");
  for (const d of DETOX_TYPES) {
    await sql`
      INSERT INTO detox_types (name, category)
      VALUES (${d.name}, ${d.category})
      ON CONFLICT DO NOTHING
    `;
  }
  log(`  -> ${DETOX_TYPES.length} detox types`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  log("Starting seed...");
  log(`Database: ${DATABASE_URL!.replace(/:[^:@]+@/, ":****@")}`);

  try {
    // Check if data already exists (quick sanity check)
    const [{ count }] = await sql`SELECT count(*)::int as count FROM food_categories`;
    if (count > 0) {
      log(`food_categories already has ${count} rows — seeding will skip existing data (ON CONFLICT DO NOTHING).`);
    }

    // Seed in dependency order
    await seedFoodCategories();
    await seedFoodSubcategories();
    await seedFoods();
    await seedProtocols();
    await seedProtocolPhases();
    await seedProtocolRules();
    await seedSymptoms();
    await seedSupplements();
    await seedMedications();
    await seedDetoxTypes();

    log("Seed complete!");
  } catch (error) {
    console.error("[seed] Error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
