'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, CheckCircle2, ChevronDown, X } from 'lucide-react';
import Image from 'next/image';

export interface CertificateCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  benefits: string[];
  documentUrl: string;
  imageUrl?: string;
  extraImages?: string[];
}

export function CertificateCard({ title, description, icon, iconBgColor, benefits, documentUrl, imageUrl, extraImages = [] }: CertificateCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPage, setLightboxPage] = useState(0);
  // Phones only: the card body (pages, benefits, action) starts folded away so
  // all three credentials stay on one screen. From md up the body is always
  // shown and this flag is inert.
  const [expanded, setExpanded] = useState(false);
  
  const allPages = imageUrl ? [imageUrl, ...extraImages] : [];
  const totalPages = allPages.length;

  // The overlay closes on backdrop tap but had no keyboard escape, and the page
  // behind it kept scrolling under the finger on phones.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen]);

  return (
    <>
      <motion.div 
        whileHover={{ y: -8, scale: 1.01 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col p-5 md:p-8 rounded-3xl bg-white dark:bg-zinc-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] border border-stone-100 dark:border-white/10 h-full group"
      >
        {/* Header. Written out twice rather than once behind a media query so
            that the element is a real <button> exactly where it is interactive
            — a focusable control that does nothing at desktop widths would be
            worse for keyboard users than a little duplicated markup. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="md:hidden flex w-full items-start gap-3 rounded-2xl text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          <div className={`w-11 h-11 rounded-2xl flex flex-shrink-0 items-center justify-center ${iconBgColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mt-1">{description}</p>
          </div>
          <ChevronDown
            className={`w-5 h-5 flex-shrink-0 text-stone-400 dark:text-stone-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="hidden md:block">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${iconBgColor}`}>
            {icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>

          {/* Description */}
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-6">{description}</p>
        </div>

        {/* Document Thumbnail */}
        <div className={`${expanded ? 'block' : 'hidden'} md:block mt-5 mb-6 md:mt-0 md:mb-8`}>
          <h4 className="text-sm font-bold text-foreground mb-4">Document Pages:</h4>
          
          {totalPages > 0 ? (
            <motion.div
              className="relative w-36 h-24 cursor-pointer group/stack"
              style={{ perspective: '500px' }}
              whileHover="hovered"
              initial="rest"
              animate="rest"
              onClick={() => {
                setLightboxPage(0);
                setLightboxOpen(true);
              }}
            >
              {/* Back page (if 3 or more pages) */}
              {totalPages >= 3 && (
                <motion.div
                  className="absolute w-28 h-20 rounded-lg border border-stone-300 dark:border-white/20 shadow-sm origin-bottom-left overflow-hidden bg-white"
                  style={{ top: '8px', left: '16px' }}
                  variants={{
                    rest: { rotateY: -8, rotateX: 2, rotateZ: 0 },
                    hovered: { rotateY: -14, rotateX: 4, rotateZ: -3, x: 8, y: -4, scale: 0.97 }
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <Image src={allPages[2]} alt={`${title} page 3`} fill className="object-cover object-top opacity-50 group-hover/stack:opacity-100 transition-opacity" />
                </motion.div>
              )}

              {/* Middle page (if 2 or more pages) */}
              {totalPages >= 2 && (
                <motion.div
                  className="absolute w-28 h-20 rounded-lg border border-stone-300 dark:border-white/20 shadow-md origin-bottom-left overflow-hidden bg-white"
                  style={{ top: '4px', left: '8px' }}
                  variants={{
                    rest: { rotateY: -5, rotateX: 1, rotateZ: 0 },
                    hovered: { rotateY: -8, rotateX: 2, rotateZ: -1.5, x: 4, y: -2 }
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <Image src={allPages[1]} alt={`${title} page 2`} fill className="object-cover object-top opacity-70 group-hover/stack:opacity-100 transition-opacity" />
                </motion.div>
              )}

              {/* Front page */}
              <motion.div
                className="absolute w-28 h-20 bg-white dark:bg-zinc-900 rounded-lg border border-stone-200 dark:border-white/15 shadow-lg overflow-hidden origin-bottom-left"
                style={{ top: '0px', left: '0px' }}
                variants={{
                  rest: { rotateY: -2, rotateX: 0, rotateZ: 0, scale: 1 },
                  hovered: { rotateY: 2, rotateX: -1, rotateZ: 1, scale: 1.03, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' }
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Image src={allPages[0]} alt={`${title} page 1`} fill className="object-cover object-top" />
                <div className="absolute inset-0 bg-black/0 group-hover/stack:bg-black/5 transition-colors" />
                
                {/* Page badge */}
                <motion.div
                  className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-sm"
                  variants={{
                    rest: { scale: 1 },
                    hovered: { scale: 1.1 }
                  }}
                  transition={{ duration: 0.25 }}
                >
                  Page 1
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="relative w-36 h-24 bg-stone-100 dark:bg-white/10 rounded-lg border border-stone-200 dark:border-white/15 flex items-center justify-center text-xs text-stone-400">
              No Preview
            </div>
          )}
        </div>

        {/* Key Benefits */}
        <div className={`${expanded ? 'block' : 'hidden'} md:block flex-grow mb-6 md:mb-8`}>
          <h4 className="text-sm font-bold text-foreground mb-4">Key Benefits:</h4>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-stone-600">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* View All Button */}
        <button 
          type="button" 
          onClick={() => {
            if (totalPages > 0) {
              setLightboxPage(0);
              setLightboxOpen(true);
            } else {
              window.open(documentUrl, '_blank');
            }
          }}
          className={`${expanded ? 'flex' : 'hidden'} md:flex w-full py-3 rounded-xl border border-stone-200 dark:border-white/15 text-sm font-bold text-foreground hover:bg-stone-50 hover:border-stone-300 transition-colors items-center justify-center gap-2 cursor-pointer mt-auto`}
        >
          <Eye className="w-4 h-4" />
          View All
        </button>
      </motion.div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {lightboxOpen && totalPages > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} — document preview`}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <h3 className="font-bold text-lg text-foreground">Document Preview</h3>
                <button
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close document preview"
                  className="grid h-11 w-11 cursor-pointer place-items-center text-stone-400 dark:text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-white/10 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-9 sm:w-9"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-stone-50 dark:bg-zinc-900/60 gap-8">
                {allPages.map((pageImg, i) => (
                  <div key={i} className="w-full flex flex-col items-center">
                    <h4 className="font-bold text-stone-500 dark:text-stone-400 mb-3 text-sm uppercase tracking-wider">
                      Page {i + 1} of {totalPages}
                    </h4>
                    <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 shadow-md border border-stone-200">
                      <Image
                        src={pageImg}
                        alt={`Page ${i + 1}`}
                        width={1000}
                        height={1414}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
