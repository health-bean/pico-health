"use client";

import { useState } from "react";
import { LANDING_FORM } from "@/lib/landing-content";

export function EarlyAccessForm({
  variant = "default",
  refCode,
}: {
  variant?: "default" | "inline";
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

  const width = variant === "inline" ? "" : "mx-auto max-w-md";

  if (status === "success") {
    return (
      <div role="status" className={`rounded-xl bg-lp-800 px-6 py-4 text-center ${width}`}>
        <p className="text-sm font-semibold text-white">{message}</p>
      </div>
    );
  }

  return (
    <div className={width}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`early-access-email-${variant}`} className="sr-only">
          Email address
        </label>
        <input
          id={`early-access-email-${variant}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={LANDING_FORM.placeholder}
          required
          autoComplete="email"
          disabled={status === "loading"}
          className="min-w-0 flex-1 rounded-[0.625rem] border border-lp-800/20 bg-white px-4 py-3 text-sm text-lp-900 outline-none transition-colors placeholder:text-lp-muted focus:border-lp-700 focus:ring-2 focus:ring-lp-700/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="whitespace-nowrap rounded-[0.625rem] bg-lp-800 px-6 py-3 text-sm font-semibold text-lp-cream transition-colors hover:bg-lp-900 disabled:opacity-50"
        >
          {status === "loading" ? LANDING_FORM.sending : LANDING_FORM.button}
        </button>
      </form>
      {status === "error" && (
        <p role="alert" className="mt-2 text-left text-xs text-danger-strong">
          {message}
        </p>
      )}
    </div>
  );
}
