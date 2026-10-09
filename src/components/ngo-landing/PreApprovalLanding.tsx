"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  MapPin,
  Camera,
  Users,
  XCircle,
  CheckCircle2,
  FileCheck,
  PackagePlus,
  Truck,
  ScanSearch,
  Scale,
  Handshake,
  Image as ImageIcon,
  ChevronRight,
  Clock,
  AlertCircle
} from "lucide-react";
import type { NgoStatusData } from "./useNgoStatus";

export function PreApprovalLanding({ status }: { status: NgoStatusData }) {
  return (
    <div className="flex flex-col w-full pb-24">
      {/* 1.1 — Hero: Post What You Need */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#FAF8F3]">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/ngo-hero-landing.jpg"
            alt="Volunteers and community members"
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F3]/80 via-[#FAF8F3]/90 to-[#FAF8F3] dark:from-[#09090b]/80 dark:via-[#09090b]/90 dark:to-[#09090b]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pt-20">
          <div className="max-w-4xl">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-5xl md:text-7xl lg:text-8xl font-serif text-stone-900 dark:text-stone-100 leading-[1.1] tracking-tight"
            >
              Post what you need.
              <br />
              <span className="text-[#176B50] dark:text-[#A8DEC8] italic">
                Connect with givers nearby.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="mt-8 text-xl md:text-2xl text-stone-600 dark:text-stone-400 max-w-2xl font-light"
            >
              Create a free organization profile. Once verified by our team, you can publish structured needs directly to donors in your community.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              <Link
                href={status.wizardHref}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-[#176B50] rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-[#176B50]/20"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {status.status === "incomplete" ? "Start Your Application" : "View My Application"}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-[#0F513D] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out" />
              </Link>

              <div className="flex flex-col">
                <button
                  disabled
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-stone-400 bg-stone-200/50 dark:bg-stone-800/50 rounded-full cursor-not-allowed border border-stone-300 dark:border-stone-700"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Start a Drive
                </button>
                <span className="text-sm text-stone-500 dark:text-stone-400 mt-2 px-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#176B50] dark:text-[#A8DEC8]" />
                  Available once CauseKind verifies your NGO
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1.2 — Trust and Safety Strip */}
      <section className="w-full bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex overflow-x-auto py-8 hide-scrollbar snap-x snap-mandatory">
            <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-8 min-w-max md:min-w-0 w-full px-4 md:px-0">
              {[
                { icon: ShieldCheck, title: "Legally Verified NGOs" },
                { icon: MapPin, title: "Agreed Handover Locations" },
                { icon: Camera, title: "Receipt Photos Required" },
                { icon: Users, title: "Matched Near You" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 snap-start group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#176B50]/20 bg-[#EFF7F1] dark:bg-[#176B50]/10 flex items-center justify-center group-hover:bg-[#176B50] group-hover:border-[#176B50] transition-colors duration-300">
                    <item.icon className="w-6 h-6 text-[#176B50] dark:text-[#A8DEC8] group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap md:whitespace-normal">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 1.3 — Sound Familiar? Comparison Section */}
      <section className="py-24 bg-[#FAF8F3] dark:bg-stone-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif text-stone-900 dark:text-stone-100">
              You post your needs. <span className="italic text-[#176B50] dark:text-[#A8DEC8]">Then what?</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 relative">
            {/* The Usual Way */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white dark:bg-stone-900 rounded-3xl p-8 md:p-10 shadow-sm border border-stone-200/60 dark:border-stone-800"
            >
              <h3 className="text-2xl font-medium mb-8 text-stone-800 dark:text-stone-200 flex items-center gap-3">
                <div className="w-2 h-8 bg-red-400/80 rounded-full" />
                The Usual Way
              </h3>
              <ul className="space-y-6">
                {[
                  "Post on WhatsApp groups and hope.",
                  "Donors aren't sure whether the organization is genuine.",
                  "Organizations receive things they did not request.",
                  "There is no reliable record of who gave what."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <XCircle className="w-6 h-6 text-red-400/80 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 dark:text-stone-400 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-[#FAF8F3] dark:bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-sm text-stone-400 font-serif italic text-lg">
              vs
            </div>

            {/* The CauseKind Way */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-[#176B50] rounded-3xl p-8 md:p-10 shadow-xl shadow-[#176B50]/10 border border-[#1F7A5D]"
            >
              <h3 className="text-2xl font-medium mb-8 text-white flex items-center gap-3">
                <div className="w-2 h-8 bg-[#A8DEC8] rounded-full" />
                The CauseKind Way
              </h3>
              <ul className="space-y-6">
                {[
                  "Reviewed drives can reach nearby donors.",
                  "Verified status builds donor confidence.",
                  "Donors can respond to listed needs.",
                  "Handovers are tracked through completion checks."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-[#A8DEC8] flex-shrink-0 mt-0.5" />
                    <span className="text-[#EFF7F1] leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1.4 — Get Verified. Post. Deliver. */}
      <section className="py-24 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-serif text-stone-900 dark:text-stone-100 mb-4"
            >
              Get verified. Post. Deliver.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-stone-600 dark:text-stone-400"
            >
              From legal verification to community handovers, here is how CauseKind supports your mission.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-3xl bg-[#FAF8F3] dark:bg-stone-950 border border-[#176B50]/20"
            >
              <div className="absolute top-8 right-8 text-[#176B50]/10 dark:text-[#A8DEC8]/10 font-serif text-8xl leading-none select-none">
                1
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#176B50] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#176B50]/20">
                  <FileCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4">Get Verified</h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                  Submit legal registration documents once. The team reviews the application and verifies the organization's details.
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#176B50]/10 text-[#176B50] dark:bg-[#A8DEC8]/10 dark:text-[#A8DEC8]">
                  {status.status === "incomplete" ? "Action Required" : "Pending Review"}
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative p-8 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 opacity-75"
            >
              <div className="absolute top-8 right-8 text-stone-200 dark:text-stone-800 font-serif text-8xl leading-none select-none">
                2
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 dark:bg-stone-800 text-stone-500 flex items-center justify-center mb-8">
                  <PackagePlus className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  Post What You Need
                  <Lock className="w-4 h-4 text-stone-400" />
                </h3>
                <p className="text-stone-500 dark:text-stone-500 leading-relaxed mb-6">
                  After approval, describe the required items, quantities, and intended use. The team reviews the drive according to the platform's existing rules.
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-200/50 dark:bg-stone-800/50 text-stone-500">
                  Locked until verified
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative p-8 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 opacity-75"
            >
              <div className="absolute top-8 right-8 text-stone-200 dark:text-stone-800 font-serif text-8xl leading-none select-none">
                3
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 dark:bg-stone-800 text-stone-500 flex items-center justify-center mb-8">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  Deliver, Then Prove It
                  <Lock className="w-4 h-4 text-stone-400" />
                </h3>
                <p className="text-stone-500 dark:text-stone-500 leading-relaxed mb-6">
                  Coordinate handovers, confirm receipt, and provide the required photo evidence. Certificate eligibility follows the actual completion requirements.
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-200/50 dark:bg-stone-800/50 text-stone-500">
                  Locked until verified
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1.5 — Verification and Safety */}
      <section className="py-24 bg-[#FAF8F3] dark:bg-stone-950">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-16 items-start">
            <div className="md:w-1/3 sticky top-32">
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 dark:text-stone-100 mb-6">
                What we check at every step.
              </h2>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                CauseKind's verification processes ensure that donors can give with confidence, and legitimate organizations receive the support they actually requested.
              </p>
            </div>
            
            <div className="md:w-2/3 flex flex-col gap-6">
              {[
                { icon: ScanSearch, title: "AI Screening", desc: "Automated checks against the NGO application details." },
                { icon: Scale, title: "Legal Checks", desc: "Manual review of registration certificates and authorization letters." },
                { icon: Users, title: "Local Matching", desc: "Connecting your structured needs with community members nearby." },
                { icon: Handshake, title: "Safe Drop-offs", desc: "Coordinate transparent handovers at agreed community locations." },
                { icon: ImageIcon, title: "Proof Required", desc: "Mandatory photo evidence of items received before starting new drives." },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-stone-900 rounded-2xl p-6 md:p-8 flex gap-6 shadow-sm border border-stone-200/60 dark:border-stone-800 hover:shadow-md transition-shadow group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EFF7F1] dark:bg-[#176B50]/10 flex items-center justify-center group-hover:bg-[#176B50] group-hover:text-white transition-colors">
                    <item.icon className="w-6 h-6 text-[#176B50] dark:text-[#A8DEC8] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-2">{item.title}</h3>
                    <p className="text-stone-600 dark:text-stone-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 1.6 — Application Status and Next Steps */}
      <section className="py-24 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-[#FAF8F3] dark:bg-stone-950 rounded-3xl p-8 md:p-12 border border-[#176B50]/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#176B50] to-[#A8DEC8]" />
            
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              <div>
                {status.status === "incomplete" ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-[#176B50] dark:text-[#A8DEC8]" />
                      <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Verification needed</h3>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 mb-2 max-w-xl">
                      To build trust with givers, all organizations must complete verification.
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-500">
                      Step {status.stepNumber} of {status.totalSteps} completed
                    </p>
                  </>
                ) : status.status === "under_review" ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-6 h-6 text-amber-500" />
                      <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Application pending review</h3>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 mb-2 max-w-xl">
                      Your application has been submitted and is currently being reviewed by our team.
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-500">
                      You will be notified once approved. After approval, you can start creating drives.
                    </p>
                  </>
                ) : status.status === "changes_requested" ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                      <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Changes requested</h3>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 mb-2 max-w-xl">
                      Please review your application and provide the requested information.
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-500">
                      We need a few details clarified before we can verify your organization.
                    </p>
                  </>
                ) : null}
              </div>
              
              <div className="flex-shrink-0 w-full md:w-auto">
                <Link
                  href={status.wizardHref}
                  className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 text-lg font-medium text-white bg-[#176B50] hover:bg-[#0F513D] rounded-full transition-colors"
                >
                  {status.status === "incomplete" ? "Continue Application" : "View My Application"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
