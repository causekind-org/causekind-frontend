"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard modal dialog — Radix `Dialog`, matching the conventions already used
 * by `ui/alert-dialog`.
 *
 * <p>`alert-dialog` exists for destructive confirmations that must be answered.
 * This is the dismissible sibling for forms, and the reason feature folders no
 * longer embed one-off modal implementations of their own.
 *
 * <p>Motion is `tw-animate-css` only — `data-[state=*]` utilities driven by
 * Radix. Framer Motion is deliberately NOT layered on the same transition:
 * two systems animating one element fight over the exit and strand the overlay.
 * Both respect `prefers-reduced-motion` via the project's Tailwind config.
 */

/**
 * The last element focused OUTSIDE any dialog.
 *
 * <p>Module-level and fed by a single `focusin` listener, because every
 * render-time or effect-time snapshot proved too late: by the time
 * `DialogContent` first renders, `document.activeElement` is already `<body>`
 * (measured in-browser — the probe reported `opener: "BODY"`). Tracking focus
 * continuously sidesteps the ordering problem entirely.
 */
let lastExternalFocus: HTMLElement | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t || t === document.body) return;
      // Ignore focus moving *into* an overlay — we want the element behind it.
      if (t.closest("[data-slot='dialog-content'],[data-slot='drawer-content'],[role='dialog']")) return;
      lastExternalFocus = t;
    },
    true
  );
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Set false when the dialog supplies its own close affordance. */
    showCloseButton?: boolean;
  }
>(({ className, children, showCloseButton = true, onCloseAutoFocus, ...props }, ref) => {
  /**
   * Restore focus to whatever opened this.
   *
   * <p>Radix returns focus to `DialogTrigger` — but every dialog in this app is
   * *controlled* by an external button and has no `DialogTrigger`, so Radix has
   * no ref to return to and focus falls to `<body>`. A keyboard user then loses
   * their place in the page entirely on Escape.
   *
   * <p>Verified in the browser: without this, `document.activeElement` after
   * Escape is `<body>`.
   */
  // Snapshot the tracker on first render. Radix's own restore targets
  // `DialogTrigger`, which these controlled dialogs don't have, so without this
  // Escape drops focus to <body> and a keyboard user loses their place.
  const opener = React.useRef<HTMLElement | null>(null);
  if (opener.current === null) opener.current = lastExternalFocus;

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onCloseAutoFocus={(e) => {
        onCloseAutoFocus?.(e);
        if (e.defaultPrevented) return;
        const el = opener.current;
        // `isConnected` guard: the opener may have unmounted while the dialog
        // was open — e.g. a card removed by the very action the dialog took.
        if (el && el.isConnected && el !== document.body && typeof el.focus === "function") {
          e.preventDefault();      // stop Radix focusing <body>
          el.focus();
        }
      }}
      data-slot="dialog-content"
      className={cn(
        // Column layout + max-height is what lets the body scroll while the
        // header and footer stay put — see DialogBody.
        "fixed left-1/2 top-1/2 z-[100] flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg",
        "-translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden",
        "rounded-lg border border-border bg-card text-card-foreground shadow-lg",
        "duration-200",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-3 top-3 flex size-11 items-center justify-center rounded-md",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none"
          )}
        >
          <XIcon className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("shrink-0 space-y-1 border-b border-border px-5 py-4 pr-14", className)}
      {...props}
    />
  );
}

/** The only scrolling region. Keeps the footer reachable on a short viewport. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "shrink-0 flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-bold text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
