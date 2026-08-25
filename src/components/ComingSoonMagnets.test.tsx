import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ComingSoonMagnets } from "./ComingSoonMagnets";

/**
 * The "coming soon" magnet cards, and specifically how they activate.
 *
 * <p>The bug these pin: the cards used to open their modal from
 * `pointerup`. Mobile browsers then dispatch the same gesture's
 * compatibility `click`, and by that moment the modal's full-screen backdrop
 * had already mounted. A tap near the centre of a card sent that trailing
 * click into the centred dialog, which stayed open. A tap near an edge or
 * corner sent it to the backdrop instead, whose `onClick` closed the dialog
 * that had opened a frame earlier — so the card appeared to flash open and
 * shut, but only near its edges.
 *
 * <p>jsdom cannot hit-test, so no test here can literally aim a click at a
 * card's corner. What it can prove is the ordering that made the corner
 * special, which is the actual invariant: the backdrop must not exist yet
 * when the tap's click is dispatched. If the modal has not mounted by the end
 * of `pointerup`, there is nothing under the finger for that click to hit,
 * and where on the card the user tapped stops mattering.
 */

const CARD_NAMES = [
  /fundraising campaigns/i,
  /online donations/i,
  /csr partnerships/i,
];

const cardButton = (name: RegExp) => screen.getByRole("button", { name });
const backdrop = () => document.querySelector(".ck-modal-backdrop") as HTMLElement | null;

/** A tap, as the browser delivers it: pointerdown, pointerup, then click. */
function tap(el: HTMLElement, at = { clientX: 10, clientY: 10 }) {
  const init = { pointerId: 1, pointerType: "touch", isPrimary: true, ...at };
  fireEvent.pointerDown(el, init);
  fireEvent.pointerUp(el, init);
  fireEvent.click(el, at);
}

describe("magnet card activation", () => {
  it("is a real button, not a div with handlers", () => {
    render(<ComingSoonMagnets />);
    for (const name of CARD_NAMES) {
      const card = cardButton(name);
      expect(card.tagName).toBe("BUTTON");
      // Without an explicit type a button inside a form submits it.
      expect(card).toHaveAttribute("type", "button");
      expect(card).toHaveAttribute("aria-haspopup", "dialog");
    }
  });

  it("does not open on pointerup — only the click that follows opens it", () => {
    render(<ComingSoonMagnets />);
    const card = cardButton(/fundraising campaigns/i);
    const init = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 10, clientY: 10 };

    fireEvent.pointerDown(card, init);
    fireEvent.pointerUp(card, init);

    // The assertion the whole fix rests on. If a modal exists here, its
    // backdrop is already under the finger and the tap's trailing click is
    // free to land on it — which is exactly the edge-tap bug.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(backdrop()).toBeNull();

    fireEvent.click(card, { clientX: 10, clientY: 10 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each(CARD_NAMES)("opens exactly one dialog for a tap on %s", name => {
    render(<ComingSoonMagnets />);
    tap(cardButton(name));
    // Two dialogs would mean two activation paths still fire per gesture.
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("stays open after the gesture completes", async () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/online donations/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // The old failure closed the modal through `close()`, which unmounts after
    // a 360ms exit animation. Waiting past that is what distinguishes "opened
    // and stayed" from "opened and was already on its way out".
    await new Promise(resolve => setTimeout(resolve, 450));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens from a full mouse press-and-release too", async () => {
    const user = userEvent.setup();
    render(<ComingSoonMagnets />);
    // userEvent fires the real sequence: pointerdown, mousedown, pointerup,
    // mouseup, click.
    await user.click(cardButton(/csr partnerships/i));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens from the keyboard, because it is a button", async () => {
    const user = userEvent.setup();
    render(<ComingSoonMagnets />);
    const card = cardButton(/fundraising campaigns/i);
    card.focus();
    expect(card).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("names the dialog after the card that opened it", () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/csr partnerships/i));
    expect(screen.getByRole("dialog", { name: "CSR Partnerships" })).toBeInTheDocument();
  });
});

describe("dragging versus tapping", () => {
  /** A mouse drag: down, past the threshold, up — and the click that follows. */
  function dragMouse(el: HTMLElement, to: { clientX: number; clientY: number }) {
    const id = { pointerId: 1, pointerType: "mouse", isPrimary: true };
    fireEvent.pointerDown(el, { ...id, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el, { ...id, ...to });
    fireEvent.pointerUp(el, { ...id, ...to });
    fireEvent.click(el, to);
  }

  it("does not open the modal when a mouse drag ends", () => {
    render(<ComingSoonMagnets />);
    dragMouse(cardButton(/fundraising campaigns/i), { clientX: 60, clientY: 40 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on the next real click after a drag", () => {
    render(<ComingSoonMagnets />);
    const card = cardButton(/fundraising campaigns/i);
    dragMouse(card, { clientX: 60, clientY: 40 });
    expect(screen.queryByRole("dialog")).toBeNull();

    // The drag suppresses one click, not every click after it.
    tap(card);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("treats a mouse press that barely moves as a tap", () => {
    render(<ComingSoonMagnets />);
    // 3px of jitter is a click, not a drag — the threshold is 6px.
    dragMouse(cardButton(/online donations/i), { clientX: 2, clientY: 2 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("leaves the page scrollable from a swipe that starts on a card", () => {
    render(<ComingSoonMagnets />);
    // `touch-action: none` would hand every touch gesture to the card,
    // including the vertical swipe someone uses to scroll past this section.
    for (const name of CARD_NAMES) {
      expect(cardButton(name).style.touchAction).toBe("manipulation");
    }
  });
});

describe("closing the modal", () => {
  it("closes on a backdrop click", async () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/fundraising campaigns/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(backdrop()!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on the close button", async () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/online donations/i));

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on Escape", async () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/csr partnerships/i));

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can be reopened after closing", async () => {
    render(<ComingSoonMagnets />);
    const card = cardButton(/fundraising campaigns/i);

    tap(card);
    fireEvent.click(backdrop()!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    tap(card);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("restores page scrolling when it closes", async () => {
    render(<ComingSoonMagnets />);
    tap(cardButton(/online donations/i));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(backdrop()!);
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });
});
