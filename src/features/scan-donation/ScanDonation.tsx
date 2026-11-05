"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Script from "next/script";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Collapsible from "@radix-ui/react-collapsible";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ScanApiError,
  buildOrderPayload,
  createQrOrder,
  verifyQrPayment,
  type FieldError,
  type QrOrder,
  type QrVerifyRequest,
} from "./api";
import {
  DEFAULT_PRESET,
  MIN_AMOUNT,
  OTHER_PRESET,
  PRESET_AMOUNTS,
  SCAN_DEFAULTS,
  TIP_OPTIONS,
  chosenAmount,
  normalizePhone,
  scanSchema,
  type ScanFormValues,
} from "./schema";
import "./scan.css";
import { captureUtm, trackDonationSuccess, trackInitiateCheckout, trackScanPageView, type Utm } from "./tracking";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const PHOTO = "/images/scan/scan-bg-smile.webp";
const BRAND_COLOR = "#b04a15"; // --primary in styles.css
const SCRIPT_WAIT_MS = 6_000;

type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: () => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

const razorpayCtor = () => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

/** next/script loads it up front; a load that failed on a weak connection is retried here. */
async function ensureRazorpay(): Promise<RazorpayCtor | null> {
  const deadline = Date.now() + SCRIPT_WAIT_MS;
  while (!razorpayCtor() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (razorpayCtor()) return razorpayCtor()!;
  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = script.onerror = () => resolve();
    document.body.appendChild(script);
  });
  return razorpayCtor() ?? null;
}

type Stage =
  | { kind: "idle" }
  | { kind: "busy"; label: string }
  | { kind: "failed"; message: string }
  // Razorpay reported a payment but the server has not said PAID. Never offered
  // "Try again" here: that would risk charging the donor twice.
  | { kind: "unconfirmed"; request: QrVerifyRequest; order: QrOrder; amount: number; checking: boolean }
  | { kind: "success"; firstName: string; amount: number; paymentId: string; wants80g: boolean };

const CANCELLED_MESSAGE = "Your payment wasn't completed, and you haven't been charged. Your details are saved below.";
const DECLINED_MESSAGE = "Your payment didn't go through. Your details are saved below, so you can try again.";
const CHECKOUT_LOAD_MESSAGE = "We couldn't open the payment window. Please check your connection and try again.";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** The backend's field names, where they differ from the form's. */
function formPathFor(field: string, preset: string): FieldPath<ScanFormValues> | null {
  const known: Record<string, FieldPath<ScanFormValues>> = {
    name: "name",
    phone: "phone",
    email: "email",
    pan: "pan",
    "address.line": "address.line",
    "address.city": "address.city",
    "address.state": "address.state",
    "address.pincode": "address.pincode",
  };
  if (field === "tipAmount") return "tip";
  if (field === "amount") return preset === OTHER_PRESET ? "otherAmount" : "preset";
  return known[field] ?? null;
}

function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive max-lg:text-red-300">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </Label>
      {children}
      <FieldMessage id={`${id}-error`} message={error} />
    </div>
  );
}

const inputClass = "h-12 rounded-xl bg-background/85 text-base text-foreground max-lg:bg-white/95 md:text-base";

