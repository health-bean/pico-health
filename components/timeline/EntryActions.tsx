"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button, Dialog } from "@/components/ui";

interface EntryActionsProps {
  /** Entry name, used for the dialog title. */
  name: string;
  onDelete: () => void;
}

/**
 * Trailing "..." button on a timeline card. Opens a small action sheet
 * with Delete. Deletion is undoable via toast, so no extra confirm step.
 */
export function EntryActions({ name, onDelete }: EntryActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mr-2 -my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-teal-50 hover:text-teal-600 transition-all duration-200 cursor-pointer"
        aria-label={`Actions for ${name}`}
        aria-haspopup="dialog"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={name} size="sm">
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete entry
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
