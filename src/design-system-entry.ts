/**
 * Design-system barrel entry.
 * Re-exports every public component under src/components for standalone
 * library builds (tsup). Not used by the Next.js app itself.
 */

// (react/jsx-runtime shim lives in tsup.config.ts's banner now — a static
// import + globalThis stash here was tried first and didn't reliably survive
// the converter's second, separate esbuild pass; see tsup.config.ts for why.)

// Re-exported so cfg.provider (.design-sync/config.json) can wrap every
// preview in it — several components (TranslatedText / useDynamicTranslation,
// LanguageSwitcher, ...) call next-intl's useLocale()/useTranslations(),
// which throw without a NextIntlClientProvider ancestor.
export { NextIntlClientProvider } from "next-intl";

// ── Root components ──────────────────────────────────────────────
export { AboutCtaCard } from "./components/AboutCtaCard";
export { AdminRedirect } from "./components/AdminRedirect";
export { BeTheChangeSection } from "./components/BeTheChangeSection";
export { default as BoomerangVideoBg } from "./components/BoomerangVideoBg";
export { CampaignCard } from "./components/CampaignCard";
export { CampaignCarousel, LatestActiveCampaignsSection } from "./components/CampaignCarousel";
export { ComingSoon } from "./components/ComingSoon";
export { ComingSoonMagnets } from "./components/ComingSoonMagnets";
export { CookieConsent } from "./components/CookieConsent";
export { CursorGlowHero } from "./components/CursorGlowHero";
export { DonateButton } from "./components/DonateButton";
export { DoneeRequestPrompt } from "./components/DoneeRequestPrompt";
export { DonorCategoryModal, DONOR_CATEGORY_EVENT } from "./components/DonorCategoryModal";
export { DonorListingPrompt } from "./components/DonorListingPrompt";
export { GlobalSearch, SearchTrigger } from "./components/GlobalSearch";
export { GoogleProvider } from "./components/GoogleProvider";
export { HeroCampaignSlider } from "./components/HeroCampaignSlider";
export { Interactive3dHero } from "./components/Interactive3dHero";
export { LanguageSwitcher } from "./components/LanguageSwitcher";
export { ListingDetailPanel } from "./components/ListingDetailPanel";
// LocationGate excluded: calls detectLocationFromServer, a Next.js Server
// Action ("use server") — same non-bundlable-outside-Next issue as HeroSection.

export { LogoSVG } from "./components/LogoSVG";
export { LogoVideo } from "./components/LogoVideo";
export { MobileBottomNav, FloatingSupportButton } from "./components/MobileUI";
export { MockListingsCarousel } from "./components/MockListingsCarousel";
export {
  CauseKindLogo,
  CareNestLogo,
  SiteHeader,
  SiteFooter,
} from "./components/Navbar";
export { NotificationBell } from "./components/NotificationBell";
export { ParticleBackground } from "./components/ParticleBackground";
export { PhoneAnimationSection } from "./components/PhoneAnimationSection";
export { Reveal } from "./components/Reveal";
export { ScrollProgress } from "./components/ScrollProgress";
export { ShareButton } from "./components/ShareButton";
export { SuperAdminRedirect } from "./components/SuperAdminRedirect";
export { WelcomeOverlay } from "./components/WelcomeOverlay";

// ── home/ ─────────────────────────────────────────────────────────
export { CTASection } from "./components/home/CTASection";
export { DoneeRequestsSection } from "./components/home/DoneeRequestsSection";
// HeroQuoteSlider/HeroImageSlider/HeroSection excluded: HeroSection calls a
// Next.js Server Action (getHeroImages, "use server") that reads the
// filesystem — it cannot run in a browser-only bundle outside Next's server
// runtime, so no amount of bundler config makes it resolvable here.
export { DesktopStatsBar, LiveTicker } from "./components/home/StatsBars";
export { WhatWeProvideSection } from "./components/home/WhatWeProvideSection";
export { WhyCauseKindSection } from "./components/home/WhyCauseKindSection";

// ── profile/ ──────────────────────────────────────────────────────
export { AvatarUpload } from "./components/profile/AvatarUpload";
export { SearchableSelect } from "./components/profile/SearchableSelect";
export type { SelectOption } from "./components/profile/SearchableSelect";

// ── super-admin/ ──────────────────────────────────────────────────
export { EntityTable } from "./components/super-admin/EntityTable";
export type { Column as EntityTableColumn, ColumnType as EntityTableColumnType } from "./components/super-admin/EntityTable";
export { SqlConsole } from "./components/super-admin/SqlConsole";

// ── ui/ primitives ────────────────────────────────────────────────
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/ui/alert-dialog";
export { Badge, badgeVariants } from "./components/ui/badge";
export { Button, buttonVariants } from "./components/ui/button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./components/ui/card";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuPortal,
} from "./components/ui/dropdown-menu";
export { HoverCard, HoverCardTrigger, HoverCardContent } from "./components/ui/hover-card";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";
export { Progress } from "./components/ui/progress";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
export { Switch } from "./components/ui/switch";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { Textarea } from "./components/ui/textarea";
