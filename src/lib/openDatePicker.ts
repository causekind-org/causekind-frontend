import type { MouseEvent } from "react";

/** A click anywhere on a date field opens its calendar; typing still works. Browsers without showPicker just keep the field focused. */
export function openDatePicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    // Not allowed here (cross-origin frame, disabled field): the field stays usable by typing.
  }
}
