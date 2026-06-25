"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ItemsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f4f0] dark:bg-zinc-950">
      <div className="text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
