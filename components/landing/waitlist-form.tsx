"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { LANDING } from "@/lib/landing-content";

interface WaitlistFormProps {
  /** Referral code from the URL (?ref=seattle); validated again on the server. */
  refCode?: string;
  /** "dark" sits on the teal band, "light" on the cream page. */
  tone?: "dark" | "light";
  id?: string;
}

export function WaitlistForm({ refCode, tone = "light", id }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const dark = tone === "dark";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ref: refCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className={cn(
          "rounded-2xl px-5 py-4 text-base font-semibold",
          dark ? "bg-teal-800 text-gold-400" : "bg-teal-50 text-teal-800"
        )}
      >
        {LANDING.join.success}
      </p>
    );
  }

  const inputId = `${id ?? "waitlist"}-email`;
  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "min-h-[48px] flex-1 rounded-full border px-5 text-base outline-none transition focus-visible:ring-2",
            dark
              ? "border-teal-700 bg-teal-800 text-white placeholder:text-teal-200 focus-visible:ring-gold-400"
              : "border-warm-300 bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-teal-500"
          )}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className={cn(
            "min-h-[48px] rounded-full px-6 text-base font-bold transition disabled:opacity-60",
            dark
              ? "bg-gold-400 text-teal-900 hover:brightness-95"
              : "bg-teal-700 text-white hover:bg-teal-800"
          )}
        >
          {status === "sending" ? "Joining…" : LANDING.join.button}
        </button>
      </div>
      {error ? (
        <p role="alert" className={cn("mt-2 text-sm", dark ? "text-gold-400" : "text-danger-strong")}>
          {error}
        </p>
      ) : (
        <p className={cn("mt-2 text-sm", dark ? "text-teal-200" : "text-[var(--color-text-muted)]")}>
          {LANDING.join.privacy}
        </p>
      )}
    </form>
  );
}
