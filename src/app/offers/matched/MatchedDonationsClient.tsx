"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMyItemListings, getMyMatches, type ItemListing, type ItemMatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { findMatchForListing, isCompletedMatch, getListingCompletionDate } from "@/lib/matchedDonations";

type ItemWithMatch = {
  item: ItemListing;
  match: ItemMatch | null;
};

export default function MatchedDonationsClient() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [listings, matches] = await Promise.all([
        getMyItemListings().catch(() => [] as ItemListing[]),
        getMyMatches().catch(() => [] as ItemMatch[]),
      ]);

      const fulfilled = listings.filter((l) => ["FULFILLED", "DONATED"].includes(l.status));
      const itemsWithMatches = fulfilled
        .map((item) => ({
          item,
          match: findMatchForListing(item, matches),
        }))
        .sort((a, b) => {
          const timeA = new Date(getListingCompletionDate(a.item, a.match)).getTime();
          const timeB = new Date(getListingCompletionDate(b.item, b.match)).getTime();
          return timeB - timeA;
        });

      setItems(itemsWithMatches);
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }

  useEntityUpdates(["MATCH", "LISTING"], () => {
    if (!user) return;
    loadData();
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const role = (user.role ?? "").replace(/^ROLE_/, "");
    if (role === "DONEE") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:pt-8">
        <Link
          href="/dashboard#offers"
          className="group -ml-1 mb-3 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-stone-100 dark:text-stone-400"
        >
          <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to dashboard</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">My Matched Donations</h1>
          <p className="text-sm text-gray-500">Your listed items that were matched and donated.</p>
        </div>

        {loading && <p className="text-center text-gray-400 py-5 sm:py-8 animate-pulse">Loading matched donations...</p>}

        {!loading && items.length === 0 && (
          <div className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">No fulfilled items yet.</p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {items.map(({ item, match }) => {
            const hasCertificate = isCompletedMatch(match);
            const completionDate = getListingCompletionDate(item, match);

            return (
              <div key={item.id} className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                        FULFILLED
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}{item.city ? ` · ${item.city}` : ""}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.quantity}× · {item.condition ?? "Condition not set"}
                    </p>
                    {completionDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        Completed {new Date(completionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {hasCertificate && match && (
                      <Link
                        href={`/certificate?matchId=${match.id}`}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white text-center hover:bg-green-700 transition-colors"
                      >
                        Certificate
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
