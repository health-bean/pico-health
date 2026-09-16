"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select, Spinner, Progress, PageTitle } from "@/components/ui";
import { useSession } from "@/hooks/use-session";
import Link from "next/link";
import { ChevronRight, CreditCard, Download, FlaskConical } from "lucide-react";
import type { Protocol } from "@/types";

interface SubscriptionInfo {
  tier: string;
  status: string;
  features: string[];
  limits: Record<string, unknown>;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface PhaseState {
  protocolName?: string;
  currentPhase?: {
    name: string;
    phaseOrder: number;
    totalPhases: number;
    dayNumber: number;
    daysRemaining: number | null;
    durationWeeks: number | null;
  } | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  // The protocol actually stored on the profile. null until loaded, so an
  // unloaded select can never be saved over the real value.
  const [savedProtocolId, setSavedProtocolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProtocols, setLoadingProtocols] = useState(true);
  const [phaseState, setPhaseState] = useState<PhaseState | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Fetch subscription info
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/billing/subscription");
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      } catch {
        // billing not set up yet — that's fine
      }
    }
    fetchSubscription();
  }, []);

  async function handleManageBilling() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // ignore
    } finally {
      setBillingLoading(false);
    }
  }

  // Fetch available protocols
  useEffect(() => {
    async function fetchProtocols() {
      try {
        const res = await fetch("/api/protocols");
        if (res.ok) {
          const data = await res.json();
          setProtocols(data.protocols ?? []);
        }
      } catch (err) {
        console.error("Failed to load protocols:", err);
      } finally {
        setLoadingProtocols(false);
      }
    }

    fetchProtocols();
  }, []);

  // Fetch protocol phase state
  useEffect(() => {
    async function fetchPhaseState() {
      try {
        const res = await fetch("/api/protocols/state");
        if (res.ok) {
          const data = await res.json();
          if (data.states && data.states.length > 0) {
            setPhaseState(data.states[0]);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchPhaseState();
  }, [saved]);

  // Load the stored protocol from the profile. The session payload does not
  // carry it; reading it from there showed "No protocol selected" to every
  // user and let Save write null over their real protocol.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const id: string = data.user?.currentProtocolId ?? "";
        setSavedProtocolId(id);
        setSelectedProtocolId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const protocolLoaded = savedProtocolId !== null;
  const protocolChanged = protocolLoaded && selectedProtocolId !== savedProtocolId;

  async function handleSaveProtocol() {
    if (!protocolChanged) return;
    setSaving(true);
    setSaved(false);
    try {
      // Save to user profile
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentProtocolId: selectedProtocolId || null }),
      });

      if (res.ok) {
        setSavedProtocolId(selectedProtocolId);
        // Also initialize protocol state if the protocol has phases
        const selectedProtocol = protocols.find((p) => p.id === selectedProtocolId);
        if (selectedProtocol?.hasPhases && selectedProtocolId) {
          await fetch("/api/protocols/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ protocolId: selectedProtocolId }),
          });
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save protocol:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdvancePhase() {
    if (!selectedProtocolId) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/protocols/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: selectedProtocolId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.context) {
          setPhaseState({
            protocolName: data.context.protocolName,
            currentPhase: data.context.currentPhase,
          });
        }
      }
    } catch (err) {
      console.error("Failed to advance phase:", err);
    } finally {
      setAdvancing(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const selectedProtocol = protocols.find((p) => p.id === selectedProtocolId);
  const phase = phaseState?.currentPhase;

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageTitle className="mb-6">Settings</PageTitle>

      {/* Protocol section */}
      <Card header="Protocol" className="mb-4">
        {loadingProtocols || !protocolLoaded ? (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-sm text-warm-500">Loading protocols...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              label="Active protocol"
              value={selectedProtocolId}
              onChange={(val) => {
                setSelectedProtocolId(val);
                setSaved(false);
              }}
              placeholder="No protocol selected"
              options={protocols.map((p) => ({ value: p.id, label: p.name }))}
            />

            {selectedProtocol && (
              <p className="text-sm text-warm-500">
                {selectedProtocol.description}
              </p>
            )}

            {/* Phase display */}
            {phase && (
              <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-teal-900">
                      {phase.name}
                    </p>
                    <p className="text-xs text-teal-600">
                      Phase {phase.phaseOrder} of {phase.totalPhases}
                      {phase.durationWeeks && (
                        <> &middot; Day {phase.dayNumber} of {phase.durationWeeks * 7}</>
                      )}
                      {phase.daysRemaining !== null && phase.daysRemaining > 0 && (
                        <> &middot; {phase.daysRemaining} days remaining</>
                      )}
                    </p>
                  </div>
                  {phase.phaseOrder < (phase.totalPhases ?? 0) && (
                    <Button
                      onClick={handleAdvancePhase}
                      loading={advancing}
                      size="sm"
                      variant="secondary"
                    >
                      Next phase
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {/* Progress bar */}
                {phase.durationWeeks && (
                  <div className="mt-2">
                    <Progress
                      value={Math.min(100, (phase.dayNumber / (phase.durationWeeks * 7)) * 100)}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )}

            {(protocolChanged || saving || saved) && (
              <div className="flex items-center gap-3" role="status" aria-live="polite">
                {(protocolChanged || saving) && (
                  <Button onClick={handleSaveProtocol} loading={saving}>
                    Save protocol
                  </Button>
                )}
                {saved && !protocolChanged && (
                  <span className="text-sm text-teal-700">Protocol updated</span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Account section */}
      <Card header="Account" className="mb-4">
        {user ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-warm-500">Name</p>
              <p className="text-sm font-medium text-warm-900">
                {user.firstName}
              </p>
            </div>
            <div>
              <p className="text-xs text-warm-500">Email</p>
              <p className="text-sm font-medium text-warm-900">
                {user.email}
              </p>
            </div>
            <div className="pt-1">
              <Button variant="outline" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-warm-500">Not signed in</p>
        )}
      </Card>

      {/* Reintroductions */}
      <Card className="mb-4">
        <Link
          href="/reintroductions"
          className="flex min-h-11 items-center justify-between gap-3 -m-1 p-1 rounded-md transition-colors hover:bg-[var(--color-surface)]"
        >
          <span className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <span>
              <span className="block text-sm font-medium text-warm-900">Reintroductions</span>
              <span className="block text-xs text-warm-500">Test foods back in and record how you react</span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-warm-500" />
        </Link>
      </Card>

      {/* Your data */}
      <Card header="Your data" className="mb-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-warm-600">
            Download everything you have logged, to keep or to bring to an appointment.
          </p>
          <div>
            <a
              href="/api/export?type=all"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-300 px-4 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export my data
            </a>
          </div>
        </div>
      </Card>

      {/* Billing */}
      <Card header="Subscription" className="mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">
                {subscription?.tier ?? "Free"} Plan
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {subscription?.tier === "free"
                  ? "Everything is included while Pico Health is in early access."
                  : subscription?.cancelAtPeriodEnd
                    ? "Cancels at end of period"
                    : `Active${subscription?.currentPeriodEnd ? ` · Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ""}`}
              </p>
            </div>
          </div>

          {subscription?.tier === "free" ? null : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              loading={billingLoading}
            >
              Manage Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Legal */}
      <Card header="About" className="mb-4">
        <div className="flex flex-col text-sm">
          <Link href="/terms" className="flex min-h-11 items-center text-teal-700 hover:text-teal-800">
            Terms of Service
          </Link>
          <Link href="/privacy" className="flex min-h-11 items-center text-teal-700 hover:text-teal-800">
            Privacy Policy
          </Link>
          <a href="mailto:support@picohealth.app" className="flex min-h-11 items-center text-teal-700 hover:text-teal-800">
            Contact support
          </a>
        </div>
      </Card>

    </div>
  );
}
