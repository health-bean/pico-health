/**
 * Every sign-in surface shares one warm backdrop, so login, signup, and the
 * password pages read as one product.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-surface)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/80 via-[var(--color-surface)] to-warm-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
