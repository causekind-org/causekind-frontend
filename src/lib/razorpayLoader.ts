const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<boolean> | null = null;

const ready = () => typeof (window as unknown as { Razorpay?: unknown }).Razorpay === "function";

/** One bounded, event-driven SDK load shared by donation entry points. */
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (ready()) return Promise.resolve(true);
  if (loading) return loading;
  const attempt = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (!success && script.dataset.ckCheckout === "true") script.remove();
      resolve(success);
    };
    const onLoad = () => finish(ready());
    const onError = () => finish(false);
    const timer = setTimeout(onError, 8000);
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.dataset.ckCheckout = "true";
      document.head.appendChild(script);
    }
  });
  loading = attempt.then((success) => {
    if (!success) loading = null;
    return success;
  });
  return loading;
}
