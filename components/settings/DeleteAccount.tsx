"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button, Dialog, Input } from "@/components/ui";
import { GRACE_DAYS } from "@/lib/account/deletion";

type Stage = "idle" | "confirm" | "scheduled";

/**
 * Deleting an account is the one thing here that cannot be undone, so it is
 * paced: type the word, take the export if you want it, then the account is
 * scheduled and signing back in within the grace period brings it back.
 * Anyone who wants it gone now can say so on the last screen.
 */
export function DeleteAccount() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [purgeOpen, setPurgeOpen] = useState(false);

  const canConfirm = typed.trim().toUpperCase() === "DELETE";

  function close() {
    setStage("idle");
    setTyped("");
    setError("");
    setPurgeOpen(false);
  }

  async function schedule() {
    if (!canConfirm) return;
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/deletion", { method: "POST" });
      if (!res.ok) throw new Error();
      setStage("scheduled");
    } catch {
      setError("Couldn't schedule that. Try again, or write to support@picohealth.app.");
    } finally {
      setWorking(false);
    }
  }

  async function purgeNow() {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/deletion?now=1", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/login");
    } catch {
      setError("Couldn't delete that. Try again, or write to support@picohealth.app.");
      setWorking(false);
    }
  }

  return (
    <>
      <Button variant="outline-danger" onClick={() => setStage("confirm")}>
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Delete my account
      </Button>

      <Dialog open={stage === "confirm"} onClose={close} title="Delete your account?" size="sm">
        <div className="flex flex-col gap-3 text-sm text-warm-700">
          <p>
            This removes your profile and everything you have logged: entries, reflections,
            reintroductions, and the patterns built from them.
          </p>
          <p>
            We keep it for {GRACE_DAYS} days first. Sign back in within that time and your
            account comes back exactly as it was. After that it is gone for good.
          </p>
          <a
            href="/api/export?type=all"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-teal-300 px-4 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download my data first
          </a>
          <Input
            label="Type DELETE to confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder="DELETE"
          />
          {error && (
            <p role="alert" className="text-sm text-danger-strong">
              {error}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} className="w-full sm:w-auto">
            Keep my account
          </Button>
          <Button
            variant="outline-danger"
            onClick={schedule}
            loading={working}
            disabled={!canConfirm}
            className="w-full sm:w-auto"
          >
            Delete my account
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={stage === "scheduled"}
        onClose={() => router.push("/login")}
        title="Your account is scheduled for deletion"
        size="sm"
      >
        <div className="flex flex-col gap-3 text-sm text-warm-700">
          <p>
            Nothing is lost yet. You have {GRACE_DAYS} days to change your mind: sign back in
            and everything is restored. After that it is deleted permanently.
          </p>
          <p>If you would rather not wait, you can delete it for good right now.</p>
          {error && (
            <p role="alert" className="text-sm text-danger-strong">
              {error}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => router.push("/login")} className="w-full sm:w-auto">
            Done
          </Button>
          <Button variant="outline-danger" onClick={() => setPurgeOpen(true)} className="w-full sm:w-auto">
            Delete permanently now
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        title="Delete permanently, with no way back?"
        size="sm"
      >
        <p className="text-sm text-warm-700">
          This skips the {GRACE_DAYS}-day window. Your account and everything in it are removed
          straight away and cannot be restored.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setPurgeOpen(false)} className="w-full sm:w-auto">
            Keep the {GRACE_DAYS} days
          </Button>
          <Button variant="danger" onClick={purgeNow} loading={working} className="w-full sm:w-auto">
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}
