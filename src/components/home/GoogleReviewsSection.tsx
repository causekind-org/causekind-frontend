"use client";

import React, { useEffect, useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { getReviews, GoogleReviewsData, GoogleReview, SAMPLE_REVIEWS } from "@/data/googleReviews";
import { isPlaceholderPreviewHost } from "@/lib/placeholderPreview";

export function GoogleReviewsSection() {
  const [data, setData] = useState<GoogleReviewsData | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [expandedCount, setExpandedCount] = useState(0);
  
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    getReviews(controller.signal).then((res) => {
      // Staging/dev only: fall back to sample reviews when the live Google API is not configured
      if (mounted) setData(res ?? (isPlaceholderPreviewHost() ? SAMPLE_REVIEWS : null));
    });

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    
    const handler = (e: MediaQueryListEvent) => {
      if (mounted) setPrefersReducedMotion(e.matches);
    };
    
    mql.addEventListener('change', handler);
    return () => {
      mounted = false;
      controller.abort();
      mql.removeEventListener('change', handler);
    };
  }, []);

  if (!data) return null;

  const isPaused = expandedCount > 0;

  return (
    <section className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] py-16 sm:py-24 overflow-hidden transition-colors">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .marquee-scroll {
          animation: scroll-left 50s linear infinite;
        }
        @media (hover: hover) and (pointer: fine) {
          .marquee-scroll:hover {
            animation-play-state: paused;
          }
        }
        .marquee-paused {
          animation-play-state: paused !important;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 w-full flex flex-col items-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white mb-3 text-center">
          Reviews from Google Maps
        </h2>
        
        {/* Rating Pill */}
        <a 
          href={data.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-4 py-2 mt-2 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-800 rounded-full shadow-sm hover:shadow-md transition-shadow group"
        >
          <span translate="no" className="text-sm font-normal whitespace-nowrap text-[#5E5E5E] dark:text-white">Google Maps</span>
          <div className="flex items-center gap-1 text-[#fbbc04]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(data.overallRating) ? 'fill-current' : 'fill-transparent'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{data.overallRating}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">({data.totalReviews} reviews)</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors" />
        </a>

        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300 text-center">Up to 5 reviews, ordered by relevance by Google. <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline">See all reviews</a></p>
        {data.attributions.map((attribution, index) => (
          <p key={index} className="text-sm text-stone-600 dark:text-stone-300">
            {attribution.providerUri ? <a href={attribution.providerUri} target="_blank" rel="noopener noreferrer">{attribution.provider}</a> : attribution.provider}
          </p>
        ))}
        {/* Carousel / Marquee */}
        <div className="w-full mt-10 sm:mt-14 relative">
          {prefersReducedMotion ? (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {data.reviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review} 
                  onExpandChange={(expanded) => setExpandedCount(prev => prev + (expanded ? 1 : -1))}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden w-full">
              <div className={`flex w-max marquee-scroll ${isPaused ? 'marquee-paused' : ''}`}>
                {/* First set */}
                <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6">
                  {data.reviews.map((review) => (
                    <ReviewCard 
                      key={review.id} 
                      review={review} 
                      onExpandChange={(expanded) => setExpandedCount(prev => prev + (expanded ? 1 : -1))}
                    />
                  ))}
                </div>
                {/* Second set (duplicate for seamless loop) */}
                <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6" aria-hidden="true">
                  {data.reviews.map((review) => (
                    <ReviewCard 
                      key={`dup-${review.id}`} 
                      review={review} 
                      onExpandChange={(expanded) => setExpandedCount(prev => prev + (expanded ? 1 : -1))}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, onExpandChange }: { review: GoogleReview, onExpandChange?: (expanded: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  
  const handleToggle = () => {
    const newState = !expanded;
    setExpanded(newState);
    onExpandChange?.(newState);
  };

  const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : "A";
  
  // Generating a seeded color based on name for the avatar
  const getAvatarColor = (name: string) => {
    const colors = ["bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-rose-500"];
    const sum = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  return (
    <div className="w-[280px] sm:w-[320px] md:w-[350px] lg:w-[340px] shrink-0 bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-6 rounded-2xl flex flex-col shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-0.5 text-[#fbbc04]">
          {[...Array(5)].map((_, i) => (
             <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'fill-transparent text-stone-300'}`} />
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-70">
           <span translate="no" className="text-xs font-normal whitespace-nowrap text-[#5E5E5E] dark:text-white">Google Maps</span>
        </div>
      </div>
      
      <div className="flex-1 mb-4">
        <p className={`text-sm text-stone-600 dark:text-stone-300 leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
          {review.text || 'This reviewer left a rating without a comment.'}
        </p>
        {review.text.length > 150 && (
          <button 
            onClick={handleToggle}
            className="mt-1 text-xs font-semibold text-[#b04a15] hover:underline"
          >
            {expanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      <div className="w-full h-px bg-stone-100 dark:bg-stone-800 mb-4" />

      <div className="flex items-center gap-3">
        {review.avatarUrl && failedAvatarUrl !== review.avatarUrl ? (
          <img
            src={review.avatarUrl}
            alt={review.name}
            referrerPolicy="no-referrer"
            onError={() => setFailedAvatarUrl(review.avatarUrl ?? null)}
            className="w-10 h-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(review.name)}`}>
            {getInitial(review.name)}
          </div>
        )}
        <div className="flex flex-col">
          {review.authorUrl ? <a href={review.authorUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-stone-900 dark:text-stone-100 hover:underline">{review.name}</a> : <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{review.name}</span>}
          <span className="text-xs text-stone-500 dark:text-stone-400">{review.date}</span>
          {review.reviewUrl && <a href={review.reviewUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline text-stone-600 dark:text-stone-300">View review on Google Maps</a>}
        </div>
      </div>
    </div>
  );
}
