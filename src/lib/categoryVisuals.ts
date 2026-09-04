import type { IconType } from "react-icons";

import { FaTruckMedical } from "react-icons/fa6";
import { FaGraduationCap } from "react-icons/fa6";
import { FaWrench } from "react-icons/fa6";
import { FaHandHoldingHeart } from "react-icons/fa";
import { FaHouseChimney } from "react-icons/fa6";
import { FaCouch } from "react-icons/fa";
import { FaTshirt } from "react-icons/fa";
import { FaLaptop } from "react-icons/fa";
import { MdOutlineSportsSoccer } from "react-icons/md";

/* =========================================================
   ALL REQUEST CATEGORIES
========================================================= */

export const ALL_REQUEST_CATEGORIES = [
  "Medical aid",
  "Education",
  "Livelihood",
  "Relief",
  "Household",
  "Furniture",
  "Clothing",
  "Electronics",
  "Sports",
];

/* =========================================================
   DONOR LISTING CATEGORIES

   Livelihood + Relief are request-only categories.
========================================================= */

export const DONOR_LISTING_CATEGORIES =
  ALL_REQUEST_CATEGORIES.filter(
    (c) =>
      c !== "Livelihood" &&
      c !== "Relief"
  );

/* =========================================================
   ITEM SUBCATEGORIES
========================================================= */

export const ITEM_SUBCATEGORIES: Record<
  string,
  string[]
> = {
  Education: [
    "Books",
    "Stationery",
    "School Bags",
    "Educational Toys",
    "Uniforms",
    "Other",
  ],

  Clothing: [
    "Men's",
    "Women's",
    "Children's",
    "Baby & Infant",
    "Footwear",
    "Accessories",
  ],

  Furniture: [
    "Chairs",
    "Tables",
    "Beds",
    "Sofas",
    "Wardrobes",
    "Storage",
    "Other",
  ],

  Electronics: [
    "Phones",
    "Laptops",
    "Tablets",
    "TVs",
    "Kitchen Appliances",
    "Accessories",
    "Other",
  ],

  Household: [
    "Cookware",
    "Utensils",
    "Bedding",
    "Curtains",
    "Cleaning Equipment",
    "Other",
  ],

  Sports: [
    "Fitness Equipment",
    "Outdoor Sports",
    "Indoor Sports",
    "Cycling",
    "Other",
  ],

  "Medical aid": [
    "Wheelchair",
    "Crutches / Walker",
    "Hospital Bed",
    "Medical Device",
    "Mobility Aid",
    "Other",
  ],
};

/* =========================================================
   CATEGORY VISUAL TYPE
========================================================= */

/*
 * React Icons uses IconType for icon components.
 *
 * This replaces the previous LucideIcon type.
 */

export type CategoryVisual = {
  Icon: IconType;

  text: string;

  fallbackImage: string;

  /*
   * Dark glass UI colors
   */
  col: string;
  iconBg: string;
  border: string;
  ring: string;
  badge: string;

  /*
   * Description shown in hover preview
   */
  blurb: string;
};

/* =========================================================
   CATEGORY VISUALS
========================================================= */

export const CATEGORY_VISUALS: Record<
  string,
  CategoryVisual
> = {
  /* =======================================================
     MEDICAL AID
     
     React Icon:
     fa6/FaTruckMedical
  ======================================================= */

  "Medical aid": {
    Icon: FaTruckMedical,

    text:
      "text-sky-700 dark:text-sky-400",

    fallbackImage:
      "/images/medical-1.webp",

    col:
      "text-sky-300",

    iconBg:
      "bg-sky-500/20",

    border:
      "border-sky-400/40",

    ring:
      "ring-sky-400/50",

    badge:
      "bg-sky-400",

    blurb:
      "Wheelchairs, medicines, hearing aids and other health-related needs.",
  },

  /* =======================================================
     EDUCATION

     React Icon:
     fa6/FaGraduationCap
  ======================================================= */

  Education: {
    Icon: FaGraduationCap,

    text:
      "text-amber-700 dark:text-amber-400",

    fallbackImage:
      "/images/hero-7.webp",

    col:
      "text-amber-300",

    iconBg:
      "bg-amber-500/20",

    border:
      "border-amber-400/40",

    ring:
      "ring-amber-400/50",

    badge:
      "bg-amber-400",

    blurb:
      "Books, school bags, stationery and study support for students.",
  },

  /* =======================================================
     LIVELIHOOD

     React Icon:
     fa6/FaWrench
  ======================================================= */

  Livelihood: {
    Icon: FaWrench,

    text:
      "text-emerald-700 dark:text-emerald-400",

    fallbackImage:
      "/images/hero-3.webp",

    col:
      "text-emerald-300",

    iconBg:
      "bg-emerald-500/20",

    border:
      "border-emerald-400/40",

    ring:
      "ring-emerald-400/50",

    badge:
      "bg-emerald-400",

    blurb:
      "Tools, sewing machines and items that help someone earn a living.",
  },

  /* =======================================================
     RELIEF

     React Icon:
     fa/FaHandHoldingHeart
  ======================================================= */

  Relief: {
    Icon: FaHandHoldingHeart,

    text:
      "text-violet-700 dark:text-violet-400",

    fallbackImage:
      "/images/hero-5.webp",

    col:
      "text-violet-300",

    iconBg:
      "bg-violet-500/20",

    border:
      "border-violet-400/40",

    ring:
      "ring-violet-400/50",

    badge:
      "bg-violet-400",

    blurb:
      "Essentials for families hit by emergencies, floods or hard times.",
  },

  /* =======================================================
     HOUSEHOLD

     React Icon:
     fa6/FaHouseChimney
  ======================================================= */

  Household: {
    Icon: FaHouseChimney,

    text:
      "text-rose-700 dark:text-rose-400",

    fallbackImage:
      "/images/hero-6.webp",

    col:
      "text-rose-300",

    iconBg:
      "bg-rose-500/20",

    border:
      "border-rose-400/40",

    ring:
      "ring-rose-400/50",

    badge:
      "bg-rose-400",

    blurb:
      "Daily-use home items — utensils, bedding and kitchen essentials.",
  },

  /* =======================================================
     FURNITURE

     React Icon:
     fa/FaCouch
  ======================================================= */

  Furniture: {
    Icon: FaCouch,

    text:
      "text-indigo-700 dark:text-indigo-400",

    fallbackImage:
      "/images/hero-6.webp",

    col:
      "text-indigo-300",

    iconBg:
      "bg-indigo-500/20",

    border:
      "border-indigo-400/40",

    ring:
      "ring-indigo-400/50",

    badge:
      "bg-indigo-400",

    blurb:
      "Beds, chairs, tables and storage for homes that need them.",
  },

  /* =======================================================
     CLOTHING

     React Icon:
     fa/FaTshirt
  ======================================================= */

  Clothing: {
    Icon: FaTshirt,

    text:
      "text-teal-700 dark:text-teal-400",

    fallbackImage:
      "/images/hero-3.webp",

    col:
      "text-teal-300",

    iconBg:
      "bg-teal-500/20",

    border:
      "border-teal-400/40",

    ring:
      "ring-teal-400/50",

    badge:
      "bg-teal-400",

    blurb:
      "Clean, wearable clothes for all ages and seasons.",
  },

  /* =======================================================
     ELECTRONICS

     React Icon:
     fa/FaLaptop
  ======================================================= */

  Electronics: {
    Icon: FaLaptop,

    text:
      "text-orange-700 dark:text-orange-400",

    fallbackImage:
      "/images/hero-7.webp",

    col:
      "text-orange-300",

    iconBg:
      "bg-orange-500/20",

    border:
      "border-orange-400/40",

    ring:
      "ring-orange-400/50",

    badge:
      "bg-orange-400",

    blurb:
      "Working phones, laptops and appliances someone can still use.",
  },

  /* =======================================================
     SPORTS

     React Icon:
     md/MdOutlineSportsSoccer
  ======================================================= */

  Sports: {
    Icon: MdOutlineSportsSoccer,

    text:
      "text-cyan-700 dark:text-cyan-400",

    fallbackImage:
      "/images/hero-5.webp",

    col:
      "text-cyan-300",

    iconBg:
      "bg-cyan-500/20",

    border:
      "border-cyan-400/40",

    ring:
      "ring-cyan-400/50",

    badge:
      "bg-cyan-400",

    blurb:
      "Sports gear, cycles and fitness equipment for kids and adults.",
  },
};

/* =========================================================
   DONOR CATEGORY STORAGE
========================================================= */

const DONOR_CATEGORY_STORAGE_KEY =
  "causekind_donor_category";

/*
 * null
 * = donor has never opened/applied the picker
 *
 * []
 * = donor explicitly selected "show all"
 *
 * ["Education", "Medical aid"]
 * = specific focus areas selected
 */

export function readSelectedDonorCategories():
  | string[]
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        DONOR_CATEGORY_STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}