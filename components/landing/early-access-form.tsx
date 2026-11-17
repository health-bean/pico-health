"use client";

import { useState } from "react";
import { LANDING_FORM } from "@/lib/landing-content";

export function EarlyAccessForm({
  id,
  tone = "dark",
  refCode,
}: {
  /** Unique per form on the page, so each input keeps its own label. */
  id: string;
  /** Both forms sit on teal today; "light" is for a cream background. */
  tone?: "dark" | "light";
  /** Referral code from the URL (?ref=seattle); validated again on the server. */
  refCode?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ref: refCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus("success");
        setMessage(LANDING_FORM.success);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const dark = tone === "dark";

  if (status === "success") {
    return (
      <div role="status" className={`rounded-xl px-5 py-4 ${dark ? "bg-white/10 ring-1 ring-inset ring-white/20" : "bg-lp-800"}`}>
        <p className="text-sm font-semibold text-surface">{message}</p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`early-access-email-${id}`} className="sr-only">
          Email address
        </label>
        <input
          id={`early-access-email-${id}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={LANDING_FORM.placeholder}
          required
          autoComplete="email"
          disabled={status === "loading"}
          className="min-h-11 min-w-0 flex-1 rounded-[0.625rem] border border-lp-800/20 bg-surface-card px-4 py-3 text-sm text-lp-900 outline-none transition-colors placeholder:text-lp-muted focus:border-lp-700 focus:ring-2 focus:ring-lp-700/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="min-h-11 whitespace-nowrap rounded-[0.625rem] bg-clay-500 px-5 py-3 md:px-6 text-sm font-semibold text-white shadow-[0_4px_12px_-6px_rgb(120_50_5/0.5)] transition-colors hover:bg-clay-600 disabled:opacity-50"
        >
          {status === "loading" ? LANDING_FORM.sending : LANDING_FORM.button}
        </button>
      </form>
      {status === "error" && (
        <p role="alert" className={`mt-2 text-left text-sm ${dark ? "text-lp-gold-50" : "text-brick-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
