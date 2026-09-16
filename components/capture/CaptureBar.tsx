"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ArrowUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutRow } from "./ShortcutRow";

const PLACEHOLDERS = [
  "Salmon and rice for lunch…",
  "Headache since 3pm…",
  "Took magnesium with dinner…",
  "Chicken, sweet potato, broccoli…",
  "Bloating after breakfast…",
];

/** Downscale a photo so the upload stays small; extraction doesn't need pixels. */
async function downscaleImage(file: File): Promise<{ dataUri: string; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = previewUrl;
  });
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUri: canvas.toDataURL("image/jpeg", 0.8), previewUrl };
}

interface CaptureBarProps {
  onSubmitText: (text: string) => void;
  onSubmitImage: (input: {
    dataUri: string;
    mimeType: "image/jpeg";
    previewUrl: string;
    text?: string;
  }) => void;
  onBrowse: () => void;
  disabled?: boolean;
  /** Log the entries a shortcut carries (already-known foods/symptoms). */
  onShortcut: (items: { entryType: string; name: string; foodId?: string; mealType?: string }[]) => void;
  /** Label of a past day being backfilled ("Fri, Apr 24"); omitted for today. */
  dayLabel?: string;
  /** Jump the Log back to today; shown only while backfilling. */
  onBackToToday?: () => void;
}

export function CaptureBar({ onSubmitText, onSubmitImage, onBrowse, disabled, onShortcut, dayLabel, onBackToToday }: CaptureBarProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rotate the placeholder while the field is idle — the bar teaches by example.
  // Not while backfilling (the placeholder names the day instead) and not for
  // people who asked for less motion: a moving target is hard to read on a
  // foggy day.
  useEffect(() => {
    if (focused || text || dayLabel) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 8000);
    return () => clearInterval(id);
  }, [focused, text, dayLabel]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmitText(trimmed);
    setText("");
    inputRef.current?.blur();
  }, [text, disabled, onSubmitText]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setPhotoError(null);
      try {
        const { dataUri, previewUrl } = await downscaleImage(file);
        const trimmed = text.trim();
        onSubmitImage({ dataUri, mimeType: "image/jpeg", previewUrl, text: trimmed || undefined });
        setText("");
      } catch {
        setPhotoError("Couldn't read that photo — you can type the meal instead.");
      }
      if (fileRef.current) fileRef.current.value = "";
    },
    [text, onSubmitImage]
  );

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 md:bottom-6">
      <div
        className="pointer-events-auto mx-auto w-full max-w-2xl px-4"
        // Focus anywhere in the bar (the field or a shortcut) keeps shortcuts
        // open, so a keyboard user can Tab from the field into them.
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setTimeout(() => setFocused(false), 150);
        }}
      >
        {dayLabel && (
          <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 text-sm text-teal-800 ring-1 ring-inset ring-teal-200/70">
            <span className="py-2">
              Logging to <span className="font-semibold">{dayLabel}</span>
            </span>
            {onBackToToday && (
              <button
                type="button"
                onClick={onBackToToday}
                className="-mr-2 min-h-11 shrink-0 rounded-lg px-2 font-medium text-teal-700 hover:bg-teal-100"
              >
                Back to today
              </button>
            )}
          </div>
        )}
        {focused && (
          <ShortcutRow
            onShortcut={(items) => {
              onShortcut(items);
              inputRef.current?.blur();
            }}
          />
        )}
        {photoError && (
          <p role="alert" className="mb-1.5 rounded-lg bg-[var(--color-surface-card)] px-3 py-1.5 text-sm text-warm-700 shadow-[var(--shadow-card)] ring-1 ring-[var(--color-border-light)]">
            {photoError}
          </p>
        )}
        <div
          className={cn(
            "flex items-end gap-1.5 rounded-2xl border bg-[var(--color-surface-card)] p-1.5 shadow-[var(--shadow-float)] transition-colors duration-200",
            focused ? "border-teal-400" : "border-[var(--color-border-light)]"
          )}
        >
          {/* Labelled on purpose: an icon alone never said "pick from a list". */}
          <button
            type="button"
            onClick={onBrowse}
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-500"
            aria-label="Add from a list of foods, symptoms, and exercise"
            title="Pick from a list"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Add
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            enterKeyHint="send"
            placeholder={dayLabel ? `Add to ${dayLabel}…` : PLACEHOLDERS[placeholderIdx]}
            aria-label={dayLabel ? `Log a meal, symptom, or anything else to ${dayLabel}` : "Log a meal, symptom, or anything else"}
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-[var(--color-text-primary)] caret-teal-600 placeholder:text-warm-500 focus:outline-none"
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {canSend ? (
            <button
              type="button"
              onClick={submit}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition-colors hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              aria-label="Log it"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-warm-500 transition-colors hover:bg-teal-50 hover:text-teal-600 focus-visible:outline-2 focus-visible:outline-teal-500 disabled:opacity-40"
              aria-label="Photograph your plate"
              title="Photo"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
