"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        return;
      }

      router.push(data.user.isAdmin ? "/admin" : "/log");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6 py-12 overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 via-[var(--color-surface)] to-warm-100" />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-teal-700 mb-2">
            Pico Health
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sign in to continue your healing journey
          </p>
        </div>

        <Card>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-sm transition-colors hover:bg-warm-50 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-warm-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[var(--color-text-muted)]">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="mt-2 w-full">
                Log In
              </Button>
            </form>
          </div>
        </Card>

        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          New here?{" "}
          <Link
            href="/signup"
            className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
