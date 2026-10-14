import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

/** Only for a real 404: the drive does not exist (or is not visible to this account). */
export function DriveNotFound({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-stone-300 dark:text-zinc-600" aria-hidden="true" />
      <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Drive not found</h2>
      <p className="mt-2 text-stone-500 dark:text-stone-400">This drive might have ended or been removed.</p>
      <Link href={backHref} className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-6 text-sm font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900">
        {backLabel}
      </Link>
    </div>
  );
}

/** Any other failure: say what went wrong and let the person try again. */
export function DriveLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto my-12 max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <h2 className="text-lg font-bold text-red-900 dark:text-red-200">We couldn&apos;t load this drive</h2>
      <p className="mt-2 text-sm text-red-800 dark:text-red-300">{message}</p>
      <button type="button" onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800">
        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
