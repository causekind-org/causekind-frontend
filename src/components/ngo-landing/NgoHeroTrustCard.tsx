"use client";

import { ShieldCheck, Handshake, Camera, MapPin } from "lucide-react";

interface TrustItem {
  icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: ShieldCheck,
    title: "Legally Verified NGOs",
    subtitle: "Documents checked before they post.",
  },
  {
    icon: Handshake,
    title: "Agreed Handover Locations",
    subtitle: "Arrange details with the donor.",
  },
  {
    icon: Camera,
    title: "Receipt Photos Required",
    subtitle: "Upload after confirming receipt.",
  },
  {
    icon: MapPin,
    title: "Matched Near You",
    subtitle: "Match availability varies by location.",
  },
];

export function NgoHeroTrustCard() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl lg:max-w-none rounded-2xl border border-ngo-100 dark:border-zinc-800 bg-ngo-50/90 dark:bg-zinc-900/80 p-3 sm:p-5 lg:px-4 lg:py-2 shadow-sm backdrop-blur-sm">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-ngo-100 dark:divide-zinc-800 lg:divide-x">
          {TRUST_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className={`group flex items-center gap-3.5 px-3 py-3 sm:py-2.5 lg:px-6 lg:py-1.5 transition-colors ${
                  idx > 0 && idx % 2 === 1 ? "sm:border-l sm:border-ngo-100 sm:dark:border-zinc-800" : ""
                }`}
              >
                {/* ~48px Circular icon badge with 1.5px ring */}
                <div className="flex size-11 sm:size-12 lg:size-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-800 ring-[1.5px] ring-ngo-300 dark:ring-ngo-700/80 text-ngo-700 dark:text-ngo-300 shadow-sm transition-all duration-200 ease-out group-hover:ring-ngo-600 group-hover:scale-105">
                  <Icon className="size-5 sm:size-5.5" strokeWidth={1.9} aria-hidden="true" />
                </div>

                {/* Text Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-[0.82rem] font-bold text-ngo-950 dark:text-stone-100 tracking-tight leading-snug">
                    {item.title}
                  </p>
                  <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 mt-0.5 leading-tight">
                    {item.subtitle}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default NgoHeroTrustCard;
