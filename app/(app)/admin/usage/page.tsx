"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  estCostUsd: number;
  unknownModelRequests: number;
}

interface TaskRow {
  task: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number | null;
}

interface UserRow {
  userId: string;
  email: string | null;
  requests: number;
  estCostUsd: number;
}

interface DayRow {
  date: string;
  requests: number;
  estCostUsd: number;
}

interface UsageData {
  totals: UsageTotals;
  byTask: TaskRow[];
  byUser: UserRow[];
  byDay: DayRow[];
}

const RANGES = [7, 30, 90] as const;

function formatCost(usd: number | null): string {
  if (usd === null) return "—";
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

export default function AdminUsagePage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      setError("Could not load usage data.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-warm-900">AI Usage</h1>
          <p className="text-sm text-warm-500">
            Token spend and cost per user, last {days} days
          </p>
        </div>
        <div className="flex rounded-lg border border-warm-200 bg-warm-50 p-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={cn(
                "h-11 min-w-[44px] rounded-md px-4 text-sm font-medium transition-colors",
                days === range
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-warm-600 hover:text-warm-900"
              )}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-400" />
        </div>
      ) : error || !data ? (
        <div className="rounded-lg border border-warm-200 bg-warm-50 px-4 py-10 text-center text-sm text-warm-600">
          {error ?? "Could not load usage data."}
        </div>
      ) : data.totals.requests === 0 ? (
        <div className="rounded-lg border border-warm-200 bg-warm-50 px-4 py-10 text-center text-sm text-warm-600">
          No AI usage recorded yet — rows appear as soon as someone chats or
          captures.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Est. cost" value={formatCost(data.totals.estCostUsd)} />
            <StatTile label="Requests" value={formatTokens(data.totals.requests)} />
            <StatTile label="Input tokens" value={formatTokens(data.totals.inputTokens)} />
            <StatTile label="Output tokens" value={formatTokens(data.totals.outputTokens)} />
          </div>

          {data.totals.unknownModelRequests > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {formatTokens(data.totals.unknownModelRequests)} request
              {data.totals.unknownModelRequests === 1 ? "" : "s"} used a model
              with no known pricing and are excluded from cost estimates.
            </p>
          )}

          <Section title="Cost by task">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-warm-200 bg-warm-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-warm-600">Task</th>
                  <th className="px-4 py-3 font-medium text-warm-600">Model</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Requests</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Tokens in</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Tokens out</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {data.byTask.map((row) => (
                  <tr key={`${row.task}-${row.model}`} className="hover:bg-warm-50">
                    <td className="px-4 py-3 font-medium text-warm-900">{row.task}</td>
                    <td className="px-4 py-3 text-warm-600">
                      {row.estCostUsd === null ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {row.model} — unknown model
                        </span>
                      ) : (
                        row.model
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-warm-600">
                      {formatTokens(row.requests)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-warm-600">
                      {formatTokens(row.inputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-warm-600">
                      {formatTokens(row.outputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-warm-900">
                      {formatCost(row.estCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Cost per user" subtitle="Top 25 by estimated cost">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-warm-200 bg-warm-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-warm-600">User</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Requests</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {data.byUser.map((row) => (
                  <tr key={row.userId} className="hover:bg-warm-50">
                    <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-warm-900">
                      {row.email ?? row.userId}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-warm-600">
                      {formatTokens(row.requests)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-warm-900">
                      {formatCost(row.estCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Daily cost">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-warm-200 bg-warm-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-warm-600">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Requests</th>
                  <th className="px-4 py-3 text-right font-medium text-warm-600">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {data.byDay.map((row) => (
                  <tr key={row.date} className="hover:bg-warm-50">
                    <td className="px-4 py-3 tabular-nums text-warm-900">{row.date}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-warm-600">
                      {formatTokens(row.requests)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-warm-900">
                      {formatCost(row.estCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <p className="text-xs text-warm-500">
            Estimates from Anthropic list pricing; cache reads billed at 10% of
            input rate.
          </p>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-warm-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-warm-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-warm-900">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-warm-900">{title}</h2>
        {subtitle && <p className="text-xs text-warm-500">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-warm-200">
        {children}
      </div>
    </section>
  );
}
