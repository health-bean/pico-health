"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Loader2,
  Columns3,
  BadgeCheck,
  Inbox,
  ListX,
} from "lucide-react";
import { TriggerCell } from "@/components/admin/trigger-cell";
import { Badge, Button, Dialog, EmptyState, Tabs, useToast } from "@/components/ui";

type SourceEntry =
  | string
  | { name?: string; title?: string; citation?: string; url?: string };

type ReviewStatus =
  | "unreviewed"
  | "ai_proposed"
  | "founder_set"
  | "practitioner_reviewed";

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
  sources?: Record<string, SourceEntry> | null;
  reviewStatus?: ReviewStatus | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CurationQueue {
  missingProperties: {
    foodId: string;
    displayName: string;
    source: string;
    logCount: number;
  }[];
  unmatchedNames: { name: string; logCount: number }[];
  unreviewed: {
    founder_set: number;
    ai_proposed: number;
    unreviewed: number;
  };
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

/** The 6 properties with real data today; the rest hide behind the toggle. */
const CORE_COLUMN_COUNT = 6;

const LEVEL_OPTIONS = ["unknown", "low", "moderate", "high", "very_high"];
const FODMAP_OPTIONS = ["unknown", "low", "moderate", "high"];

const COLUMNS_STORAGE_KEY = "pico-admin-foods-all-columns";
const REVIEWER_STORAGE_KEY = "pico-admin-reviewer-name";

function formatSource(entry: SourceEntry | undefined | null): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  const parts = [entry.name, entry.title ?? entry.citation].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  if (parts.length > 0) return parts.join(" — ");
  return null;
}

function sourceForProperty(food: FoodRow, property: string): string | null {
  const sources = food.sources;
  if (!sources || typeof sources !== "object") return null;
  return formatSource(sources[property]) ?? formatSource(sources["default"]);
}

function ReviewStatusPill({ food }: { food: FoodRow }) {
  const status: ReviewStatus = food.reviewStatus ?? "unreviewed";
  const title = food.reviewedAt
    ? `Reviewed ${new Date(food.reviewedAt).toLocaleString()}`
    : undefined;

  if (status === "practitioner_reviewed") {
    return (
      <span title={title}>
        <Badge variant="allowed" className="whitespace-nowrap">
          Reviewed{food.reviewedBy ? ` · ${food.reviewedBy}` : ""}
        </Badge>
      </span>
    );
  }
  if (status === "ai_proposed") {
    return (
      <span title={title}>
        <Badge variant="info" className="whitespace-nowrap">AI-proposed</Badge>
      </span>
    );
  }
  return (
    <span title={title}>
      <Badge variant="default" className="whitespace-nowrap">
        {status === "founder_set" ? "Uncited" : "Unreviewed"}
      </Badge>
    </span>
  );
}

