'use client';

import { useState } from 'react';
import type { PersonalStatus } from '@/lib/protocols/fit-line';

const LABEL: Record<PersonalStatus, string> = {
  safe: 'fine for me',
  sensitive: 'small amounts',
  unsafe: 'not for me',
};

/**
 * Insights suggest; the person decides. One quiet link under a food pattern
 * offers to add the food to their own list. Nothing is added automatically:
 * the numbers can be wrong, the person knows their body.
 */
export function SuggestRating({
  foodName,
  suggestion,
  evidence,
}: {
  foodName: string;
  suggestion: PersonalStatus;
  evidence: Record<string, unknown>;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'added' | 'missing' | 'error'>('idle');

  async function save(method: 'PUT' | 'DELETE', foodId?: string) {
    const res = await fetch('/api/foods/personal-rating', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(method === 'PUT' ? { foodName, status: suggestion, source: 'insight', evidence } : { foodId }),
    });
    return res;
  }

  const [foodId, setFoodId] = useState<string | null>(null);

  async function add() {
    setState('saving');
    try {
      const res = await save('PUT');
      if (res.status === 404) return setState('missing');
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { foodId?: string };
      setFoodId(body.foodId ?? null);
      setState('added');
    } catch {
      setState('error');
    }
  }

  async function undo() {
    if (!foodId) return;
    setState('saving');
    try {
      const res = await save('DELETE', foodId);
      if (!res.ok) throw new Error(String(res.status));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  if (state === 'missing') return null;

  return (
    <p className="mt-1.5 text-sm text-warm-600">
      {state === 'added' ? (
        <>
          Added to your list as {LABEL[suggestion]}.{' '}
          <button type="button" onClick={undo} className="-my-2 inline-flex min-h-11 items-center font-medium text-teal-700 hover:text-teal-800">
            Undo
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={state === 'saving'}
          className="-my-2 inline-flex min-h-11 items-center font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60"
        >
          Add {foodName.toLowerCase()} to your list as {LABEL[suggestion]}?
        </button>
      )}
      {state === 'error' && <span className="ml-2 text-[var(--color-warning-strong)]">Couldn&apos;t save. Try again.</span>}
    </p>
  );
}
