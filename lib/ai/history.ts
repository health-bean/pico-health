/** Keep model context bounded by size, not just message count. */

export const CHAT_HISTORY_MAX_CHARS = 40_000;
export const ADMIN_CHAT_HISTORY_MAX_CHARS = 120_000;

/**
 * Keep the most recent messages whose combined content fits in `maxChars`,
 * dropping the oldest first. The latest message is always kept, and the
 * window never starts on an assistant turn.
 */
export function capHistoryByChars<T extends { role: string; content: string }>(
  history: T[],
  maxChars: number
): T[] {
  if (history.length === 0) return history;
  let start = history.length - 1;
  let total = history[start].content.length;
  while (start > 0 && total + history[start - 1].content.length <= maxChars) {
    start--;
    total += history[start].content.length;
  }
  while (start < history.length - 1 && history[start].role !== "user") start++;
  return history.slice(start);
}
