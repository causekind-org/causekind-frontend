"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Handshake,
  CheckCircle2,
  Camera,
  Award,
  Check,
  Star,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ProofCard } from "./proofGalleryData";

interface NgoProofDetailDialogProps {
  card: ProofCard | null;
  isOpen: boolean;
  onClose: () => void;
}

const TIMELINE_ICONS = [FileText, Handshake, CheckCircle2, Camera, Award];

const PROOF_CRITERIA = [
  "The items are clearly visible being handed over",
  "The count matches what was requested",
  "Location and time were tagged automatically",
  "Uploaded within 48 hours of the handover",
  "People's faces are shown only with their consent",
];

export function NgoProofDetailDialog({
  card,
  isOpen,
  onClose,
}: NgoProofDetailDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Touch tracking for swipe gestures
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reference for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Reset photo index when card changes
  useEffect(() => {
    if (isOpen) {
      setActivePhotoIdx(0);
    }
  }, [isOpen, card?.id]);

  // Manage body scroll locking, history state (for mobile back button), and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Snapshot currently focused element to restore focus on close
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Push history state so browser/phone Back button closes the dialog instead of navigating away
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("proof") && card) {
      window.history.pushState({ proofModalOpen: true, proofId: card.id }, "");
    }

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    // Auto-focus close button or dialog container
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("popstate", handlePopState);

      // Restore focus to opener element
      if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === "function") {
        lastActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, card]);

  // Keyboard navigation (Esc to close, Left/Right arrow for photos, Tab focus trap)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (!card) return;
      const totalPhotos = card.detail.photos.length;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActivePhotoIdx((prev) => (prev - 1 + totalPhotos) % totalPhotos);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActivePhotoIdx((prev) => (prev + 1) % totalPhotos);
      } else if (e.key === "Tab") {
        // Focus trap
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [card, onClose]
  );

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null || !card) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // min distance for swipe
    const totalPhotos = card.detail.photos.length;

    if (diff > threshold) {
      // Swiped Left -> Next Photo
      setActivePhotoIdx((prev) => (prev + 1) % totalPhotos);
    } else if (diff < -threshold) {
      // Swiped Right -> Prev Photo
      setActivePhotoIdx((prev) => (prev - 1 + totalPhotos) % totalPhotos);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!card) return null;

  const { detail } = card;
  const currentPhoto = detail.photos[activePhotoIdx] || detail.photos[0];
  const totalPhotos = detail.photos.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="proof-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-6"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop (closes on click on desktop) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm -z-10"
            aria-hidden="true"
          />

          {/* Dialog Card Container */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="relative w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-[1000px] bg-white dark:bg-zinc-900 lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-stone-200/80 dark:border-zinc-800 focus:outline-none"
            tabIndex={-1}
          >
            {/* Sticky/Fixed Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close proof detail dialog"
              className="absolute top-3.5 right-3.5 z-30 h-11 w-11 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ─────────────────────────────────────────────────────────────
                LEFT COLUMN: Photos Gallery (~55% width on desktop)
                ───────────────────────────────────────────────────────────── */}
            <div className="w-full lg:w-[55%] bg-stone-950 flex flex-col justify-between shrink-0 select-none relative">
              {/* Main Photo Area */}
              <div
                className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-[480px] bg-stone-900 overflow-hidden flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Image
                  src={currentPhoto.src}
                  alt={currentPhoto.alt}
                  fill
                  priority={activePhotoIdx === 0}
                  loading={activePhotoIdx === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 1024px) 100vw, 550px"
                  className="object-cover"
                />

                {/* Subtle vignette for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                {/* Photo Meta Tag: Corner Badge with date · time · area */}
                <div className="absolute bottom-3.5 left-3.5 right-16 flex items-center gap-2 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/65 backdrop-blur-md text-white text-3xs font-medium border border-white/15 shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {currentPhoto.date} · {currentPhoto.time} · {currentPhoto.area}
                    </span>
                  </span>
                </div>

                {/* Photo Counter Badge (e.g. 1 / 4) */}
                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-3xs font-mono font-bold border border-white/15">
                    {activePhotoIdx + 1} / {totalPhotos}
                  </span>
                </div>

                {/* Desktop Prev / Next Carousel Arrows */}
                {totalPhotos > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIdx((prev) => (prev - 1 + totalPhotos) % totalPhotos)}
                      aria-label="Previous photo"
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition border border-white/15 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIdx((prev) => (prev + 1) % totalPhotos)}
                      aria-label="Next photo"
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition border border-white/15 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Row (Desktop & Tablet) */}
              {totalPhotos > 1 && (
                <div className="p-3 bg-stone-900/90 border-t border-white/10 hidden sm:flex items-center gap-2 overflow-x-auto">
                  {detail.photos.map((photo, idx) => (
                    <button
                      key={`thumb-${idx}`}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      aria-label={`View photo ${idx + 1}`}
                      className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition shrink-0 focus:outline-none ${
                        idx === activePhotoIdx
                          ? "border-emerald-400 ring-2 ring-emerald-400/40 opacity-100 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────────
                RIGHT COLUMN: Details & Verification Proof (~45% width, scrolls)
                ───────────────────────────────────────────────────────────── */}
            <div className="w-full lg:w-[45%] flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-stone-900 dark:text-stone-100 max-h-[calc(100vh-280px)] lg:max-h-[90vh]">
              
              {/* Category & Title */}
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-4xs font-black uppercase tracking-wider bg-ngo-700 text-white mb-2">
                  {card.category}
                </span>
                <h3
                  id="proof-dialog-title"
                  className="text-lg sm:text-xl font-bold leading-snug text-stone-900 dark:text-stone-100"
                  style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
                >
                  {card.requested}
                </h3>
              </div>

              {/* 2. REQUESTED VS DELIVERED */}
              <div className="rounded-2xl bg-stone-50 dark:bg-zinc-800/60 p-4 border border-stone-200/80 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  <span>Needed: {detail.requestedItem}</span>
                  <span className="text-ngo-700 dark:text-ngo-300 font-mono">
                    Delivered: {detail.deliveredQuantity} of {detail.requestedQuantity}
                  </span>
                </div>
                {/* 100% Progress Bar in ngo-700 */}
                <div className="h-2.5 w-full bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-ngo-700 rounded-full w-full" />
                </div>
              </div>

              {/* 3. TIMELINE (5 Completed Steps matching Gift Journey Tracker) */}
              <div className="space-y-3">
                <h4 className="text-3xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Verified Fulfillment Timeline
                </h4>
                <div className="space-y-2.5 relative pl-2">
                  {detail.timeline.map((item, idx) => {
                    const StepIcon = TIMELINE_ICONS[idx] || CheckCircle2;
                    return (
                      <div key={`tl-${idx}`} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1 flex items-center justify-between text-xs min-w-0">
                          <span className="font-semibold text-stone-800 dark:text-stone-200 truncate flex items-center gap-1.5">
                            <StepIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{item.step}</span>
                          </span>
                          <span className="text-3xs font-mono font-bold text-stone-500 dark:text-stone-400 shrink-0 ml-2">
                            {item.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. WHO IT HELPED (Place & Count only, no beneficiary names) */}
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3.5 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-3xs uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300">
                    Community Impact
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-950 dark:text-emerald-100 mt-0.5">
                    {detail.helped}
                  </p>
                </div>
              </div>

              {/* 5. THE NGO */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                    {detail.ngo.name}
                  </span>
                  {detail.ngo.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-4xs font-bold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{detail.ngo.impactScore.toFixed(1)}</span>
                </div>
              </div>

              {/* 6. THE DONORS */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {detail.donors.count} donors confirmed
                  </span>
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {detail.donors.initials.map((init, idx) => (
                      <span
                        key={`init-${idx}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ngo-700 text-white text-4xs font-bold border-2 border-white dark:border-zinc-900 shadow-sm"
                      >
                        {init}
                      </span>
                    ))}
                    {detail.donors.remainingCount > 0 && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-stone-300 text-4xs font-bold border-2 border-white dark:border-zinc-900 shadow-sm">
                        +{detail.donors.remainingCount}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-3xs text-stone-500 dark:text-stone-400">
                  Each received this photo and an impact certificate.
                </p>
              </div>

              {/* 7. NOTE FROM THE NGO */}
              <div className="p-4 rounded-2xl bg-stone-100/70 dark:bg-zinc-800/40 border-l-4 border-ngo-700 space-y-1">
                <p
                  className="text-xs sm:text-sm italic text-stone-800 dark:text-stone-200 leading-relaxed font-serif"
                  style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
                >
                  &ldquo;{detail.ngoNote}&rdquo;
                </p>
                <p className="text-3xs font-bold text-stone-500 dark:text-stone-400">
                  — {detail.ngo.name}
                </p>
              </div>

              {/* 8. WHY THIS IS GREAT PROOF (Guidance Box) */}
              <div className="rounded-2xl bg-ngo-50 dark:bg-ngo-950/40 border border-ngo-200 dark:border-ngo-800/60 p-4 space-y-2.5">
                <h5 className="text-3xs font-bold uppercase tracking-wider text-ngo-900 dark:text-ngo-200">
                  Why this is great proof
                </h5>
                <ul className="space-y-1.5 text-2xs sm:text-xs text-ngo-950 dark:text-ngo-100">
                  {PROOF_CRITERIA.map((criterion, idx) => (
                    <li key={`crit-${idx}`} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-ngo-700 dark:text-ngo-300 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default NgoProofDetailDialog;
