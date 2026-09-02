/**
 * Client-side contract for POST /api/capture.
 *
 * Mirrors the server's CapturedEntry / NDJSON event shapes. The server
 * implementation lives in app/api/capture/route.ts and lib/ai/extract.ts;
 * this file is the client's copy so components never import server code.
 */

export interface CapturedEntry {
  id: string;
  entryType: string;
  name: string;
  severity: number | null;
  details: Record<string, unknown> | string | null;
  entryDate: string;
  entryTime: string | null;
  mealType: string | null;
  foodId: string | null;
  protocolViolations: string[];
}

export type CaptureEvent =
  | { type: "extracted"; entries: CapturedEntry[] }
  | { type: "note"; content: string }
  | { type: "done"; entryCount: number }
  | { type: "error"; message: string };

export type CaptureStatus = "streaming" | "saved" | "error";

/** One submission (a typed phrase or a photo) and everything it produced. */
export interface CaptureSession {
  id: string;
  status: CaptureStatus;
  entries: CapturedEntry[];
  /** Short model aside, e.g. "I didn't catch the last item." */
  note: string | null;
  error: string | null;
  sourceText: string | null;
  /** Object URL for a submitted photo's thumbnail. */
  imagePreviewUrl: string | null;
}

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
