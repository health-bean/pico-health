"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-warm-900">Check your email</h1>
          <p className="mt-2 text-sm text-warm-500">
            We sent a password reset link to <strong>{email}</strong>. Click the
            link in the email to reset your password.
          </p>
          <p className="mt-6 text-sm text-warm-500">
            <Link href="/login" className="text-teal-600 hover:text-teal-700">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-warm-900">Reset password</h1>
          <p className="mt-1 text-sm text-warm-500">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <Card>
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

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full">
              Send Reset Link
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-warm-500">
          Remember your password?{" "}
          <Link href="/login" className="text-teal-600 hover:text-teal-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
