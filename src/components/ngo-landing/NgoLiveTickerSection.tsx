"use client";

interface TickerEntry {
  id: number;
  text: string;
  timeAgo: string;
  location: string;
}

const TICKER_ENTRIES: TickerEntry[] = [
  {
    id: 1,
    text: "Ramesh just gave 5 blankets to Winter Relief Drive",
    timeAgo: "2m ago",
    location: "Kandivali, Mumbai",
  },
  {
    id: 2,
    text: "Priya just dropped off 20 notebooks at Sunrise Learning Center",
    timeAgo: "5m ago",
    location: "Kothrud, Pune",
  },
  {
    id: 3,
    text: "Farhan just gave 3 school bags to Hope Kids Palghar",
    timeAgo: "11m ago",
    location: "Palghar",
  },
  {
    id: 4,
    text: "Sneha just pledged 10 ration kits to Hope Kitchen",
    timeAgo: "18m ago",
    location: "Saidapet, Chennai",
  },
  {
    id: 5,
    text: "Arjun just gave 2 wheelchairs to Asha Foundation",
    timeAgo: "24m ago",
    location: "Thane West",
  },
  {
    id: 6,
    text: "Meera just dropped off 15 sweaters at Kopri Night Shelter",
    timeAgo: "31m ago",
    location: "Kopri, Thane",
  },
];

export function NgoLiveTickerSection() {
  return (
    <div className="pt-2 sm:pt-3">
      {/* Live activity caption header */}
      <div className="mb-3 px-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-xs font-bold text-ngo-800 dark:text-ngo-200 tracking-normal">
            Live activity
          </p>
        </div>
        <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 font-medium">
          Happening right now, near you.
        </p>
      </div>

      {/* Marquee Ticker Track */}
      <div className="relative w-full overflow-hidden mask-gradient-x -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex w-max gap-3.5 py-1 animate-marquee hover:[animation-play-state:paused]">
          {/* Repeat entries 3 times to ensure smooth infinite loop on all screen widths */}
          {[...TICKER_ENTRIES, ...TICKER_ENTRIES, ...TICKER_ENTRIES].map((entry, idx) => (
            <div
              key={`${entry.id}-${idx}`}
              className="flex items-center gap-2.5 rounded-full border border-stone-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-4 py-2 shadow-xs text-xs select-none shrink-0"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {entry.text}
              </span>
              <span className="text-3xs text-stone-400 font-mono">
                · {entry.location} ({entry.timeAgo})
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ck-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: ck-marquee 38s linear infinite;
        }
      `}</style>
    </div>
  );
}

export const NgoLiveTicker = NgoLiveTickerSection;
export default NgoLiveTickerSection;
