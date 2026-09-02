"use client";

import { useCallback, useRef, useState } from "react";
import type { CaptureEvent, CaptureSession, CapturedEntry } from "@/types/capture";

interface UseCaptureOptions {
  /** Called when a session's entries are settled into the timeline (undo window closed or session dismissed). The page should refetch the day. */
  onSettled?: () => void;
  /** Date entries should land on (defaults to today). Time inference only applies when this is today. */
  entryDate?: string;
}

interface SubmitImageInput {
  dataUri: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  previewUrl: string;
  text?: string;
}

interface UseCaptureReturn {
  sessions: CaptureSession[];
  submitting: boolean;
  submitText: (text: string) => Promise<void>;
  submitImage: (input: SubmitImageInput) => Promise<void>;
  /** Delete every entry the session created and drop the card. */
  undoSession: (sessionId: string) => Promise<void>;
  /** Keep the entries, drop the card (they'll render as normal timeline cards after refetch). */
  dismissSession: (sessionId: string) => void;
  /** Delete one entry from a session (chip ×). */
  removeEntry: (sessionId: string, entryId: string) => Promise<void>;
  /** Patch one entry (swap food, fix meal type or time). */
  patchEntry: (
    sessionId: string,
    entryId: string,
    patch: { foodId?: string | null; name?: string; mealType?: string; entryTime?: string }
  ) => Promise<boolean>;
}

function localTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useCapture(options: UseCaptureOptions = {}): UseCaptureReturn {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const onSettledRef = useRef(options.onSettled);
  onSettledRef.current = options.onSettled;
  const entryDateRef = useRef(options.entryDate);
  entryDateRef.current = options.entryDate;

  const updateSession = useCallback(
    (id: string, patch: Partial<CaptureSession> | ((s: CaptureSession) => Partial<CaptureSession>)) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s))
      );
    },
    []
  );

  const runCapture = useCallback(
    async (body: Record<string, unknown>, seed: Pick<CaptureSession, "sourceText" | "imagePreviewUrl">) => {
      const sessionId = `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      setSessions((prev) => [
        ...prev,
        {
          id: sessionId,
          status: "streaming",
          entries: [],
          note: null,
          error: null,
          ...seed,
        },
      ]);
      setSubmitting(true);

      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            entryDate: entryDateRef.current ?? localDateString(now),
            ...(entryDateRef.current == null || entryDateRef.current === localDateString(now)
              ? { localTime: localTimeString(now) }
              : {}),
          }),
        });

        if (!res.ok || !res.body) {
          const message =
            res.status === 429
              ? "Slow down a moment, then try again."
              : "Couldn't reach the log. Your text is still in the field — try again.";
          updateSession(sessionId, { status: "error", error: message });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawEntries = false;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: CaptureEvent;
            try {
              event = JSON.parse(line) as CaptureEvent;
            } catch {
              continue;
            }
            if (event.type === "extracted") {
              sawEntries = sawEntries || event.entries.length > 0;
              updateSession(sessionId, (s) => ({ entries: [...s.entries, ...event.entries] }));
            } else if (event.type === "note") {
              updateSession(sessionId, { note: event.content });
            } else if (event.type === "error") {
              updateSession(sessionId, { status: "error", error: event.message });
            } else if (event.type === "done") {
              updateSession(sessionId, (s) => ({
                status: s.status === "error" ? "error" : "saved",
              }));
            }
          }
        }

        // Stream ended without a done/error event (connection dropped mid-way).
        updateSession(sessionId, (s) =>
          s.status === "streaming"
            ? sawEntries || s.entries.length > 0
              ? { status: "saved" }
              : { status: "error", error: "The connection dropped. Try again." }
            : {}
        );
      } catch {
        updateSession(sessionId, {
          status: "error",
          error: "Couldn't reach the log. Your text is still in the field — try again.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [updateSession]
  );

  const submitText = useCallback(
    async (text: string) => {
      await runCapture({ text }, { sourceText: text, imagePreviewUrl: null });
    },
    [runCapture]
  );

  const submitImage = useCallback(
    async ({ dataUri, mimeType, previewUrl, text }: SubmitImageInput) => {
      await runCapture(
        { imageBase64: dataUri, imageMimeType: mimeType, ...(text ? { text } : {}) },
        { sourceText: text ?? null, imagePreviewUrl: previewUrl }
      );
    },
    [runCapture]
  );

  const dropSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const s = prev.find((x) => x.id === sessionId);
      if (s?.imagePreviewUrl) URL.revokeObjectURL(s.imagePreviewUrl);
      return prev.filter((x) => x.id !== sessionId);
    });
  }, []);

  const undoSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      await Promise.allSettled(
        session.entries.map((e) => fetch(`/api/entries/${e.id}`, { method: "DELETE" }))
      );
      dropSession(sessionId);
      onSettledRef.current?.();
    },
    [sessions, dropSession]
  );

  const dismissSession = useCallback(
    (sessionId: string) => {
      dropSession(sessionId);
      onSettledRef.current?.();
    },
    [dropSession]
  );

  const removeEntry = useCallback(
    async (sessionId: string, entryId: string) => {
      // Optimistic: drop the chip, then delete.
      let remaining = 1;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const entries = s.entries.filter((e) => e.id !== entryId);
          remaining = entries.length;
          return { ...s, entries };
        })
      );
      await fetch(`/api/entries/${entryId}`, { method: "DELETE" }).catch(() => undefined);
      if (remaining === 0) dismissSession(sessionId);
    },
    [dismissSession]
  );

  const patchEntry = useCallback(
    async (
      sessionId: string,
      entryId: string,
      patch: { foodId?: string | null; name?: string; mealType?: string; entryTime?: string }
    ) => {
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return false;
        const data = (await res.json().catch(() => null)) as { entry?: Partial<CapturedEntry> } | null;
        updateSession(sessionId, (s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  ...(patch.name !== undefined ? { name: patch.name } : {}),
                  ...(patch.foodId !== undefined ? { foodId: patch.foodId } : {}),
                  ...(patch.mealType !== undefined ? { mealType: patch.mealType } : {}),
                  ...(patch.entryTime !== undefined ? { entryTime: patch.entryTime } : {}),
                  ...(data?.entry ?? {}),
                }
              : e
          ),
        }));
        return true;
      } catch {
        return false;
      }
    },
    [updateSession]
  );

  return {
    sessions,
    submitting,
    submitText,
    submitImage,
    undoSession,
    dismissSession,
    removeEntry,
    patchEntry,
  };
}
