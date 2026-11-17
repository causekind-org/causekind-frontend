/**
 * Single source of truth for CauseKind official social media profiles.
 * Social profile links must appear ONLY in the footer.
 */

export interface SocialLink {
  id: "instagram" | "linkedin" | "youtube" | "facebook" | "x";
  name: string;
  url: string;
  ariaLabel: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: "instagram",
    name: "Instagram",
    url: "https://instagram.com/causekind",
    ariaLabel: "CauseKind on Instagram",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/causekind/",
    ariaLabel: "CauseKind on LinkedIn",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@causekind_org",
    ariaLabel: "CauseKind on YouTube",
  },
  {
    id: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/people/CauseKind/61590465683967/",
    ariaLabel: "CauseKind on Facebook",
  },
  {
    id: "x",
    name: "X",
    url: "https://x.com/causekind_",
    ariaLabel: "CauseKind on X",
  },
] as const;
