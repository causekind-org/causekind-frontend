export type Locale =
  | "en" | "hi" | "ta" | "te" | "mr" | "bn"
  | "gu" | "kn" | "ml" | "pa" | "ur" | "es" | "fr" | "ar";

export const locales: Locale[] = [
  "en", "hi", "ta", "te", "mr", "bn",
  "gu", "kn", "ml", "pa", "ur", "es", "fr", "ar",
];

export const defaultLocale: Locale = "en";

export const LANGUAGE_OPTIONS: { code: Locale; nativeName: string }[] = [
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "हिंदी" },
  { code: "ta", nativeName: "தமிழ்" },
  { code: "te", nativeName: "తెలుగు" },
  { code: "mr", nativeName: "मराठी" },
  { code: "bn", nativeName: "বাংলা" },
  { code: "gu", nativeName: "ગુજરાતી" },
  { code: "kn", nativeName: "ಕನ್ನಡ" },
  { code: "ml", nativeName: "മലയാളം" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ur", nativeName: "اردو" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "ar", nativeName: "العربية" },
];
