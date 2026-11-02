"use client";

import { useState } from "react";
import { copyErrorId } from "@/lib/errorId";

/** "Error ID: …" in small text with a copy button, under an error message. Nothing without an id. */
export function ErrorIdNote({ id }: { id?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  return (
    <p data-testid="error-id" className="mt-2 text-xs text-stone-500 dark:text-stone-400 [overflow-wrap:anywhere]">
      Error ID: <span className="font-mono">{id}</span>{" "}
      <button
        type="button"
        className="underline"
        onClick={() => void copyErrorId(id).then(() => setCopied(true))}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}
