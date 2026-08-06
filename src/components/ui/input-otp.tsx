"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Six-cell one-time-code field, on `input-otp`.
 *
 * <p>A single real `<input>` sits invisibly over the cells, so paste, autofill,
 * mobile SMS autofill and the software numeric keypad all behave normally —
 * which six separate inputs wired together never quite manage.
 *
 * <p>Cells are 44px+ per the project's touch-target rule, and the active cell is
 * marked by border AND a caret, not colour alone.
 */

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  // gap-1 below sm. Six 44px slots with 8px gaps need 304px, which does not fit
  // a 320px screen once the page and panel padding are taken out — the row was
  // pushing the whole handover page into horizontal scroll.
  return <div data-slot="input-otp-group" className={cn("flex items-center gap-1 sm:gap-2", className)} {...props} />;
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext?.slots[index];
  const { char, hasFakeCaret, isActive } = slot ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        // w-9 below sm: 6×36 + 5×4 = 236px, which clears the ~264px a 320px
        // screen leaves after the page's px-4 and the panel's p-3. Height stays
        // at 48px, and the slots are decorative anyway — input-otp renders one
        // real input behind them — so narrowing costs no touch target.
        "relative flex h-12 w-9 items-center justify-center rounded-md border border-input sm:w-11",
        "bg-background text-lg font-semibold text-foreground shadow-xs transition-all",
        "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50",
        "aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator(props: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon className="size-3 text-muted-foreground" aria-hidden />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
