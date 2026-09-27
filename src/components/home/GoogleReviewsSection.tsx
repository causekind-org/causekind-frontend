"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Image from "next/image";

// Structure of a Google Review
export type GoogleReview = {
  id: string;
  author_name: string;
  author_url: string;
  profile_photo_url: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
};

// Mock data to display until the real API is connected
const MOCK_REVIEWS: GoogleReview[] = [
  {
    id: "1",
    author_name: "Rahul Sharma",
    author_url: "#",
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocL_wK50_3Y3z5=s120-c-rp-mo-ba3-br100",
    rating: 5,
    text: "Amazing initiative! The transparency is what I love the most. You can see exactly where your donation is going.",
    time: 1714567890,
    relative_time_description: "3 weeks ago"
  },
  {
    id: "2",
    author_name: "Priya Desai",
    author_url: "#",
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjWOz3=s120-c-rp-mo-ba4-br100",
    rating: 5,
    text: "Very genuine NGO doing great work for the underprivileged. I donated some books and they sent me a picture of the kids receiving them. Keep it up!",
    time: 1712345678,
    relative_time_description: "a month ago"
  },
  {
    id: "3",
    author_name: "Amit Patel",
    author_url: "#",
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocL_wK50_3Y3z5=s120-c-rp-mo-ba3-br100",
    rating: 5,
    text: "Great cause and a very dedicated team. Highly recommend everyone to support them.",
    time: 1711234567,
    relative_time_description: "2 months ago"
  },
  {
    id: "4",
    author_name: "Sneha Reddy",
    author_url: "#",
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjWOz3=s120-c-rp-mo-ba4-br100",
    rating: 5,
    text: "Such a beautiful concept! Direct impact without any middlemen. Wishing the team all the best.",
    time: 1710123456,
    relative_time_description: "3 months ago"
  },
  {
    id: "5",
    author_name: "Vikram Singh",
    author_url: "#",
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocL_wK50_3Y3z5=s120-c-rp-mo-ba3-br100",
    rating: 5,
    text: "Proud to be associated with CauseKind. The way they manage the drives is very systematic and transparent.",
    time: 1709012345,
    relative_time_description: "4 months ago"
  }
];

export function GoogleReviewsSection() {
  const [reviews, setReviews] = useState<GoogleReview[]>(MOCK_REVIEWS);
  const [loading, setLoading] = useState(false);

  // TODO: Fetch live reviews from an API route once the Google Places API Key is available
  // useEffect(() => {
  //   setLoading(true);
  //   fetch("/api/reviews")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (data && data.reviews) {
  //         setReviews(data.reviews);
  //       }
  //     })
  //     .finally(() => setLoading(false));
  // }, []);

  // To make the infinite scroll smooth, we duplicate the reviews array
  // The CSS animation will translate the container by -50% and then snap back to 0
  const doubledReviews = [...reviews, ...reviews];

  return (
    <section className="py-20 lg:py-28 overflow-hidden bg-[#fbf9f4] dark:bg-zinc-950 border-t border-stone-200/50 dark:border-stone-800/50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 mb-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-col items-center justify-center gap-5 mb-4">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-stone-900 shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              People are talking about CauseKind
            </h2>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold mr-1.5 text-stone-900 dark:text-stone-100">5.0</span>
              {[...Array(5)].map((_, idx) => (
                <Star
                  key={idx}
                  className="w-5 h-5 fill-[#fbbc04] text-[#fbbc04]"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              Based on 5 Google reviews
            </p>
          </div>
        </div>
      </div>

      {/* The continuous sliding container */}
      <div className="relative flex overflow-x-hidden group">
        {/* We use hover:pause to pause the animation when the user hovers over the reviews */}
        <div className="animate-stats-ticker flex gap-6 px-3 lg:gap-8 lg:px-4 group-hover:[animation-play-state:paused]" style={{ animationDuration: '40s' }}>
          {doubledReviews.map((review, i) => (
            <div
              key={`${review.id}-${i}`}
              className="w-[320px] lg:w-[400px] flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-stone-200/50 dark:border-stone-800/50 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-800 flex-shrink-0">
                  {/* Using a standard img tag here because profile photos come from an external domain (Google) 
                      and might not be configured in next.config.js for next/image */}
                  <img
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    {review.author_name}
                  </h3>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {review.relative_time_description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-4 h-4 ${idx < review.rating
                        ? "fill-[#fbbc04] text-[#fbbc04]"
                        : "fill-stone-200 text-stone-200 dark:fill-stone-700 dark:text-stone-700"
                      }`}
                  />
                ))}
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed line-clamp-4">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
