"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";

interface ProtocolRule {
  id: string;
  ruleType: string;
  propertyName: string | null;
  propertyValues: string[] | null;
  status: string;
  ruleOrder: number;
  notes: string | null;
}

interface Protocol {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationWeeks: number | null;
  hasPhases: boolean | null;
  isActive: boolean | null;
  rules: ProtocolRule[];
}

const STATUS_COLORS: Record<string, string> = {
  avoid: "bg-danger/10 text-danger-strong",
  moderation: "bg-warning/10 text-warning-strong",
  allowed: "bg-teal-100 text-teal-800",
};

const STATUS_OPTIONS = ["avoid", "moderation", "allowed"];
const RULE_TYPES = ["trigger_level", "food_category", "food_property", "nightshade"];
const PROPERTY_OPTIONS = [
  "oxalate", "histamine", "lectin", "fodmap", "salicylate", "amines",
  "glutamates", "sulfites", "goitrogens", "purines", "phytoestrogens",
  "phytates", "tyramine",
];
const VALUE_OPTIONS = ["low", "moderate", "high", "very_high"];

export default function AdminProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // New protocol form
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [newProtocol, setNewProtocol] = useState({ name: "", description: "", category: "" });

  // Edit protocol
  const [editingProtocol, setEditingProtocol] = useState<string | null>(null);
  const [editProtocolData, setEditProtocolData] = useState({ name: "", description: "", category: "" });

  // New rule form
  const [addingRuleTo, setAddingRuleTo] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    ruleType: "trigger_level",
    propertyName: "",
    propertyValues: [] as string[],
    status: "avoid",
    notes: "",
  });

  // Edit rule
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editRuleData, setEditRuleData] = useState({
    ruleType: "",
    propertyName: "",
    propertyValues: [] as string[],
    status: "",
    notes: "",
  });

  const fetchProtocols = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/protocols");
      const data = await res.json();
      setProtocols(data.protocols);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Protocol CRUD ─────────────────────────────────────────────────

  const handleCreateProtocol = async () => {
    if (!newProtocol.name.trim()) return;
    await fetch("/api/admin/protocols", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_protocol", ...newProtocol }),
    });
    setShowNewProtocol(false);
    setNewProtocol({ name: "", description: "", category: "" });
    fetchProtocols();
  };

  const handleUpdateProtocol = async (id: string) => {
    await fetch("/api/admin/protocols", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_protocol", id, ...editProtocolData }),
    });
    setEditingProtocol(null);
    fetchProtocols();
  };

  const handleDeleteProtocol = async (id: string, name: string) => {
    if (!confirm(`Delete protocol "${name}" and all its rules?`)) return;
    await fetch("/api/admin/protocols", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_protocol", id }),
    });
    fetchProtocols();
  };

  // ── Rule CRUD ─────────────────────────────────────────────────────

  const handleAddRule = async (protocolId: string) => {
    if (!newRule.ruleType || !newRule.status) return;
    await fetch("/api/admin/protocols", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_rule", protocolId, ...newRule }),
    });
    setAddingRuleTo(null);
    setNewRule({ ruleType: "trigger_level", propertyName: "", propertyValues: [], status: "avoid", notes: "" });
    fetchProtocols();
  };

  const handleUpdateRule = async (id: string) => {
    await fetch("/api/admin/protocols", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_rule", id, ...editRuleData }),
    });
    setEditingRule(null);
    fetchProtocols();
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await fetch("/api/admin/protocols", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_rule", id }),
    });
    fetchProtocols();
  };

  const toggleValue = (values: string[], val: string) =>
    values.includes(val) ? values.filter((v) => v !== val) : [...values, val];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-warm-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-warm-900">Protocols and rules</h1>
          <p className="text-sm text-warm-500">{protocols.length} protocols</p>
        </div>
        <button
          onClick={() => setShowNewProtocol(true)}
          className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add Protocol
        </button>
      </div>

      {/* New protocol form */}
      {showNewProtocol && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <h3 className="mb-3 font-semibold text-warm-900">New Protocol</h3>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Name"
              value={newProtocol.name}
              onChange={(e) => setNewProtocol((p) => ({ ...p, name: e.target.value }))}
              className="rounded-md border border-warm-200 px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Category (e.g. elimination)"
              value={newProtocol.category}
              onChange={(e) => setNewProtocol((p) => ({ ...p, category: e.target.value }))}
              className="rounded-md border border-warm-200 px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Description"
              value={newProtocol.description}
              onChange={(e) => setNewProtocol((p) => ({ ...p, description: e.target.value }))}
              className="flex-1 rounded-md border border-warm-200 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreateProtocol} className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">Create</button>
            <button onClick={() => setShowNewProtocol(false)} className="rounded-md border border-warm-300 px-3 py-1.5 text-sm text-warm-600 hover:bg-warm-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {protocols.map((protocol) => {
          const isOpen = expanded.has(protocol.id);
          const isEditingThis = editingProtocol === protocol.id;

          return (
            <div key={protocol.id} className="rounded-lg border border-warm-200 bg-[var(--color-surface-card)]">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggleExpanded(protocol.id)}>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-warm-500" /> : <ChevronRight className="h-4 w-4 text-warm-500" />}
                </button>

                {isEditingThis ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={editProtocolData.name}
                      onChange={(e) => setEditProtocolData((p) => ({ ...p, name: e.target.value }))}
                      className="rounded border border-warm-200 px-2 py-1 text-sm font-semibold"
                    />
                    <input
                      value={editProtocolData.description}
                      onChange={(e) => setEditProtocolData((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Description"
                      className="flex-1 rounded border border-warm-200 px-2 py-1 text-sm"
                    />
                    <button onClick={() => handleUpdateProtocol(protocol.id)} className="rounded p-1 text-teal-600 hover:bg-teal-50"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingProtocol(null)} className="rounded p-1 text-warm-500 hover:bg-warm-50"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => toggleExpanded(protocol.id)} className="flex-1 text-left">
                      <span className="font-semibold text-warm-900">{protocol.name}</span>
                      {protocol.category && (
                        <span className="ml-2 rounded bg-warm-100 px-2 py-0.5 text-xs text-warm-500">{protocol.category}</span>
                      )}
                    </button>
                    <span className="text-sm text-warm-500">{protocol.rules.length} rules</span>
                    <button
                      onClick={() => {
                        setEditingProtocol(protocol.id);
                        setEditProtocolData({ name: protocol.name, description: protocol.description || "", category: protocol.category || "" });
                      }}
                      className="rounded p-1 text-warm-500 hover:bg-warm-50 hover:text-warm-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProtocol(protocol.id, protocol.name)}
                      className="rounded p-1 text-warm-500 hover:bg-danger/10 hover:text-danger-strong"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Rules */}
              {isOpen && (
                <div className="border-t border-warm-100 px-4 py-3">
                  {protocol.description && (
                    <p className="mb-3 text-sm text-warm-600">{protocol.description}</p>
                  )}

                  {protocol.rules.length === 0 ? (
                    <p className="mb-3 text-sm italic text-warm-500">No rules defined</p>
                  ) : (
                    <table className="mb-3 w-full text-sm">
                      <thead>
                        <tr className="border-b border-warm-100">
                          <th className="pb-2 text-left font-medium text-warm-500">Type</th>
                          <th className="pb-2 text-left font-medium text-warm-500">Property</th>
                          <th className="pb-2 text-left font-medium text-warm-500">Values</th>
                          <th className="pb-2 text-left font-medium text-warm-500">Status</th>
                          <th className="pb-2 text-left font-medium text-warm-500">Notes</th>
                          <th className="pb-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {protocol.rules.map((rule) => {
                          if (editingRule === rule.id) {
                            return (
                              <tr key={rule.id} className="border-b border-warm-50 bg-teal-50/50">
                                <td className="py-2 pr-2">
                                  <select value={editRuleData.ruleType} onChange={(e) => setEditRuleData((r) => ({ ...r, ruleType: e.target.value }))} className="rounded border border-warm-200 px-1.5 py-1 text-xs">
                                    {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </td>
                                <td className="py-2 pr-2">
                                  <select value={editRuleData.propertyName} onChange={(e) => setEditRuleData((r) => ({ ...r, propertyName: e.target.value }))} className="rounded border border-warm-200 px-1.5 py-1 text-xs">
                                    <option value="">—</option>
                                    {PROPERTY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </td>
                                <td className="py-2 pr-2">
                                  <div className="flex flex-wrap gap-1">
                                    {VALUE_OPTIONS.map((v) => (
                                      <button
                                        key={v}
                                        onClick={() => setEditRuleData((r) => ({ ...r, propertyValues: toggleValue(r.propertyValues, v) }))}
                                        className={`rounded px-1.5 py-0.5 text-xs ${editRuleData.propertyValues.includes(v) ? "bg-teal-100 text-teal-800 font-medium" : "bg-warm-100 text-warm-500"}`}
                                      >
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2 pr-2">
                                  <select value={editRuleData.status} onChange={(e) => setEditRuleData((r) => ({ ...r, status: e.target.value }))} className="rounded border border-warm-200 px-1.5 py-1 text-xs">
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td className="py-2 pr-2">
                                  <input value={editRuleData.notes} onChange={(e) => setEditRuleData((r) => ({ ...r, notes: e.target.value }))} className="w-full rounded border border-warm-200 px-1.5 py-1 text-xs" />
                                </td>
                                <td className="py-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleUpdateRule(rule.id)} className="rounded p-1 text-teal-600 hover:bg-teal-50"><Check className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setEditingRule(null)} className="rounded p-1 text-warm-500 hover:bg-warm-50"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={rule.id} className="border-b border-warm-50 group">
                              <td className="py-2 text-warm-700">{rule.ruleType}</td>
                              <td className="py-2 text-warm-600">{rule.propertyName || "—"}</td>
                              <td className="py-2">
                                {rule.propertyValues?.map((v) => (
                                  <span key={v} className="mr-1 inline-block rounded bg-warm-100 px-1.5 py-0.5 text-xs text-warm-600">{v}</span>
                                ))}
                              </td>
                              <td className="py-2">
                                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[rule.status] ?? "bg-warm-100 text-warm-600"}`}>
                                  {rule.status}
                                </span>
                              </td>
                              <td className="py-2 text-warm-500">{rule.notes || "—"}</td>
                              <td className="py-2">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingRule(rule.id);
                                      setEditRuleData({
                                        ruleType: rule.ruleType,
                                        propertyName: rule.propertyName || "",
                                        propertyValues: rule.propertyValues || [],
                                        status: rule.status,
                                        notes: rule.notes || "",
                                      });
                                    }}
                                    className="rounded p-1 text-warm-500 hover:bg-warm-50 hover:text-warm-600"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="rounded p-1 text-warm-500 hover:bg-danger/10 hover:text-danger-strong"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Add rule form */}
                  {addingRuleTo === protocol.id ? (
                    <div className="rounded-md border border-teal-200 bg-teal-50/50 p-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-xs font-medium text-warm-500 mb-1">Type</label>
                          <select value={newRule.ruleType} onChange={(e) => setNewRule((r) => ({ ...r, ruleType: e.target.value }))} className="rounded border border-warm-200 px-2 py-1.5 text-sm">
                            {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-warm-500 mb-1">Property</label>
                          <select value={newRule.propertyName} onChange={(e) => setNewRule((r) => ({ ...r, propertyName: e.target.value }))} className="rounded border border-warm-200 px-2 py-1.5 text-sm">
                            <option value="">—</option>
                            {PROPERTY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-warm-500 mb-1">Values</label>
                          <div className="flex gap-1">
                            {VALUE_OPTIONS.map((v) => (
                              <button
                                key={v}
                                onClick={() => setNewRule((r) => ({ ...r, propertyValues: toggleValue(r.propertyValues, v) }))}
                                className={`rounded px-2 py-1 text-xs ${newRule.propertyValues.includes(v) ? "bg-teal-100 text-teal-800 font-medium" : "bg-[var(--color-surface-card)] border border-warm-200 text-warm-500"}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-warm-500 mb-1">Status</label>
                          <select value={newRule.status} onChange={(e) => setNewRule((r) => ({ ...r, status: e.target.value }))} className="rounded border border-warm-200 px-2 py-1.5 text-sm">
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-warm-500 mb-1">Notes</label>
                          <input value={newRule.notes} onChange={(e) => setNewRule((r) => ({ ...r, notes: e.target.value }))} placeholder="Optional" className="w-full rounded border border-warm-200 px-2 py-1.5 text-sm" />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleAddRule(protocol.id)} className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">Add Rule</button>
                        <button onClick={() => setAddingRuleTo(null)} className="rounded-md border border-warm-300 px-3 py-1.5 text-sm text-warm-600 hover:bg-warm-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingRuleTo(protocol.id); setExpanded((prev) => new Set(prev).add(protocol.id)); }}
                      className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Rule
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
