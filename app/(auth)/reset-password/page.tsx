"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Button, Card, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // The reset link signs the person in for this one step. Without that
  // session the form cannot work, so say why and offer the way forward.
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setLinkValid(!!data.session);
      })
      .catch(() => {
        if (!cancelled) setLinkValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/log");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (linkValid === null) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }

  if (linkValid === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <PageTitle>This link has expired</PageTitle>
          <p className="mt-2 text-sm leading-relaxed text-warm-600">
            Reset links work once and only for a short time. Ask for a new one and it will arrive in a minute or two.
          </p>
          <div className="mt-6 flex flex-col items-center gap-1">
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Send a new link
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-teal-700 hover:text-teal-800">
              Back to log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <PageTitle>Set new password</PageTitle>
          <p className="mt-1 text-sm text-warm-500">
            Enter your new password below
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="New password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-danger-strong" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full">
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
