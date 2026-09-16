'use client';

/** Marks a curated row that appeared since the previous insights snapshot. */
export function NewTag() {
  return (
    <span className="inline-flex items-center rounded-md bg-teal-100 px-1.5 py-0.5 text-[11px] font-semibold text-teal-800 ring-1 ring-inset ring-teal-300/60">
      New
    </span>
  );
}
