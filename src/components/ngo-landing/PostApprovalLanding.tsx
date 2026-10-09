"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Camera,
  Users,
  CheckCircle2,
  PackagePlus,
  Truck,
  FileCheck,
  ChevronRight,
  Activity,
  Box,
  Image as ImageIcon,
  CheckCircle,
  FileText,
  BadgeCheck,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  Lock
} from "lucide-react";
import type { NgoStatusData } from "./useNgoStatus";
import { StartDriveLink } from "./StartDriveLink";

const METRIC_CARDS = [
  { id: "activeRequests", title: "Live Drives", icon: Activity, href: "/profile/my-needs" },
  { id: "itemsPledged", title: "Items Pledged", icon: Box, href: "/profile/my-needs" },
  { id: "dropoffsToConfirm", title: "Drop-offs to Confirm", icon: Truck, href: "/ngo/handovers" },
  { id: "photosDue", title: "Photos Due", icon: Camera, href: "/ngo/handovers" },
];

export function PostApprovalLanding({ status }: { status: NgoStatusData }) {
  const [activeStep, setActiveStep] = useState(0);

  const journeySteps = [
    {
      title: "You start a drive",
      desc: "Submit the required items, quantity, and intended use.",
      detail: "Define your exact needs. Describe what your community needs most right now so nearby givers know how to help."
    },
    {
      title: "Donors nearby pledge them",
      desc: "Eligible donors respond to the listed needs.",
      detail: "Donors in your city browse local drives and commit to providing specific items you have requested."
    },
    {
      title: "They drop off, and you confirm receipt",
      desc: "Coordinate the handover and confirm receipt.",
      detail: "Use our integrated tools to agree on a drop-off time. Mark items as received once they physically arrive."
    },
    {
      title: "You upload a handover photo",
      desc: "Provide the required photo evidence.",
      detail: "Snap a quick photo of the items received (no faces needed) to complete the transparency loop for the donor."
    },
    {
      title: "Completed handovers become eligible for certificates",
      desc: "Eligibility depends on completion checks.",
      detail: "Once verified, you may issue a digital certificate to the donor in recognition of their contribution."
    }
  ];

  return (
    <div className="flex flex-col w-full pb-24">
      {/* 2.1 — Hero: You're Verified */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#FAF8F3]">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/ngo-hero-landing.jpg"
            alt="Community action"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent dark:from-black/90 dark:via-black/70" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-20 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-3/5">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176B50]/90 backdrop-blur-md border border-[#A8DEC8]/30 mb-8 shadow-lg"
            >
              <BadgeCheck className="w-5 h-5 text-[#A8DEC8]" />
              <span className="text-white font-medium text-sm tracking-wide">Verified by CauseKind</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-5xl md:text-7xl font-serif text-white leading-[1.1] tracking-tight text-shadow-sm"
            >
              You're verified.
              <br />
              <span className="text-[#A8DEC8] italic">
                Let givers nearby find you.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="mt-6 text-xl md:text-2xl text-stone-200 max-w-2xl font-light text-shadow-sm"
            >
              Post what your organization needs. Our team reviews the drive before it goes live to nearby givers. Track accepted handovers through your account.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <StartDriveLink href="/ngo/drives/new" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-[#176B50] bg-white rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-xl">
                <span className="relative z-10 flex items-center gap-2">
                  Start a Drive
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </StartDriveLink>
              
              <Link
                href={status.wizardHref}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors border border-white/20"
              >
                View My Application
              </Link>
            </motion.div>
            
            {status.lockReason && !status.canPostRequest && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-900/60 backdrop-blur-md rounded-lg border border-stone-700/50"
              >
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-stone-200">{status.lockReason}</span>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="lg:w-2/5 w-full max-w-md hidden md:block"
          >
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl shadow-black/40 border border-stone-200/20 dark:border-stone-800/50 backdrop-blur-xl transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-6 border-b border-stone-100 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#176B50]/10 flex items-center justify-center">
                    <PackagePlus className="w-5 h-5 text-[#176B50] dark:text-[#A8DEC8]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Sample Drive Preview</div>
                    <div className="text-xs text-stone-500">How givers see it</div>
                  </div>
                </div>
                <div className="w-16 h-6 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Live</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded w-3/4"></div>
                <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded w-full"></div>
                <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded w-5/6"></div>
                
                <div className="pt-4 flex gap-2">
                  <div className="h-8 bg-[#176B50]/10 rounded w-1/3"></div>
                  <div className="h-8 bg-stone-100 dark:bg-stone-800 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2.2 — Trust and Safety Strip */}
      <section className="w-full bg-[#176B50] border-b border-[#0F513D]">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex overflow-x-auto py-6 hide-scrollbar snap-x snap-mandatory">
            <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-8 min-w-max md:min-w-0 w-full px-4 md:px-0">
              {[
                { icon: ShieldCheck, title: "Legally Verified NGOs" },
                { icon: MapPin, title: "Agreed Handover Locations" },
                { icon: Camera, title: "Receipt Photos Required" },
                { icon: Users, title: "Matched Near You" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 snap-start group cursor-default">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-[#A8DEC8] group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-[#EFF7F1] whitespace-nowrap md:whitespace-normal group-hover:text-white transition-colors">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2.3 — At a Glance Dashboard */}
      <section className="py-20 bg-[#FAF8F3] dark:bg-[#09090b]">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-serif text-stone-900 dark:text-stone-100 mb-8">At a glance</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {METRIC_CARDS.map((metric, i) => {
              const value = (status as any)[metric.id] ?? 0;
              return (
                <Link key={i} href={metric.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md border border-stone-200/80 dark:border-stone-800 transition-all group h-full flex flex-col justify-between"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#EFF7F1] dark:bg-[#176B50]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <metric.icon className="w-6 h-6 text-[#176B50] dark:text-[#A8DEC8]" />
                    </div>
                    <div>
                      <div className="text-4xl md:text-5xl font-light text-stone-900 dark:text-stone-100 mb-2 font-serif">
                        {value}
                      </div>
                      <div className="text-stone-500 dark:text-stone-400 font-medium text-sm md:text-base group-hover:text-[#176B50] dark:group-hover:text-[#A8DEC8] transition-colors">
                        {metric.title}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2.4 — Get Verified. Post. Deliver. (Verified State) */}
      <section className="py-24 bg-white dark:bg-stone-900 border-y border-stone-100 dark:border-stone-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl font-serif text-stone-900 dark:text-stone-100 mb-4">
              Get verified. Post. Deliver.
            </h2>
            <p className="text-lg text-stone-600 dark:text-stone-400">
              Your organization is verified. Here is where you stand.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1: Completed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-3xl bg-[#EFF7F1] dark:bg-[#176B50]/5 border border-[#176B50]/20"
            >
              <div className="absolute top-8 right-8 text-[#176B50]/10 dark:text-[#A8DEC8]/10 font-serif text-8xl leading-none select-none">1</div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#176B50] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#176B50]/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4">Get Verified</h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                  You have successfully submitted your legal documents and passed our verification checks.
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#176B50] text-white shadow-sm">
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Completed
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={`relative p-8 rounded-3xl border ${status.canStartDrive ? 'bg-[#FAF8F3] dark:bg-stone-950 border-[#176B50]/30 shadow-md' : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-80'}`}
            >
              <div className="absolute top-8 right-8 text-stone-200 dark:text-stone-800/50 font-serif text-8xl leading-none select-none">2</div>
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${status.canStartDrive ? 'bg-[#176B50] text-white shadow-lg' : 'bg-stone-200 dark:bg-stone-800 text-stone-500'}`}>
                  <PackagePlus className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  Post What You Need
                  {!status.canStartDrive && <Lock className="w-4 h-4 text-stone-400" />}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                  Describe the required items, quantities, and intended use. Our team reviews the drive before it goes live.
                </p>
                {status.canStartDrive ? (
                  <StartDriveLink href="/ngo/drives/new" className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-[#176B50] text-white hover:bg-[#0F513D] transition-colors shadow-sm">
                    Start a Drive
                  </StartDriveLink>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-200/50 dark:bg-stone-800/50 text-stone-500">
                    {status.lockReason || "Locked until current drive completes"}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className={`relative p-8 rounded-3xl border ${status.isPhotosDue ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' : 'bg-[#FAF8F3] dark:bg-stone-950 border-stone-200 dark:border-stone-800'}`}
            >
              <div className="absolute top-8 right-8 text-stone-200 dark:text-stone-800/50 font-serif text-8xl leading-none select-none">3</div>
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${status.isPhotosDue ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-stone-800 dark:bg-stone-700 text-white shadow-lg'}`}>
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4">
                  Deliver, Then Prove It
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                  Coordinate handovers, confirm receipt, and provide the required photo evidence to unlock new drives.
                </p>
                {status.isPhotosDue ? (
                  <Link href="/ngo/handovers" className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm">
                    Upload Photos Due
                  </Link>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#EFF7F1] dark:bg-[#176B50]/10 text-[#176B50] dark:text-[#A8DEC8]">
                    No photos currently due
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2.5 — What Happens After You Post? */}
      <section className="py-24 bg-[#FAF8F3] dark:bg-stone-950">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-stone-900 dark:text-stone-100 mb-4">
              What happens after you post?
            </h2>
            <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
              From starting a drive to donor handover, every step is direct, transparent, and documented with photo proof.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
            {/* Timeline */}
            <div className="w-full lg:w-1/2 relative">
              <div className="absolute left-[23px] top-8 bottom-8 w-[2px] bg-stone-200 dark:bg-stone-800" />
              
              <div className="space-y-6 relative z-10">
                {journeySteps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex gap-6 cursor-pointer group"
                    onClick={() => setActiveStep(idx)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${activeStep === idx ? 'bg-[#176B50] text-white shadow-lg' : 'bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-stone-400 group-hover:border-[#176B50] group-hover:text-[#176B50]'}`}>
                      {activeStep > idx ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-serif text-lg">{idx + 1}</span>}
                    </div>
                    <div className={`pt-2 transition-all duration-300 ${activeStep === idx ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                      <h3 className={`text-xl font-medium mb-2 ${activeStep === idx ? 'text-[#176B50] dark:text-[#A8DEC8]' : 'text-stone-900 dark:text-stone-100'}`}>
                        {step.title}
                      </h3>
                      <p className="text-stone-600 dark:text-stone-400">
                        {step.desc}
                      </p>
                      
                      <AnimatePresence>
                        {activeStep === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-4 text-sm text-stone-500 dark:text-stone-500">
                              {step.detail}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Preview */}
            <div className="w-full lg:w-1/2 sticky top-32">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 shadow-xl shadow-black/5 border border-stone-200/60 dark:border-stone-800 aspect-square flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#176B50]/10 to-transparent rounded-bl-full" />
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    {activeStep === 0 && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#176B50]/10 rounded-2xl flex items-center justify-center mb-6 text-[#176B50]">
                          <FileText className="w-12 h-12" />
                        </div>
                        <h4 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-2">Creating your drive</h4>
                        <p className="text-stone-500 max-w-sm mx-auto">Fill out a simple form detailing exactly what items you need and why.</p>
                      </div>
                    )}
                    {activeStep === 1 && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#176B50]/10 rounded-2xl flex items-center justify-center mb-6 text-[#176B50]">
                          <Users className="w-12 h-12" />
                        </div>
                        <h4 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-2">Connecting donors</h4>
                        <p className="text-stone-500 max-w-sm mx-auto">Your drive appears to verified local givers who can fulfill your requests.</p>
                      </div>
                    )}
                    {activeStep === 2 && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#176B50]/10 rounded-2xl flex items-center justify-center mb-6 text-[#176B50]">
                          <MapPin className="w-12 h-12" />
                        </div>
                        <h4 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-2">Coordinating handover</h4>
                        <p className="text-stone-500 max-w-sm mx-auto">Chat safely with the donor to arrange a drop-off at your registered location.</p>
                      </div>
                    )}
                    {activeStep === 3 && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#176B50]/10 rounded-2xl flex items-center justify-center mb-6 text-[#176B50]">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                        <h4 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-2">Uploading proof</h4>
                        <p className="text-stone-500 max-w-sm mx-auto">Take a photo of the received items to unlock your next drive.</p>
                      </div>
                    )}
                    {activeStep === 4 && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-[#176B50]/10 rounded-full flex items-center justify-center mb-6 text-[#176B50] ring-8 ring-[#176B50]/5">
                          <BadgeCheck className="w-12 h-12" />
                        </div>
                        <h4 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-2">Certificate eligibility</h4>
                        <p className="text-stone-500 max-w-sm mx-auto">Successful handovers allow you to issue certificates to your donors.</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                  {journeySteps.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${activeStep === idx ? 'w-8 bg-[#176B50]' : 'w-2 bg-stone-200 dark:bg-stone-800'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2.6 — Keep a Clear Record */}
      <section className="py-12 bg-white dark:bg-stone-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-[#EFF7F1] dark:bg-[#176B50]/5 border border-[#176B50]/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-[#176B50]/40 transition-colors">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-[#176B50]/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Camera className="w-6 h-6 text-[#176B50] dark:text-[#A8DEC8]" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-2">Keep a clear record of each handover.</h3>
                <p className="text-stone-600 dark:text-stone-400 max-w-xl">
                  Confirm receipt after items arrive and upload a clear photo without exposing people's faces or private documents.
                </p>
              </div>
            </div>
            <Link 
              href="/ngo/handovers" 
              className="flex-shrink-0 inline-flex items-center text-[#176B50] dark:text-[#A8DEC8] font-medium hover:underline group-hover:translate-x-1 transition-transform"
            >
              View your handovers and photos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2.7 — Organization Verification Summary */}
      <section className="py-12 bg-[#FAF8F3] dark:bg-[#09090b]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="border-t border-stone-200 dark:border-stone-800 pt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#176B50] flex items-center justify-center shadow-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-stone-900 dark:text-stone-100">{status.ngoName}</h4>
                <p className="text-sm text-stone-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#176B50] dark:text-[#A8DEC8]" />
                  Verified Organization
                </p>
              </div>
            </div>
            
            <Link 
              href={status.wizardHref}
              className="inline-flex items-center text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-[#176B50] dark:hover:text-[#A8DEC8] transition-colors bg-white dark:bg-stone-900 px-4 py-2 rounded-full border border-stone-200 dark:border-stone-800 hover:border-[#176B50]/30"
            >
              View Your Application
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