export default function AdminFoodsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"foods" | "curation">("foods");
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAllColumns, setShowAllColumns] = useState(false);
  const [queue, setQueue] = useState<CurationQueue | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<FoodRow | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    try {
      setShowAllColumns(localStorage.getItem(COLUMNS_STORAGE_KEY) === "true");
      setReviewerName(localStorage.getItem(REVIEWER_STORAGE_KEY) ?? "");
    } catch {
      // localStorage unavailable — keep defaults
    }
  }, []);

  const toggleColumns = () => {
    setShowAllColumns((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLUMNS_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const visibleColumns = showAllColumns
    ? TRIGGER_COLUMNS
    : TRIGGER_COLUMNS.slice(0, CORE_COLUMN_COUNT);

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

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(false);
    try {
      const res = await fetch("/api/admin/foods/curation-queue");
      if (!res.ok) {
        setQueueError(true);
        return;
      }
      setQueue(await res.json());
    } catch (err) {
      console.error("Failed to fetch curation queue:", err);
      setQueueError(true);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "curation" && !queue && !queueLoading && !queueError) {
      fetchQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleUpdate = async (
    foodId: string,
    property: string,
    value: string | boolean
  ) => {
    // Optimistic update
    setFoods((prev) =>
      prev.map((f) => (f.id === foodId ? { ...f, [property]: value } : f))
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

  const handleMarkReviewed = async () => {
    if (!reviewTarget || !reviewerName.trim()) return;
    const food = reviewTarget;
    const name = reviewerName.trim();
    const previous = foods;

    try {
      localStorage.setItem(REVIEWER_STORAGE_KEY, name);
    } catch {
      // ignore
    }

    setReviewSubmitting(true);
    // Optimistic update
    setFoods((prev) =>
      prev.map((f) =>
        f.id === food.id
          ? {
              ...f,
              reviewStatus: "practitioner_reviewed" as ReviewStatus,
              reviewedBy: name,
              reviewedAt: new Date().toISOString(),
            }
          : f
      )
    );

    try {
      const res = await fetch(`/api/admin/foods/${food.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedBy: name }),
      });
      if (!res.ok) throw new Error(`Review failed (${res.status})`);
      setReviewTarget(null);
    } catch (err) {
      console.error("Failed to mark reviewed:", err);
      setFoods(previous);
      toast(`Could not mark "${food.displayName}" as reviewed`, "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900">
          Foods & Trigger Properties
        </h1>
        <p className="text-sm text-warm-500">
          {foods.length} foods &middot; Click any cell to edit
        </p>
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { value: "foods", label: "Foods" },
            { value: "curation", label: "Needs curation", icon: Inbox },
          ]}
          value={view}
          onChange={(v) => setView(v as "foods" | "curation")}
        />
      </div>

      {view === "foods" ? (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
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
            <Button
              variant={showAllColumns ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleColumns}
              aria-pressed={showAllColumns}
              className="min-h-[44px]"
            >
              <Columns3 className="h-4 w-4" />
              All 14 properties
            </Button>
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
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-1.5 py-2 text-center font-medium text-warm-500"
                        title={col.key}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left font-medium text-warm-500">
                      Review
                    </th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((food, i) => (
                    <tr
                      key={food.id}
                      className={
                        i % 2 === 0
                          ? "bg-[var(--color-surface-card)]"
                          : "bg-warm-25"
                      }
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-1.5 font-medium text-warm-900">
                        {food.displayName}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-warm-500">
                        {food.subcategoryName}
                      </td>
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-0.5 py-0.5">
                          <TriggerCell
                            value={
                              food[col.key as keyof FoodRow] as
                                | string
                                | boolean
                                | null
                            }
                            property={col.key}
                            source={sourceForProperty(food, col.key)}
                            options={
                              col.key === "nightshade"
                                ? ["false", "true"]
                                : col.key === "fodmap"
                                  ? FODMAP_OPTIONS
                                  : LEVEL_OPTIONS
                            }
                            onChange={(val) => {
                              const finalVal =
                                col.key === "nightshade"
                                  ? val === "true"
                                  : val;
                              handleUpdate(food.id, col.key, finalVal);
                            }}
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <ReviewStatusPill food={food} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1">
                        {food.reviewStatus !== "practitioner_reviewed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReviewTarget(food)}
                          >
                            <BadgeCheck className="h-4 w-4" />
                            Mark reviewed
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div>
          {queueLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-warm-400" />
            </div>
          ) : queueError || !queue ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="Curation queue unavailable"
              description="The curation queue endpoint didn't respond. It may not be deployed yet."
              action={{ label: "Retry", onClick: fetchQueue }}
            />
          ) : (
            <div className="space-y-8">
              <p className="text-sm text-warm-500">
                {queue.unreviewed.founder_set} uncited &middot;{" "}
                {queue.unreviewed.ai_proposed} AI-proposed &middot;{" "}
                {queue.unreviewed.unreviewed} unreviewed
              </p>

              {/* Foods missing properties */}
              <section>
                <h2 className="mb-2 text-sm font-semibold text-warm-700">
                  Foods missing properties
                </h2>
                {queue.missingProperties.length === 0 ? (
                  <EmptyState
                    icon={<BadgeCheck className="h-6 w-6" />}
                    title="No foods missing properties"
                    description="Every logged food has trigger properties."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-warm-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-warm-200 bg-warm-50">
                          <th className="px-3 py-2 text-left font-medium text-warm-700">
                            Food
                          </th>
                          <th className="px-2 py-2 text-left font-medium text-warm-500">
                            Source
                          </th>
                          <th className="px-2 py-2 text-right font-medium text-warm-500">
                            Logs
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {queue.missingProperties.map((row, i) => (
                          <tr
                            key={row.foodId}
                            className={
                              i % 2 === 0
                                ? "bg-[var(--color-surface-card)]"
                                : "bg-warm-25"
                            }
                          >
                            <td className="whitespace-nowrap px-3 py-1.5 font-medium text-warm-900">
                              {row.displayName}
                            </td>
                            <td className="px-2 py-1.5">
                              <Badge
                                variant={
                                  row.source === "curated" ? "info" : "default"
                                }
                              >
                                {row.source}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-right text-warm-500">
                              {row.logCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Unmatched logged names */}
              <section>
                <h2 className="mb-2 text-sm font-semibold text-warm-700">
                  Unmatched logged names
                </h2>
                {queue.unmatchedNames.length === 0 ? (
                  <EmptyState
                    icon={<ListX className="h-6 w-6" />}
                    title="No unmatched names"
                    description="Every logged name matched a known food."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-warm-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-warm-200 bg-warm-50">
                          <th className="px-3 py-2 text-left font-medium text-warm-700">
                            Logged name
                          </th>
                          <th className="px-2 py-2 text-right font-medium text-warm-500">
                            Logs
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {queue.unmatchedNames.map((row, i) => (
                          <tr
                            key={row.name}
                            className={
                              i % 2 === 0
                                ? "bg-[var(--color-surface-card)]"
                                : "bg-warm-25"
                            }
                          >
                            <td className="whitespace-nowrap px-3 py-1.5 font-medium text-warm-900">
                              {row.name}
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-right text-warm-500">
                              {row.logCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {/* Mark reviewed dialog */}
      <Dialog
        open={reviewTarget !== null}
        onClose={() => {
          if (!reviewSubmitting) setReviewTarget(null);
        }}
        title="Mark as reviewed"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleMarkReviewed();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-warm-500">
            Confirm that a practitioner has reviewed the trigger properties for{" "}
            <span className="font-medium text-warm-900">
              {reviewTarget?.displayName}
            </span>
            .
          </p>
          <div>
            <label
              htmlFor="reviewer-name"
              className="mb-1 block text-sm font-medium text-warm-700"
            >
              Reviewer name
            </label>
            <input
              id="reviewer-name"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g. Dee Byrne"
              className="w-full rounded-md border border-warm-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setReviewTarget(null)}
              disabled={reviewSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={reviewSubmitting}
              disabled={!reviewerName.trim()}
            >
              Mark reviewed
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
