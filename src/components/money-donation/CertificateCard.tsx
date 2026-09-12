'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, CheckCircle2, X } from 'lucide-react';
import Image from 'next/image';

export interface CertificateCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  benefits: string[];
  documentUrl: string;
  imageUrl?: string;
  extraImages?: string[];
}

export function CertificateCard({ title, description, icon, benefits, documentUrl, imageUrl, extraImages = [] }: CertificateCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [, setLightboxPage] = useState(0);
  
  const allPages = imageUrl ? [imageUrl, ...extraImages] : [];
  const totalPages = allPages.length;

  return (
    <>
      <motion.div 
        whileHover={{ y: -8, scale: 1.01 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col p-6 sm:p-8 rounded-3xl bg-[#fffdfa] dark:bg-[#23120a] shadow-[0_4px_24px_rgba(217,119,6,0.06)] hover:shadow-[0_18px_40px_rgba(217,119,6,0.18)] border border-amber-200/70 dark:border-amber-800/40 hover:border-amber-400/90 h-full group"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] shadow-md">
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>

        {/* Description */}
        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-6">{description}</p>

        {/* Document Thumbnail - Untouched */}
        <div className="mb-8">
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

        {/* Key Benefits - Switched to warm gold check icons with legible text */}
        <div className="flex-grow mb-8">
          <h4 className="text-sm font-bold text-foreground mb-4">Key Benefits:</h4>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-stone-700 dark:text-stone-300 font-medium">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* View All Button - Festive Saffron Outline Treatment */}
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
          className="w-full py-3 rounded-xl border border-amber-400/80 text-amber-950 dark:text-amber-100 hover:bg-gradient-to-r hover:from-[#ea580c] hover:to-[#d97706] hover:text-white hover:border-amber-500 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm shadow-xs mt-auto"
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
                  className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
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

