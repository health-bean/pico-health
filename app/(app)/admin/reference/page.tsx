"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type TableName = "symptoms" | "supplements" | "medications" | "detox_types";

interface RefItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  commonDosage?: string | null;
  isCommon?: boolean | null;
}

const TABS: { key: TableName; label: string }[] = [
  { key: "symptoms", label: "Symptoms" },
  { key: "supplements", label: "Supplements" },
  { key: "medications", label: "Medications" },
  { key: "detox_types", label: "Detox Types" },
];

export default function AdminReferencePage() {
  const [activeTab, setActiveTab] = useState<TableName>("symptoms");
  const [items, setItems] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reference?table=${activeTab}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Group by category
  const grouped = items.reduce<Record<string, RefItem[]>>((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900">Reference Data</h1>
        <p className="text-sm text-warm-500">
          Symptoms, supplements, medications, and detox types
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-warm-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--color-surface-card)] text-warm-900 shadow-[var(--shadow-card)]"
                : "text-warm-500 hover:text-warm-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="mb-2 text-sm font-semibold text-warm-500 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="rounded-lg border border-warm-200 bg-[var(--color-surface-card)]">
                  <table className="w-full text-sm">
                    <tbody>
                      {categoryItems.map((item, i) => (
                        <tr
                          key={item.id}
                          className={
                            i < categoryItems.length - 1
                              ? "border-b border-warm-100"
                              : ""
                          }
                        >
                          <td className="px-4 py-2.5 font-medium text-warm-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-warm-500">
                            {item.description || "—"}
                          </td>
                          {item.commonDosage !== undefined && (
                            <td className="px-4 py-2.5 text-warm-500">
                              {item.commonDosage || "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
