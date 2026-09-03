"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  X,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

import {
  ALL_REQUEST_CATEGORIES,
  CATEGORY_VISUALS,
  readSelectedDonorCategories,
} from "@/lib/categoryVisuals";

export const DONOR_CATEGORY_EVENT = "ck-category-changed";
export const DONOR_CATEGORY_OPEN_EVENT = "ck-category-open";

const STORAGE_KEY = "causekind_donor_category";

/* =========================================================
   CATEGORY DATA
========================================================= */

const CATEGORIES = [
  ...ALL_REQUEST_CATEGORIES.map((name) => {
    const visual = CATEGORY_VISUALS[name];

    return {
      name,
      Icon: visual.Icon,
      col: visual.col,
      iconBg: visual.iconBg,
      border: visual.border,
      ring: visual.ring,
      badge: visual.badge,
      blurb: visual.blurb,
    };
  }),

  {
    name: "List Item",
    Icon: Package,
    col: "text-orange-300",
    iconBg: "bg-orange-500/20",
    border: "border-orange-400/40",
    ring: "ring-orange-400/50",
    badge: "bg-orange-400",
    blurb:
      "Skip choosing a category and list an item you want to give.",
  },
];

/* =========================================================
   CATEGORY IMAGES

   Make sure these files exist inside:

   public/categories/
========================================================= */

const CATEGORY_IMAGES: Record<string, string> = {
  "Medical aid": "/categories/medical-aid.webp",
  Education: "/categories/education.webp",
  Livelihood: "/categories/livelihood.webp",
  Relief: "/categories/relief.webp",
  Household: "/categories/household.webp",
  Furniture: "/categories/furniture.webp",
  Clothing: "/categories/clothing.webp",
  Electronics: "/categories/electronics.webp",
  Sports: "/categories/sports.webp",
  "List Item": "/categories/list-item.webp",
};

/* =========================================================
   BACKDROP EMBERS

   Same six rising embers the donor welcome overlay uses,
   so the two surfaces share one ambient language.
========================================================= */

const BACKDROP_EMBERS = [
  { left: "5%",  size: 3, delay: "0s",   dur: "7s" },
  { left: "12%", size: 4, delay: "1.2s", dur: "8s" },
  { left: "19%", size: 2, delay: "3s",   dur: "6.5s" },
  { left: "27%", size: 4, delay: "0.8s", dur: "7.5s" },
  { left: "34%", size: 3, delay: "2.5s", dur: "6.8s" },
  { left: "41%", size: 5, delay: "4s",   dur: "8.5s" },
  { left: "48%", size: 2, delay: "1.5s", dur: "6s" },
  { left: "55%", size: 4, delay: "3.5s", dur: "7.2s" },
  { left: "62%", size: 3, delay: "0.5s", dur: "8s" },
  { left: "69%", size: 5, delay: "2.8s", dur: "6.5s" },
  { left: "76%", size: 3, delay: "4.5s", dur: "7.8s" },
  { left: "83%", size: 4, delay: "1.8s", dur: "6.8s" },
  { left: "90%", size: 2, delay: "3.2s", dur: "7.5s" },
  { left: "96%", size: 3, delay: "5s",   dur: "6.2s" },
];

/* =========================================================
   COMPONENT
========================================================= */

