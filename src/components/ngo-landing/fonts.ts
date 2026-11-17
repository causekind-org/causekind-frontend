import { Fraunces } from "next/font/google";

/**
 * The NGO landing's heading face (--ngo-font-heading in ngo-redesign.css).
 *
 * ngo-redesign.css used to pull Fraunces and Inter from Google Fonts with a
 * remote @import. The production CSS bundler dropped that import, so the page
 * only ever got Fraunces because another section happened to register a face
 * under the same family name. This declaration makes the NGO landing own it.
 *
 * Same options as the support gallery's and the film's serif, so the browser
 * shares one set of files and the rendering is unchanged. Inter (the body
 * face) comes from the root layout's next/font declaration.
 *
 * No preload: preloading this face anywhere makes Next emit a second copy of
 * the same file, and both then download (measured: +264 KB on the home page).
 */
const ngoHeading = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  preload: false,
  variable: "--font-ngo-heading-face",
});

export const ngoFonts = ngoHeading.variable;
