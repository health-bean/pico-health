"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, useToast } from "@/components/ui";

interface Person {
  id: string;
  email: string;
  ref: string | null;
  createdAt: string;
  invitedAt: string | null;
  hasAccount: boolean;
}

const SIGNUP_URL = "https://picohealth.app/signup";

function inviteMessage(email: string) {
  return `You're invited to try Pico Health! Create your account at ${SIGNUP_URL} using ${email} (or "Continue with Google" with that address).`;
}

async function fetchPeople(): Promise<Person[]> {
  const res = await fetch("/api/admin/early-access");
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).people;
}

export default function EarlyAccessPage() {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [justInvited, setJustInvited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(
    () =>
      fetchPeople()
        .then(setPeople)
        .catch(() => toast("Could not load the early-access list", "error")),
    [toast]
  );

  useEffect(() => {
    let cancelled = false;
    fetchPeople()
      .then((rows) => !cancelled && setPeople(rows))
      .catch(() => !cancelled && toast("Could not load the early-access list", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const invite = async (address: string) => {
    setBusy(address);
    try {
      const res = await fetch("/api/admin/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const field = data?.details?.fieldErrors?.email?.[0];
        return toast(field || data?.error || "Could not invite", "error");
      }
      setJustInvited(data.person.email);
      setCopied(false);
      setEmail("");
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast("Couldn't copy; select the text instead", "error");
    }
  };

  const waiting = people.filter((p) => !p.invitedAt).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-warm-900">
          Early access
        </h1>
        <p className="text-sm text-warm-500">
          Sign-up is invite-only. Only invited emails can create an account; existing accounts are not affected.
        </p>
      </div>

      <Card>
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            invite(email);
          }}
        >
          <div className="flex-1">
            <Input
              id="invite-email"
              label="Invite by email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <Button type="submit" disabled={busy !== null}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite
          </Button>
        </form>

        {justInvited && (
          <div className="mt-4 space-y-2 rounded-xl bg-teal-50 p-4" role="status">
            <p className="text-sm font-medium text-teal-800">
              {justInvited} is invited. Pico doesn&apos;t email invites yet, so send them this:
            </p>
            <p className="select-all text-sm text-warm-800">{inviteMessage(justInvited)}</p>
            <Button size="sm" variant="outline" onClick={() => copy(inviteMessage(justInvited))}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy message"}
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-500" aria-label="Loading" />
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" aria-hidden="true" />}
          title="No one on the list yet"
          description="People who join from the landing page show up here."
        />
      ) : (
        <div>
          <p className="mb-2 text-sm text-warm-500">
            {people.length} on the list · {waiting} waiting for an invite
          </p>
          <div className="overflow-x-auto rounded-xl border border-warm-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-50 text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {people.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-warm-800">{p.email}</td>
                    <td className="px-4 py-3 tabular-nums text-warm-600">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-warm-600">{p.ref ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.hasAccount ? (
                        <Badge variant="allowed">Has account</Badge>
                      ) : p.invitedAt ? (
                        <Badge variant="info">Invited {new Date(p.invitedAt).toLocaleDateString()}</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => invite(p.email)}>
                          Invite
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