export function DonorCategoryModal() {
  const router = useRouter();

  const [show, setShow] = useState(true);

  const [tempSelected, setTempSelected] = useState<string[]>(
    []
  );

  /*
    Hover state is ONLY used for the hover description.

    Hovering:
      → shows description

    Clicking:
      → selects category
  */
  const [hoveredCategory, setHoveredCategory] =
    useState<string | null>(null);

  /*
    Bumped once per selection, per category.

    The ripple is a CSS animation on a mounted element, and an
    animation only plays when the element is created. Without a
    changing key React reuses the same node and the ripple fires
    the first time only. The counter goes into the key, so every
    click builds a fresh node and the ripple always plays.
  */
  const [rippleKeys, setRippleKeys] =
    useState<Record<string, number>>({});

  /* =======================================================
     LOAD EXISTING SELECTION
  ======================================================= */

  useEffect(() => {
    const saved = readSelectedDonorCategories();

    if (saved && Array.isArray(saved)) {
      setTempSelected(saved);
    }
  }, []);

  /* =======================================================
     OPEN CATEGORY PICKER
  ======================================================= */

  useEffect(() => {
    function handleOpen() {
      const saved = readSelectedDonorCategories();

      setTempSelected(
        saved && Array.isArray(saved)
          ? saved
          : []
      );

      setHoveredCategory(null);
      setShow(true);
    }

    window.addEventListener(
      DONOR_CATEGORY_OPEN_EVENT,
      handleOpen
    );

    return () => {
      window.removeEventListener(
        DONOR_CATEGORY_OPEN_EVENT,
        handleOpen
      );
    };
  }, []);

  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHoveredCategory(null);
        setShow(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     APPLY SELECTION
  ======================================================= */

  function apply(categories: string[]) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(categories)
    );

    window.dispatchEvent(
      new CustomEvent(DONOR_CATEGORY_EVENT, {
        detail: categories,
      })
    );

    setShow(false);
    setHoveredCategory(null);
  }

  /* =======================================================
     SELECT CATEGORY

     Clicking = select

     Hovering = description
  ======================================================= */

  function selectCategory(name: string) {
    /*
      List Item keeps its original behavior.
    */

    if (name === "List Item") {
      setShow(false);
      router.push("/items/new");
      return;
    }

    setRippleKeys((previous) => ({
      ...previous,
      [name]: (previous[name] ?? 0) + 1,
    }));

    setTempSelected((previous) => {
      if (previous.includes(name)) {
        return previous.filter(
          (item) => item !== name
        );
      }

      return [...previous, name];
    });
  }

  /* =======================================================
     CLOSE
  ======================================================= */

  function closePicker() {
    setHoveredCategory(null);
    setShow(false);
  }

  /* =======================================================
     DON'T RENDER
  ======================================================= */

  if (!show) {
    return null;
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <style>{`

        /* =====================================================
           PAGE FADE
        ===================================================== */

        @keyframes ck-page-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        /* =====================================================
           CARD ENTRY
        ===================================================== */

        @keyframes ck-card-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =====================================================
           BACKGROUND GLOW
        ===================================================== */

        @keyframes ck-glow {
          0%,
          100% {
            opacity: 0.15;
            transform: scale(1);
          }

          50% {
            opacity: 0.26;
            transform: scale(1.06);
          }
        }

        /* =====================================================
           BACKGROUND DRIFT

           The slow wander that makes the two glows feel alive
           rather than parked. Paired with ck-glow on the same
           element via a two-animation shorthand below.
        ===================================================== */

        @keyframes ck-blob-drift {
          from {
            translate: 0 0;
          }

          to {
            translate: 9vmax 6vmax;
          }
        }

        /* =====================================================
           RISING EMBERS
        ===================================================== */

        @keyframes ck-ember-rise {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0);
          }

          12% {
            opacity: 0.4;
          }

          70% {
            opacity: 0.18;
          }

          100% {
            opacity: 0;
            transform: translateY(-78vh) translateX(3vw);
          }
        }

        /* =====================================================
           KEN BURNS

           Faster and wider than before — the previous 26s pass
           moved about a third of a percent per second, which is
           below what the eye registers as motion at all.
        ===================================================== */

        @keyframes ck-kenburns {
          from {
            transform: scale(1.06) translate(2%, 1.5%);
          }

          to {
            transform: scale(1.18) translate(-2.5%, -2%);
          }
        }

        /* =====================================================
           FLOATING IMAGE

           The hover state of the photo. Ken Burns is paused
           while this runs — both write 'transform', and the
           last declaration would otherwise simply erase the
           other one every frame.
        ===================================================== */

        @keyframes ck-float {
          0%,
          100% {
            transform: scale(1.1) translateY(0);
          }

          50% {
            transform: scale(1.13) translateY(-8px);
          }
        }

        /* =====================================================
           SHINE SWEEP

           The visible one. A diagonal band of light crosses
           each card, staggered down the grid so the whole
           board reads as one wave rather than ten loops.
        ===================================================== */

        @keyframes ck-shine {
          0% {
            transform: translateX(-130%) skewX(-18deg);
            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          38% {
            opacity: 1;
          }

          46%,
          100% {
            transform: translateX(230%) skewX(-18deg);
            opacity: 0;
          }
        }

        /* =====================================================
           SELECTION RIPPLE

           Fires from the middle of the card on every click,
           select or deselect.
        ===================================================== */

        @keyframes ck-ripple {
          0% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(0);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.6);
          }
        }

        /* =====================================================
           BUTTON SHINE
        ===================================================== */

        @keyframes ck-btn-shine {
          0% {
            transform: translateX(-160%) skewX(-22deg);
          }

          55%,
          100% {
            transform: translateX(320%) skewX(-22deg);
          }
        }

        /* =====================================================
           SELECTED CHECK POP
        ===================================================== */

        @keyframes ck-check-pop {
          0% {
            opacity: 0;
            transform: scale(0.2) rotate(-25deg);
          }

          60% {
            opacity: 1;
            transform: scale(1.18) rotate(4deg);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        /* =====================================================
           DESCRIPTION
        ===================================================== */

        @keyframes ck-description-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =====================================================
           BASE
        ===================================================== */

        .ck-page {
          animation:
            ck-page-in
            0.35s
            ease
            both;
        }

        /*
          The tilt needs a vanishing point, and it has to live
          on the PARENT. Putting perspective in the card's own
          transform gives each card its own vanishing point at
          its own centre, so all ten tilt identically and the
          grid reads flat. Declared here, the whole board shares
          one viewpoint and cards at the edges lean differently
          from cards in the middle — which is what sells it.
        */

        .ck-category-grid {
          perspective: 1400px;
          perspective-origin: 50% 50%;
        }

        .ck-category-card {
          transform-style: preserve-3d;

          animation:
            ck-card-in
            0.4s
            cubic-bezier(0.16, 1, 0.3, 1)
            both;
        }

        /*
          Two animations, not one. ck-glow drives opacity and
          scale via transform; ck-blob-drift moves the element
          with the independent 'translate' property, so the two
          never overwrite each other the way two transform
          keyframe sets would.
        */

        .ck-bg-glow {
          animation:
            ck-glow 8s ease-in-out infinite,
            ck-blob-drift 24s ease-in-out infinite alternate;
        }

        .ck-ember {
          position: absolute;
          bottom: -6px;
          border-radius: 9999px;
          background: radial-gradient(
  circle at 35% 30%,
  rgba(255,255,255,0.9),
  rgba(240,185,122,0.7) 35%,
  rgba(224,123,58,0.25) 70%,
  transparent 100%
);
          opacity: 0;

          animation:
            ck-ember-rise
            linear
            infinite;
        }

        /* =====================================================
           IMAGE
        ===================================================== */

        .ck-category-image {
          animation:
            ck-kenburns
            14s
            ease-in-out
            infinite
            alternate;

          transition:
            filter 0.35s ease;
        }

        /*
          Hover swaps one animation for the other rather than
          layering a transition on top. A transition and a
          running keyframe both writing transform fight every
          frame and the result stutters.
        */

        .ck-category-card:hover
        .ck-category-image {
          animation:
            ck-float
            3.2s
            ease-in-out
            infinite;

          filter: brightness(1.12);
        }

        /* =====================================================
           SHINE LAYER
        ===================================================== */

.ck-shine {
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 45%;
  pointer-events: none;
  z-index: 15;

  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 35%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0.06) 65%,
    transparent 100%
  );

  opacity: 0;
  transform: translateX(-130%) skewX(-18deg);
}

        /* =====================================================
           RIPPLE LAYER
        ===================================================== */

        .ck-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          height: 120%;
          aspect-ratio: 1;
          border-radius: 9999px;
          pointer-events: none;
          z-index: 18;

          background: radial-gradient(
            circle,
            rgba(240, 185, 122, 0.55) 0%,
            rgba(224, 123, 58, 0.28) 45%,
            transparent 70%
          );

          animation:
            ck-ripple
            0.75s
            cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        /* =====================================================
           IMAGE WRAPPER
        ===================================================== */

        .ck-image-wrapper {
          transition:
            flex 0.35s
              cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* =====================================================
           DESCRIPTION AREA

           Normally:
             height = 0
             invisible

           On hover:
             description appears
             directly underneath image
        ===================================================== */

        .ck-hover-description {
          max-height: 0;
          opacity: 0;
          overflow: hidden;

          transition:
            max-height 0.35s
              cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.25s ease,
            padding 0.35s ease;
        }

        .ck-category-card:hover
        .ck-hover-description {
          max-height: 70px;
          opacity: 1;
        }

        /* =====================================================
           DESCRIPTION TEXT

           Inherits the body sans — the same face the category
           names use. No separate family declared here on
           purpose; that is what keeps the two in step.
        ===================================================== */

        .ck-description-text {
          animation:
            ck-description-in
            0.25s
            ease
            both;
        }

        /* =====================================================
           ICON
        ===================================================== */

        .ck-category-icon {
          transition:
            transform 0.25s ease,
            background 0.25s ease;
        }

        .ck-category-card:hover
        .ck-category-icon {
          transform: scale(1.07);
        }

        /* =====================================================
           SELECTED CHECK
        ===================================================== */

        .ck-check-badge {
          animation:
            ck-check-pop
            0.4s
            cubic-bezier(0.34, 1.56, 0.64, 1)
            both;
        }

        /* =====================================================
           CARD HOVER

           Tilt + lift + orange rim, all in one transform and
           one box-shadow so nothing overwrites anything.
        ===================================================== */

        .ck-category-card {
          transition:
            transform 0.35s
              cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.3s ease,
            background 0.3s ease,
            box-shadow 0.35s ease;
        }

        .ck-category-card:hover {
          transform:
            translateY(-6px)
            rotateX(6deg)
            rotateY(-2deg)
            scale(1.02);

          border-color: rgba(224, 123, 58, 0.55);
          background: rgba(255,255,255,0.055);

          box-shadow:
            0 0 0 1px rgba(224, 123, 58, 0.35),
            0 0 22px rgba(224, 123, 58, 0.30),
            0 0 48px rgba(176, 74, 21, 0.22),
            0 22px 50px rgba(0,0,0,0.38);
        }

        /*
          Cards in the right half lean the other way, so the
          board tilts around its own centre instead of every
          card leaning the same direction.
        */

        .ck-category-card.ck-tilt-right:hover {
          transform:
            translateY(-6px)
            rotateX(6deg)
            rotateY(2deg)
            scale(1.02);
        }

        /* =====================================================
           SELECTED CARD
        ===================================================== */

        .ck-category-card-selected {
          box-shadow:
            0 0 0 1px rgba(224, 123, 58, 0.30),
            0 0 18px rgba(224, 123, 58, 0.20),
            0 16px 40px rgba(0,0,0,0.28);
        }

        /* =====================================================
           BUTTON SHINE

           The band is a child span, not a pseudo-element: the
           button already carries an inline gradient background
           and stacking a ::after over it is harder to reason
           about than one explicit layer.
        ===================================================== */

        .ck-btn-shine-wrap {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .ck-btn-shine {
          position: absolute;
          top: -50%;
          bottom: -50%;
          left: 0;
          width: 35%;
          pointer-events: none;
          z-index: 1;

          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(255, 255, 255, 0.10) 30%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.10) 70%,
            transparent 100%
          );

          animation:
            ck-btn-shine
            3.4s
            ease-in-out
            infinite;
        }

        .ck-btn-shine-wrap > *:not(.ck-btn-shine) {
          position: relative;
          z-index: 2;
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {

          /*
            On touch devices there is no real hover.

            Keep descriptions hidden so the cards stay clean.
          */

          .ck-category-card:hover
          .ck-category-image {
            animation:
              ck-kenburns
              14s
              ease-in-out
              infinite
              alternate;

            filter: none;
          }

          .ck-category-card:hover
          .ck-hover-description {
            max-height: 0;
            opacity: 0;
            padding: 0;
          }

          .ck-category-card:hover,
          .ck-category-card.ck-tilt-right:hover {
            transform: none;
            box-shadow: none;
          }

        }

        /* =====================================================
           SHORT SCREEN
        ===================================================== */

        @media (max-height: 760px) {

          .ck-header-icon {
            height: 34px;
            width: 34px;
          }

          .ck-header-title {
            font-size: 24px;
          }

          .ck-header-subtitle {
            margin-top: 0;
          }

          .ck-category-name {
            height: 42px;
          }

          .ck-category-icon-box {
            height: 26px;
            width: 26px;
          }

          .ck-footer {
            padding-top: 0;
          }

        }

        /* =====================================================
           VERY SHORT SCREEN
        ===================================================== */

        @media (max-height: 650px) {

          .ck-header-title {
            font-size: 22px;
          }

          .ck-category-name {
            height: 38px;
          }

          .ck-category-icon-box {
            height: 24px;
            width: 24px;
          }

        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .ck-page,
          .ck-category-card,
          .ck-category-card:hover .ck-category-image,
          .ck-bg-glow,
          .ck-ember,
          .ck-category-image,
          .ck-shine,
          .ck-ripple,
          .ck-btn-shine,
          .ck-check-badge,
          .ck-description-text {
            animation: none;
          }

          .ck-ember,
          .ck-shine,
          .ck-ripple,
          .ck-btn-shine {
            display: none;
          }

          .ck-category-card:hover,
          .ck-category-card.ck-tilt-right:hover {
            transform: none;
          }

          .ck-category-image,
          .ck-category-icon,
          .ck-category-card,
          .ck-hover-description {
            transition: none;
          }

        }

      `}</style>

      {/* =======================================================
          FULL SCREEN
      ======================================================= */}

      {/*
        The solid #0c0907 fill is gone. A translucent scrim plus
        backdrop-blur puts the live landing page — hero slideshow
        and all — behind this surface instead of hiding it.
      */}

      <div
        className="
          fixed
          inset-0
          z-[9990]
          overflow-hidden
          bg-stone-950/85
          backdrop-blur-xl
          text-white
        "
      >

        {/* =====================================================
            BACKGROUND
        ===================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            overflow-hidden
          "
          aria-hidden
        >

          {/* Orange glow */}

          <div
            className="
              ck-bg-glow
              absolute
              -left-48
              -top-48
              h-[500px]
              w-[500px]
              rounded-full
            "
            style={{
              background:
                "radial-gradient(circle, rgba(176,74,21,0.20) 0%, transparent 68%)",
            }}
          />

          {/* Blue glow */}

          <div
            className="
              ck-bg-glow
              absolute
              -bottom-48
              -right-48
              h-[500px]
              w-[500px]
              rounded-full
            "
            style={{
              background:
                "radial-gradient(circle, rgba(30,58,96,0.18) 0%, transparent 68%)",
              animationDelay: "2s, -10s",
              animationDirection:
                "normal, alternate-reverse",
            }}
          />

          {/* Rising embers */}

          {BACKDROP_EMBERS.map((ember, index) => (
            <span
              key={index}
              className="ck-ember"
              style={{
                left: ember.left,
                width: ember.size,
                height: ember.size,
                animationDelay: ember.delay,
                animationDuration: ember.dur,
              }}
            />
          ))}

        </div>

        {/* =====================================================
            MAIN PAGE
        ===================================================== */}

        <div
          className="
            ck-page
            relative
            flex
            h-[100dvh]
            min-h-0
            flex-col
            px-5
            py-3
            sm:px-7
            sm:py-4
            lg:px-8
            lg:py-4
            xl:px-10
          "
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <header
            className="
              relative
              mx-auto
              flex
              w-full
              max-w-[1500px]
              shrink-0
              flex-col
              items-center
              justify-center
            "
          >

            {/* Close */}

            <button
              type="button"
              onClick={closePicker}
              aria-label="Close"
              className="
                absolute
                right-0
                top-0
                z-20
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                text-white/35
                transition
                hover:bg-white/10
                hover:text-white
              "
            >
              <X className="h-4 w-4" />
            </button>

            {/* =================================================
                ICON
            ================================================= */}

            <div
              className="
                ck-header-icon
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                sm:h-10
                sm:w-10
                sm:rounded-2xl
              "
              style={{
                background:
                  "linear-gradient(135deg, #b04a15, #e07b3a)",
                boxShadow:
                  "0 10px 25px rgba(176,74,21,0.30)",
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>

            {/* =================================================
                EYEBROW
            ================================================= */}

            <p
              className="
                ck-header-eyebrow
                mt-1.5
                text-center
                text-[8px]
                font-black
                uppercase
                tracking-[0.28em]
                text-[#f0b97a]
                sm:text-[9px]
              "
            >
              Where will you make an impact?
            </p>

            {/* =================================================
                TITLE
            ================================================= */}

            <h1
              className="
                ck-header-title
                mt-0.5
                text-center
                text-[22px]
                font-black
                leading-tight
                tracking-tight
                text-white
                sm:text-[26px]
                lg:text-[30px]
              "
            >
              Choose your focus areas
            </h1>

            {/* =================================================
                SUBTITLE
            ================================================= */}

            <p
              className="
                ck-header-subtitle
                mt-1
                text-center
                text-[10px]
                font-medium
                leading-4
                text-stone-500
                sm:text-[11px]
              "
            >
              We'll show you the most urgent local needs in your area.
            </p>

          </header>

          {/* =================================================
              CATEGORY GRID
          ================================================= */}

          <main
            className="
              mx-auto
              flex
              min-h-0
              w-full
              max-w-[1500px]
              flex-1
              items-center
              justify-center
              py-2
              sm:py-3
            "
          >

            <div
              className="
                ck-category-grid
                grid
                h-full
                max-h-[calc(100dvh-180px)]
                w-full
                grid-cols-2
                grid-rows-5
                gap-2
                sm:grid-cols-3
                sm:grid-rows-4
                sm:gap-2.5
                lg:grid-cols-5
                lg:grid-rows-2
                lg:gap-3
              "
            >

              {CATEGORIES.map(
                (
                  {
                    name,
                    Icon,
                    col,
                    iconBg,
                    border,
                    ring,
                    badge,
                    blurb,
                  },
                  index
                ) => {

                  const isSelected =
                    tempSelected.includes(name);

                  const isHovered =
                    hoveredCategory === name;

                  const isListItem =
                    name === "List Item";

                  const image =
                    CATEGORY_IMAGES[name];

                  /*
                    Right-hand columns lean the opposite way.
                    Five columns on desktop, so index 3 and 4 of
                    each row of five sit right of centre.
                  */

                  const tiltsRight =
                    index % 5 >= 3;

                  const rippleKey =
                    rippleKeys[name] ?? 0;

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        selectCategory(name)
                      }
                      onMouseEnter={() => {
                        setHoveredCategory(name);
                      }}
                      onMouseLeave={() => {
                        setHoveredCategory(null);
                      }}
                      className={`
                        ck-category-card
                        group
                        relative
                        flex
                        min-h-0
                        min-w-0
                        flex-col
                        overflow-hidden
                        rounded-2xl
                        border
                        text-left
                        sm:rounded-[20px]

                        ${
                          tiltsRight
                            ? "ck-tilt-right"
                            : ""
                        }

                        ${
                          isSelected
                            ? `${border} ring-1 ${ring} ck-category-card-selected`
                            : "border-white/20"
                        }

                        ${
                          isSelected
                            ? "bg-white/[0.075]"
                            : "bg-white/[0.035]"
                        }
                      `}
                      style={{
                        animationDelay:
                          `${index * 0.035}s`,
                      }}
                    >

                      {/* =================================================
                          IMAGE AREA
                      ================================================= */}

                      <div
                        className="
                          ck-image-wrapper
                          relative
                          min-h-0
                          flex-1
                          overflow-hidden
                          bg-[#17110e]
                        "
                      >

                        {/* =================================================
                            CATEGORY IMAGE

                            IMPORTANT:
                            List Item also uses its image now.

                            The negative delay starts each photo
                            mid-drift, so the grid is already in
                            motion the moment it appears.
                        ================================================= */}

                        {image && (
                          <img
                            src={image}
                            alt={name}
                            className="
                              ck-category-image
                              absolute
                              inset-0
                              h-full
                              w-full
                              object-cover
                            "
                            style={{
                              animationDuration:
                                `${13 + (index % 5) * 1.5}s`,
                              animationDelay:
                                `-${index * 1.7}s`,
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        )}

                        {/* =================================================
                            IMAGE GRADIENT
                        ================================================= */}

                        <div
                          className="
                            pointer-events-none
                            absolute
                            inset-0
                            bg-gradient-to-t
                            from-black/60
                            via-transparent
                            to-black/10
                          "
                        />

                        {/* =================================================
                            SHINE SWEEP

                            Staggered by index so the light
                            travels across the board as a wave
                            instead of ten cards flashing at once.
                        ================================================= */}

                        <span
                          className="ck-shine"
                          aria-hidden
        
                        />

                        {/* =================================================
                            SELECTION RIPPLE

                            Skipped at count zero so it does not
                            fire on cards restored from storage
                            when the picker first opens.
                        ================================================= */}

                        {rippleKey > 0 && (
                          <span
                            key={rippleKey}
                            className="ck-ripple"
                            aria-hidden
                          />
                        )}

                        {/* =================================================
                            SELECTED CHECK
                        ================================================= */}

                        {isSelected && (
                          <span
                            className="
                              ck-check-badge
                              absolute
                              right-2
                              top-2
                              z-20
                              flex
                              h-7
                              w-7
                              items-center
                              justify-center
                              rounded-full
                              bg-amber-400
                              text-black
                              shadow-lg
                              sm:right-2.5
                              sm:top-2.5
                              sm:h-8
                              sm:w-8
                            "
                          >
                            <Check
                              className="h-4 w-4"
                              strokeWidth={4}
                            />
                          </span>
                        )}

                      </div>

                      {/* =================================================
                          HOVER DESCRIPTION

                          Appears directly UNDER the image
                          when the card is hovered.
                      ================================================= */}

                      <div
                        className="
                          ck-hover-description
                          shrink-0
                          border-t
                          border-white/[0.07]
                          bg-[#17110e]
                          px-3
                          sm:px-3.5
                        "
                      >

                        <p
                          className={`
                            ck-description-text
                            py-2
                            text-[13px]
                            font-medium
                            tracking-wide
                            leading-[1.35]
                            sm:py-2.5
                            sm:text-[14px]
                            sm:leading-[1.4]
                            ${col}
                          `}
                        >
                          {blurb}
                        </p>

                      </div>

                      {/* =================================================
                          CATEGORY NAME

                          Icon + name only.
                      ================================================= */}

                      <div
                        className="
                          ck-category-name
                          flex
                          h-[48px]
                          shrink-0
                          items-center
                          gap-2
                          bg-[#17110e]
                          px-3
                          sm:h-[52px]
                          sm:px-3.5
                        "
                      >

                        {/* Icon */}

                        <div
                          className={`
                            ck-category-icon
                            ck-category-icon-box
                            flex
                            h-7
                            w-7
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            sm:h-[30px]
                            sm:w-[30px]
                            ${iconBg}
                          `}
                        >
                          <Icon
                            className={`
                              h-3.5
                              w-3.5
                              sm:h-4
                              sm:w-4
                              ${col}
                            `}
                          />
                        </div>

                        {/* Name */}

                        <span
                          className={`
                            min-w-0
                            truncate
                            text-[11px]
                            font-medium
                            tracking-wide
                            sm:text-[13px]
                            lg:text-[14px]

                            ${
                              isSelected
                                ? col
                                : "text-white"
                            }
                          `}
                        >
                          {name}
                        </span>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </main>

          {/* =================================================
              FOOTER

              NO border-t HERE.
          ================================================= */}

          <footer
            className="
              ck-footer
              mx-auto
              flex
              w-full
              max-w-[1500px]
              shrink-0
              items-center
              justify-between
              gap-3
              pt-1
            "
          >

            {/* =================================================
                SELECTED COUNT
            ================================================= */}

            <p
              className="
                text-[9px]
                font-semibold
                text-stone-500
                sm:text-[10px]
              "
            >
              {tempSelected.length > 0
                ? `${tempSelected.length} ${
                    tempSelected.length === 1
                      ? "focus area"
                      : "focus areas"
                  } selected`
                : "No focus areas selected"}
            </p>

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              {/* Show all */}

              <button
                type="button"
                onClick={() => apply([])}
                className="
                  rounded-lg
                  border
                  border-white/10
                  px-3
                  py-1.5
                  text-[9px]
                  font-bold
                  text-stone-500
                  transition
                  hover:border-white/20
                  hover:bg-white/[0.05]
                  hover:text-white
                  sm:px-4
                  sm:py-2
                  sm:text-[10px]
                "
              >
                Show all needs
              </button>

              {/* Continue / Apply */}

              <button
                type="button"
                onClick={() =>
                  apply(tempSelected)
                }
                className="
                  ck-btn-shine-wrap
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  px-4
                  py-1.5
                  text-[9px]
                  font-extrabold
                  text-white
                  transition
                  hover:-translate-y-0.5
                  active:scale-[0.97]
                  sm:px-5
                  sm:py-2
                  sm:text-[10px]
                "
                style={{
                  background:
                    "linear-gradient(135deg, #b04a15, #e07b3a)",
                  boxShadow:
                    "0 7px 20px rgba(176,74,21,0.28)",
                }}
              >

                <span className="ck-btn-shine" aria-hidden />

                <span>
                  {tempSelected.length > 0
                    ? `Apply (${tempSelected.length})`
                    : "Continue"}
                </span>

                <ArrowRight className="h-3 w-3" />

              </button>

            </div>

          </footer>

        </div>
      </div>
    </>
  );
}