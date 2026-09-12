import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * The gate must not lock donees out of the very feature it introduces.
 *
 * <p>The need-profile endpoint reached production on the frontend before the
 * backend carrying it was deployed, so `GET /users/me/need-profile` answered
 * 404. The gate failed closed on every error, so each donee got an error modal
 * and could not open the request wizard at all — the check meant to help people
 * finish a profile became the only thing stopping them from starting one.
 *
 * <p>Opening on a 404 is safe rather than lax, and the distinction is the whole
 * point of these tests: `ItemRequestService.submitRequestDraft` calls
 * `enforceMandatoryDocuments()` and snapshots the profile server-side, so an
 * incomplete donee is still refused at submit. This gate was always an early
 * reading of a rule enforced elsewhere, never the rule itself.
 *
 * <p>Which is exactly why only 404 may open it. A 500, a 403 or a dead network
 * leave the profile's real state unknown, and guessing "complete" there marches
 * someone through a long wizard the server will reject at the end.
 */

// vi.mock factories are hoisted above module-scope consts, so the double and
// the error class have to be created inside vi.hoisted or the factory closes
// over a binding that does not exist yet.
const { getDoneeNeedProfile, ApiError } = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { getDoneeNeedProfile: vi.fn(), ApiError };
});

vi.mock("@/lib/api", () => ({ getDoneeNeedProfile, ApiError }));
// The gate keeps its state private and hands it to the modal, so the modal is
// where an assertion can see it. Capturing the prop keeps these tests on the
// component's real contract rather than reaching into its internals.
const seenMode = { value: "unset" as string };
vi.mock("@/components/NeedProfileGateModal", () => ({
  NeedProfileGateModal: ({ state }: { state: { mode: string } }) => {
    seenMode.value = state.mode;
    return null;
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "d@x.test", role: "DONEE" }, isLoading: false, isRestoring: false }),
}));

import { NeedProfileGateProvider, useNeedProfileGate } from "./useNeedProfileGate";

function useGate() {
  return useNeedProfileGate();
}

function renderGate() {
  return renderHook(() => useGate(), { wrapper: NeedProfileGateProvider });
}

describe("the need-profile gate when the server has no such endpoint", () => {
  beforeEach(() => { getDoneeNeedProfile.mockReset(); seenMode.value = "unset"; });

  it("lets a donee through on a 404, because the server is the real gate", async () => {
    getDoneeNeedProfile.mockRejectedValue(new ApiError(404, "The requested item was not found."));

    const { result } = renderGate();
    let allowed: boolean | undefined;
    await act(async () => { allowed = await result.current.requestAccess("/requests/new"); });

    expect(allowed).toBe(true);
    expect(seenMode.value).toBe("closed");
  });

  it("still blocks on a 500, where the profile's state is genuinely unknown", async () => {
    getDoneeNeedProfile.mockRejectedValue(new ApiError(500, "Something went wrong on our end."));

    const { result } = renderGate();
    let allowed: boolean | undefined;
    await act(async () => { allowed = await result.current.requestAccess("/requests/new"); });

    expect(allowed).toBe(false);
    expect(seenMode.value).toBe("error");
  });

  it("still blocks when the network is down", async () => {
    getDoneeNeedProfile.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderGate();
    let allowed: boolean | undefined;
    await act(async () => { allowed = await result.current.requestAccess("/requests/new"); });

    expect(allowed).toBe(false);
    expect(seenMode.value).toBe("error");
  });

  it("still stops an incomplete profile the server did answer for", async () => {
    getDoneeNeedProfile.mockResolvedValue({ complete: false, missing: ["ID proof"], documents: [] });

    const { result } = renderGate();
    let allowed: boolean | undefined;
    await act(async () => { allowed = await result.current.requestAccess("/requests/new"); });

    expect(allowed).toBe(false);
    expect(seenMode.value).toBe("incomplete");
  });
});
