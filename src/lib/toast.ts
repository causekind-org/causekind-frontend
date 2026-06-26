import { toast as sonnerToast } from "sonner";

const ERROR_TOAST_ID = "global-error";

// Drop-in replacement for sonner's toast. error() always replaces the previous
// error toast so spam-clicking never stacks multiple popups.
export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    ...sonnerToast,
    error: (
      message: Parameters<typeof sonnerToast.error>[0],
      options?: Parameters<typeof sonnerToast.error>[1]
    ) =>
      sonnerToast.error(message, { id: ERROR_TOAST_ID, ...options }),
  }
) as typeof sonnerToast;
