/**
 * Account deletion.
 *
 * Asking to delete sets `deletionRequestedAt` and signs the person out. Their
 * data is untouched for GRACE_DAYS, so signing back in restores the account —
 * a flare, a phone in a drawer, or second thoughts should not cost someone a
 * year of logs. After that a scheduled purge removes it. Anyone who wants it
 * gone straight away can delete permanently instead, which skips the wait.
 */
export const GRACE_DAYS = 30;

/** When a pending deletion becomes permanent. */
export function purgeDateFrom(requestedAt: Date): Date {
  const d = new Date(requestedAt);
  d.setDate(d.getDate() + GRACE_DAYS);
  return d;
}

/** Whole days left before a pending deletion is purged (never below zero). */
export function daysLeft(requestedAt: Date, now: Date = new Date()): number {
  const ms = purgeDateFrom(requestedAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