function a11y(id: string, error?: string) {
  return { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
}

export function ScanDonation() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [addressOpen, setAddressOpen] = useState(false);
  const utm = useRef<Utm>({ source: "", medium: "", campaign: "", content: "" });
  const viewTracked = useRef(false);
  const lastPreset = useRef(DEFAULT_PRESET);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: SCAN_DEFAULTS,
    mode: "onTouched",
  });

  const preset = watch("preset");
  const otherAmount = watch("otherAmount");
  const wants80g = watch("wants80g");
  const amount = chosenAmount(preset, otherAmount);
  const tip = Number(watch("tip"));

  useEffect(() => {
    utm.current = captureUtm(window.location.search);
    if (viewTracked.current) return;
    viewTracked.current = true;
    trackScanPageView();
  }, []);

  useEffect(() => {
    if (stage.kind === "success" || stage.kind === "unconfirmed") resultHeading.current?.focus();
  }, [stage.kind]);

  const confirmPayment = useCallback(async (request: QrVerifyRequest, order: QrOrder, chosen: number) => {
    try {
      const result = await verifyQrPayment(request);
      if (result.status !== "PAID") {
        setStage({ kind: "unconfirmed", request, order, amount: chosen, checking: false });
        return;
      }
      // The contract doesn't state this field's unit. If it echoes the order's
      // value that is paise, and the rupees the donor chose are the right figure.
      const paid = result.amount === order.amount ? chosen : result.amount;
      setStage({
        kind: "success",
        firstName: result.firstName,
        amount: paid,
        paymentId: request.razorpayPaymentId,
        wants80g: result.wants80g,
      });
      trackDonationSuccess(paid);
    } catch {
      setStage({ kind: "unconfirmed", request, order, amount: chosen, checking: false });
    }
  }, []);

  const showServerErrors = (fieldErrors: FieldError[], message: string, currentPreset: string) => {
    let placed = false;
    for (const { field, message: fieldMessage } of fieldErrors) {
      const path = formPathFor(field, currentPreset);
      if (!path) continue;
      if (path.startsWith("address.")) setAddressOpen(true);
      setError(path, { type: "server", message: fieldMessage }, { shouldFocus: !placed });
      placed = true;
    }
    setStage(placed ? { kind: "idle" } : { kind: "failed", message });
  };

  const donate = async (values: ScanFormValues) => {
    const chosen = chosenAmount(values.preset, values.otherAmount);
    trackInitiateCheckout(chosen);
    setStage({ kind: "busy", label: "Starting your donation…" });

    let order: QrOrder;
    try {
      order = await createQrOrder(buildOrderPayload(values, utm.current));
    } catch (err) {
      if (err instanceof ScanApiError) showServerErrors(err.fieldErrors, err.message, values.preset);
      else setStage({ kind: "failed", message: "Something went wrong on our side. Please try again." });
      return;
    }

    const Razorpay = await ensureRazorpay();
    if (!Razorpay) {
      setStage({ kind: "failed", message: CHECKOUT_LOAD_MESSAGE });
      return;
    }

    // Razorpay keeps its window open after a declined attempt so the donor can
    // retry inside it. Only closing the window ends the attempt.
    let declined = false;
    const checkout = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: "CauseKind",
      description: "Diwali meal donation",
      prefill: { name: values.name.trim(), email: values.email.trim(), contact: `+91${values.phone}` },
      theme: { color: BRAND_COLOR },
      handler: (response: RazorpaySuccess) => {
        setStage({ kind: "busy", label: "Confirming your payment…" });
        void confirmPayment(
          {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          },
          order,
          chosen,
        );
      },
      modal: {
        ondismiss: () => setStage({ kind: "failed", message: declined ? DECLINED_MESSAGE : CANCELLED_MESSAGE }),
      },
    });
    checkout.on("payment.failed", () => {
      declined = true;
    });
    setStage({ kind: "busy", label: "Waiting for payment…" });
    checkout.open();
  };

  const submit = handleSubmit(donate);

  if (stage.kind === "success") {
    return (
      <Shell>
        <div className="text-center" data-clarity-mask="true">
          <CheckCircle2 className="mx-auto mb-4 size-14 text-primary max-lg:text-orange-300" aria-hidden="true" />
          <h1 ref={resultHeading} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">
            Thank you, {stage.firstName}. Your {rupees(stage.amount)} will feed someone in need this Diwali.
          </h1>
          {!stage.wants80g && <p className="mt-4">Your donation certificate will be emailed to you.</p>}
          {stage.wants80g && <p className="mt-4">Your 80G receipt and donation certificate will be emailed to you.</p>}
          <p className="mt-4 text-sm text-foreground/75 max-lg:text-white/85">
            Payment ID: <span className="break-all font-mono text-foreground max-lg:text-white">{stage.paymentId}</span>
          </p>
        </div>
      </Shell>
    );
  }

  if (stage.kind === "unconfirmed") {
    const { request, order, amount: chosen, checking } = stage;
    return (
      <Shell>
        <h1 ref={resultHeading} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">
          We&apos;re still confirming your payment
        </h1>
        <p className="mt-3" role="status">
          Please don&apos;t donate again yet. If you were charged, your donation is safe, and we can trace it with this
          payment ID.
        </p>
        <p className="mt-3 text-sm text-foreground/75 max-lg:text-white/85">
          Payment ID: <span className="break-all font-mono text-foreground max-lg:text-white">{request.razorpayPaymentId}</span>
        </p>
        <Button
          type="button"
          className="mt-5 h-12 w-full rounded-xl text-base font-bold"
          disabled={checking}
          onClick={() => {
            setStage({ ...stage, checking: true });
            void confirmPayment(request, order, chosen);
          }}
        >
          {checking && <Loader2 className="animate-spin" aria-hidden="true" />}
          {checking ? "Checking…" : "Check again"}
        </Button>
        <p className="mt-4 text-sm text-foreground/75 max-lg:text-white/85">
          Need help? Write to{" "}
          <a className="font-semibold text-primary underline max-lg:text-orange-300" href="mailto:support@causekind.com">
            support@causekind.com
          </a>
        </p>
      </Shell>
    );
  }

  const busy = stage.kind === "busy";
  const pincodeError = errors.address?.pincode?.message;
  // "Other amount" opens on the amount just selected, ready to be changed.
  const presetField = register("preset", {
    onChange: (e) => {
      if (e.target.value === OTHER_PRESET) setValue("otherAmount", lastPreset.current, { shouldValidate: true });
      else lastPreset.current = e.target.value;
    },
  });
  const panField = register("pan", {
    onChange: (e) => setValue("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)),
  });
  const phoneField = register("phone", {
    onChange: (e) => setValue("phone", normalizePhone(e.target.value)),
  });
  const otherField = register("otherAmount", {
    onChange: (e) => setValue("otherAmount", e.target.value.replace(/\D/g, "").slice(0, 7)),
  });
  const wants80gField = register("wants80g", {
    onChange: (e) => {
      if (!e.target.checked) setValue("pan", "", { shouldValidate: true });
    },
  });

  return (
    <Shell>
      <Script src={CHECKOUT_SRC} strategy="afterInteractive" />
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight">Feed a hungry person this Diwali</h1>
      <p className="mt-3 text-base text-foreground/75 max-lg:text-white/85">
        Just ₹101 can feed someone who hasn&apos;t eaten today. They need your support.
      </p>

      {/* method="post" so a submit before hydration can never put details in the URL. */}
      <form method="post" noValidate onSubmit={submit} className="mt-6 space-y-5" data-clarity-mask="true">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Choose an amount</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((value) => (
                <AmountOption key={value} value={String(value)} label={`₹${value}`} field={presetField} />
              ))}
              <AmountOption
                value={OTHER_PRESET}
                label="Other amount"
                field={presetField}
                className="col-span-3"
              />
            </div>
            <FieldMessage id="preset-error" message={errors.preset?.message} />
          </fieldset>

          {preset === OTHER_PRESET && (
            <Field id="otherAmount" label={`Your amount in ₹ (minimum ₹${MIN_AMOUNT})`} error={errors.otherAmount?.message}>
              <Input
                {...a11y("otherAmount", errors.otherAmount?.message)}
                {...otherField}
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Support for CauseKind platform (optional)</legend>
            <div className="grid grid-cols-4 gap-2">
              {TIP_OPTIONS.map((value) => (
                <AmountOption
                  key={value}
                  value={String(value)}
                  label={value === 0 ? "No thanks" : `₹${value}`}
                  field={register("tip")}
                />
              ))}
            </div>
            <FieldMessage id="tip-error" message={errors.tip?.message} />
            {tip > 0 && (
              <p className="mt-2 text-sm text-foreground/75 max-lg:text-white/85">
                {rupees(amount)} donation + {rupees(tip)} support to CauseKind, separate from your donation and not covered by 80G
              </p>
            )}
          </fieldset>

          <Field id="name" label="Full name" error={errors.name?.message}>
            <Input
              {...a11y("name", errors.name?.message)}
              {...register("name")}
              autoComplete="name"
              aria-required="true"
              className={inputClass}
            />
          </Field>

          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <Input
              {...a11y("phone", errors.phone?.message)}
              {...phoneField}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              aria-required="true"
              className={inputClass}
            />
          </Field>

          <Field id="email" label="Email" error={errors.email?.message}>
            <Input
              {...a11y("email", errors.email?.message)}
              {...register("email")}
              type="email"
              autoComplete="email"
              aria-required="true"
              className={inputClass}
            />
          </Field>

            <Field id="pan" label="PAN" error={errors.pan?.message}>
              <Input
                {...a11y("pan", errors.pan?.message)}
                {...panField}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-required="true"
                placeholder="ABCDE1234F"
                className={cn(inputClass, "uppercase")}
              />
            </Field>

          <Collapsible.Root open onOpenChange={setAddressOpen}>
            <Collapsible.Trigger className="group flex min-h-11 w-full items-center justify-between rounded-xl text-sm font-semibold text-primary max-lg:text-orange-300 focus-visible:outline-2 focus-visible:outline-ring">
              Address
              <ChevronDown className="size-5 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
            </Collapsible.Trigger>
            <Collapsible.Content className="space-y-4 pt-3">
              <Field id="address-line" label="Street" error={errors.address?.line?.message}>
                <Input
                  {...a11y("address-line", errors.address?.line?.message)}
                  {...register("address.line")}
                  autoComplete="street-address"
                  className={inputClass}
                />
              </Field>
              <Field id="address-city" label="City" error={errors.address?.city?.message}>
                <Input
                  {...a11y("address-city", errors.address?.city?.message)}
                  {...register("address.city")}
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </Field>
              <Field id="address-state" label="State" error={errors.address?.state?.message}>
                <Input
                  {...a11y("address-state", errors.address?.state?.message)}
                  {...register("address.state")}
                  autoComplete="address-level1"
                  className={inputClass}
                />
              </Field>
              <Field id="address-pincode" label="PIN code" error={pincodeError}>
                <Input
                  {...a11y("address-pincode", pincodeError)}
                  {...register("address.pincode")}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="postal-code"
                  className={inputClass}
                />
              </Field>
            </Collapsible.Content>
          </Collapsible.Root>
          <label htmlFor="anonymous" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input id="anonymous" type="checkbox" {...register("anonymous")} className="size-5 shrink-0 accent-primary" />
            Don&apos;t display my name publicly
          </label>
          <label htmlFor="wants80g" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input id="wants80g" type="checkbox" {...wants80gField} className="size-5 shrink-0 accent-primary" />I want an
            80G tax receipt
          </label>


          {/* Honeypot: off-screen and out of the tab order, so only bots fill it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
          </div>
        </fieldset>

        <p className="text-sm text-foreground/75 max-lg:text-white/85">
          Your donation goes to Sahas Charitable Trust. Your details are used only for your donation documents.
        </p>

        {stage.kind === "failed" && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm max-lg:bg-red-950/70">
            {stage.message}
          </p>
        )}

        <Button type="submit" disabled={!isValid || busy} className="h-14 w-full rounded-xl text-base font-bold">
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {busy ? stage.label : stage.kind === "failed" ? "Try again" : `Donate ${rupees(amount + tip)}`}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    // Desktop: the photo is pinned behind a glass card, and clip-path keeps it off the
    // footer. Phones: the card itself is the photo, sharp at the top and fading into
    // a dark base under white text. Its height is fixed so that opening the address
    // section doesn't re-crop it. The negative margin closes main's dock padding.
    <section className="ck-scan-page relative isolate min-h-[calc(100svh-3.5rem)] bg-[#1c1917] [clip-path:inset(0)] max-lg:mb-[calc(-1*(var(--ck-bottom-chrome)+0.5rem))] max-lg:min-h-svh lg:px-4 lg:py-10">
      <div className="fixed inset-0 -z-10 top-[var(--ck-nav-h,5.5rem)] max-lg:hidden">
        <Image src={PHOTO} alt="" fill sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" aria-hidden="true" />
      </div>
      <div className="relative mx-auto min-h-svh w-full overflow-hidden bg-[#1c1917] p-5 pt-[21rem] pb-[calc(var(--ck-bottom-chrome)+1.5rem)] text-white sm:px-7 lg:ml-[8%] lg:min-h-0 lg:max-w-md lg:rounded-3xl lg:border lg:border-white/50 lg:pt-7 lg:shadow-2xl lg:bg-card/75 lg:p-7 lg:pt-7 lg:text-card-foreground lg:backdrop-blur-xl lg:backdrop-saturate-150 dark:lg:border-white/15">
        <div className="absolute inset-x-0 -top-6 h-[38rem] lg:hidden" aria-hidden="true">
          <Image src={PHOTO} alt="" fill priority sizes="1000px" className="object-cover object-[74%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(28,25,23,0.82)_60%,#1c1917_100%)]" />
        </div>
        <div className="relative mx-auto max-w-md">{children}</div>
      </div>
    </section>
  );
}

function AmountOption({
  value,
  label,
  field,
  className,
}: {
  value: string;
  label: string;
  field: ReturnType<ReturnType<typeof useForm<ScanFormValues>>["register"]>;
  className?: string;
}) {
  return (
    <label className={cn("relative block cursor-pointer", className)}>
      <input type="radio" value={value} {...field} className="peer sr-only" />
      <span className="flex h-12 items-center justify-center rounded-xl border border-input bg-background/85 text-base font-bold text-foreground max-lg:bg-white/95 transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
        {label}
      </span>
    </label>
  );
}
