"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { TriggerCell } from "@/components/admin/trigger-cell";

interface FoodRow {
  id: string;
  displayName: string;
  isCommon: boolean;
  categoryName: string;
  subcategoryName: string;
  categoryId: string;
  oxalate: string | null;
  histamine: string | null;
  lectin: string | null;
  nightshade: boolean | null;
  fodmap: string | null;
  salicylate: string | null;
  amines: string | null;
  glutamates: string | null;
  sulfites: string | null;
  goitrogens: string | null;
  purines: string | null;
  phytoestrogens: string | null;
  phytates: string | null;
  tyramine: string | null;
}

interface Category {
  id: string;
  name: string;
}

const TRIGGER_COLUMNS = [
  { key: "oxalate", label: "Oxal" },
  { key: "histamine", label: "Hist" },
  { key: "lectin", label: "Lect" },
  { key: "fodmap", label: "FOD" },
  { key: "nightshade", label: "Nigh" },
  { key: "salicylate", label: "Sal" },
  { key: "amines", label: "Ami" },
  { key: "glutamates", label: "Glut" },
  { key: "sulfites", label: "Sulf" },
  { key: "goitrogens", label: "Goit" },
  { key: "purines", label: "Pur" },
  { key: "phytoestrogens", label: "Phyt" },
  { key: "phytates", label: "Phta" },
  { key: "tyramine", label: "Tyr" },
] as const;

const LEVEL_OPTIONS = ["unknown", "low", "moderate", "high", "very_high"];
const FODMAP_OPTIONS = ["unknown", "low", "moderate", "high"];

export default function AdminFoodsPage() {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/foods?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setFoods(data.foods ?? []);
      setCategories(data.categories ?? []);
    } catch (err) {
      console.error("Failed to fetch foods:", err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchFoods, 300);
    return () => clearTimeout(timeout);
  }, [fetchFoods]);

  const handleUpdate = async (
    foodId: string,
    property: string,
    value: string | boolean
  ) => {
    // Optimistic update
    setFoods((prev) =>
      prev.map((f) =>
        f.id === foodId ? { ...f, [property]: value } : f
      )
    );

    try {
      await fetch("/api/admin/foods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId, property, value }),
      });
    } catch (err) {
      console.error("Failed to update:", err);
      fetchFoods(); // Revert on error
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900">Foods & Trigger Properties</h1>
        <p className="text-sm text-warm-500">
          {foods.length} foods &middot; Click any cell to edit
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search foods..."
            className="w-full rounded-md border border-warm-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none rounded-md border border-warm-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-warm-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50">
                <th className="sticky left-0 z-10 bg-warm-50 px-3 py-2 text-left font-medium text-warm-700">
                  Food
                </th>
                <th className="px-2 py-2 text-left font-medium text-warm-500">
                  Category
                </th>
                {TRIGGER_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-1.5 py-2 text-center font-medium text-warm-500"
                    title={col.key}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {foods.map((food, i) => (
                <tr
                  key={food.id}
                  className={i % 2 === 0 ? "bg-[var(--color-surface-card)]" : "bg-warm-25"}
                >
                  <td className="sticky left-0 z-10 bg-inherit whitespace-nowrap px-3 py-1.5 font-medium text-warm-900">
                    {food.displayName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-warm-500">
                    {food.subcategoryName}
                  </td>
                  {TRIGGER_COLUMNS.map((col) => (
                    <td key={col.key} className="px-0.5 py-0.5">
                      <TriggerCell
                        value={food[col.key as keyof FoodRow] as string | boolean | null}
                        property={col.key}
                        options={
                          col.key === "nightshade"
                            ? ["false", "true"]
                            : col.key === "fodmap"
                              ? FODMAP_OPTIONS
                              : LEVEL_OPTIONS
                        }
                        onChange={(val) => {
                          const finalVal =
                            col.key === "nightshade" ? val === "true" : val;
                          handleUpdate(food.id, col.key, finalVal);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
