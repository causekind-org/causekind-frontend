/** The id a 5xx body carries (ApiExceptionHandler); the matching server log line has the cause. */
export function errorIdOf(error: unknown): string | null {
  const id = (error as { data?: { errorId?: unknown } } | null | undefined)?.data?.errorId;
  return typeof id === "string" && id ? id : null;
}

export function copyErrorId(id: string): Promise<void> {
  return navigator.clipboard?.writeText(id) ?? Promise.resolve();
}

/** A failed action has no error screen of its own: a toast with the id and a Copy button (once per id). */
export function toastErrorId(id: string): void {
  void import("sonner").then(({ toast }) =>
    toast.error(`Error ID: ${id}`, { id, action: { label: "Copy", onClick: () => void copyErrorId(id) } }),
  );
}
