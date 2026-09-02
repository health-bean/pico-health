"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, value, onChange, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              "w-full appearance-none rounded-xl border px-4 py-2.5 pr-10 text-sm min-h-[44px]",
              "bg-[var(--color-surface-card)] text-[var(--color-text-primary)]",
              "transition-all duration-200 ease-[var(--ease-out-expo)]",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-overlay)]",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-[var(--color-border)] focus:border-teal-500 focus:ring-teal-500",
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error && selectId ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p
            id={selectId ? `${selectId}-error` : undefined}
            className="text-xs text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps };
