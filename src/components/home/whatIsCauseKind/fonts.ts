import { Archivo } from "next/font/google";
import { galleryFonts } from "@/components/home/supportGallery/fonts";

/**
 * A bold, slightly expanded grotesk for the giant words (EXTRA, NEED,
 * CAUSEKIND). The serif, handwriting and mono faces are the photo table's —
 * same instances, so the two sections share files and a visual language.
 */
const grotesk = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-wk-grotesk",
});

export const wordFonts = `${grotesk.variable} ${galleryFonts}`;
