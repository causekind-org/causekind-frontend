"use client";

import { useCallback, useRef, useState } from "react";
import type { FieldStatus, RuleResult } from "./authValidation";

/**
 * The validation *timing* model, shared by Login and Register.
 *
 * <p>The whole point is when feedback appears, not what the rules are:
 *
 * <ol>
 *   <li><b>Pristine</b> — untouched. No colour, no message.</li>
 *   <li><b>First typing</b> — nothing is validated. Showing "invalid email" to
 *       someone who has typed `j` is telling them off for not having finished.</li>
 *   <li><b>First blur</b> — the field is validated once, and only then can it
 *       show an error or a restrained success.</li>
 *   <li><b>After an error</b> — that field alone switches to live validation, so
 *       the correction is confirmed the instant it becomes valid. Making the
 *       user blur again to discover they fixed it is the thing this exists to
 *       avoid.</li>
 *   <li><b>Editing a previously valid field</b> — drops back to neutral rather
 *       than flashing red while the replacement value is half-typed.</li>
 *   <li><b>Submit</b> — validates everything, including fields never touched.</li>
 * </ol>
 *
 * <p>Server errors are held separately from client errors: a server error must
 * survive until the user actually edits that field, and must not be recomputed
 * away by a client rule that happens to pass.
 */

type FieldRecord = {
  status: FieldStatus;
  errorKey: string | null;
  successKey: string | null;
  params?: Record<string, string | number>;
  hasBlurred: boolean;
  hasErrored: boolean;
  /** Server-assigned, cleared only by a real edit to this field. */
  serverErrorKey: string | null;
  serverErrorText: string | null;
};

const blank: FieldRecord = {
  status: "pristine", errorKey: null, successKey: null,
  hasBlurred: false, hasErrored: false, serverErrorKey: null, serverErrorText: null,
};

export type Validators = Record<string, () => RuleResult>;

export function useTimedFieldValidation() {
  const [fields, setFields] = useState<Record<string, FieldRecord>>({});
  /** IME composition guard — validating mid-composition sees partial glyphs. */
  const composingRef = useRef<Record<string, boolean>>({});

  const get = useCallback((name: string): FieldRecord => fields[name] ?? blank, [fields]);

  const write = useCallback((name: string, patch: Partial<FieldRecord>) => {
    setFields(prev => ({ ...prev, [name]: { ...(prev[name] ?? blank), ...patch } }));
  }, []);

  const applyResult = useCallback((name: string, result: RuleResult) => {
    setFields(prev => {
      const current = prev[name] ?? blank;
      const next: FieldRecord = result.ok
        ? {
            ...current,
            status: "valid",
            errorKey: null,
            successKey: result.successKey ?? null,
            params: undefined,
            serverErrorKey: null,
            serverErrorText: null,
          }
        : {
            ...current,
            status: "invalid",
            errorKey: result.errorKey,
            successKey: null,
            params: result.params,
            hasErrored: true,
          };
      return { ...prev, [name]: next };
    });
  }, []);

  /** Call from onBlur. Validates this field for the first time. */
  const onBlur = useCallback((name: string, validate: () => RuleResult) => {
    if (composingRef.current[name]) return;
    write(name, { hasBlurred: true });
    applyResult(name, validate());
  }, [write, applyResult]);

  /**
   * Call from onChange. Live-validates only if this field has already errored;
   * otherwise it just returns to neutral so nothing turns red mid-typing.
   */
  const onChange = useCallback((name: string, validate: () => RuleResult) => {
    if (composingRef.current[name]) return;
    setFields(prev => {
      const current = prev[name] ?? blank;
      // Any edit invalidates a server verdict about this field.
      const cleared = { ...current, serverErrorKey: null, serverErrorText: null };

      if (!current.hasErrored && !current.serverErrorKey) {
        // Never validated, or previously valid and now being re-edited.
        return { ...prev, [name]: { ...cleared, status: "neutral", errorKey: null, successKey: null } };
      }

      const result = validate();
      return {
        ...prev,
        [name]: result.ok
          ? { ...cleared, status: "valid", errorKey: null, successKey: result.successKey ?? null, params: undefined }
          : { ...cleared, status: "invalid", errorKey: result.errorKey, successKey: null, params: result.params },
      };
    });
  }, []);

  const onCompositionStart = useCallback((name: string) => { composingRef.current[name] = true; }, []);
  const onCompositionEnd = useCallback((name: string, validate: () => RuleResult) => {
    composingRef.current[name] = false;
    const current = fields[name] ?? blank;
    if (current.hasErrored) applyResult(name, validate());
  }, [fields, applyResult]);

  /**
   * Submit-time sweep. Returns the first invalid field name so the caller can
   * focus it; `null` when everything passes.
   */
  const validateAll = useCallback((validators: Validators): string | null => {
    let firstInvalid: string | null = null;
    setFields(prev => {
      const next = { ...prev };
      for (const [name, validate] of Object.entries(validators)) {
        const result = validate();
        const current = next[name] ?? blank;
        if (result.ok) {
          next[name] = { ...current, status: "valid", errorKey: null, successKey: result.successKey ?? null, params: undefined, hasBlurred: true };
        } else {
          if (!firstInvalid) firstInvalid = name;
          next[name] = { ...current, status: "invalid", errorKey: result.errorKey, successKey: null, params: result.params, hasBlurred: true, hasErrored: true };
        }
      }
      return next;
    });
    // Computed synchronously from the validators, so the caller can act on it
    // immediately rather than waiting for the state commit.
    for (const [name, validate] of Object.entries(validators)) {
      if (!validate().ok) return name;
    }
    return null;
  }, []);

  /** Pin a server verdict to a field. Survives until that field is edited. */
  const setServerError = useCallback((name: string, errorKey: string | null, text?: string) => {
    write(name, {
      status: "invalid",
      errorKey,
      serverErrorKey: errorKey,
      serverErrorText: text ?? null,
      successKey: null,
      hasErrored: true,
    });
  }, [write]);

  const reset = useCallback(() => setFields({}), []);

  return {
    get, onBlur, onChange, onCompositionStart, onCompositionEnd,
    validateAll, setServerError, reset,
  };
}

export type TimedValidation = ReturnType<typeof useTimedFieldValidation>;
