/**
 * Whose requests a visitor wants to browse on the guest board — a filter for
 * this visit, NOT an account role. Choosing "NGOs" registers nobody as an NGO,
 * and nothing here touches roleTheme, the session or storage. Per the owner
 * (2026-09-29) nothing is saved: the dialog asks on every visit.
 *
 * <p>This is the single definition of the three choices. The board's URL keeps
 * its existing `type` values (none / people / ngos), and the backend its
 * `requesterType` (PERSON / NGO); `urlType` below is the only bridge, so there is
 * no second taxonomy to drift.
 */

export type RequestAudience = "everyone" | "donee" | "ngo";
export type AudienceUrlType = "all" | "people" | "ngos";

type Palette = { accent: string; tint: string };

export type AudienceOption = {
  value: RequestAudience;
  urlType: AudienceUrlType;
  label: string;
  description: string;
  /** Values from src/lib/roleTheme.ts — donor orange, donee navy, NGO green. */
  light: Palette;
  dark: Palette;
};

export const AUDIENCE_OPTIONS: readonly AudienceOption[] = [
  {
    value: "everyone", urlType: "all", label: "Everyone",
    description: "See requests from people and NGOs.",
    light: { accent: "#b04a15", tint: "rgba(176,74,21,0.10)" },
    dark: { accent: "#e07b3a", tint: "rgba(224,123,58,0.16)" },
  },
  {
    value: "donee", urlType: "people", label: "Donee",
    description: "Help a person or family.",
    light: { accent: "#1e3a60", tint: "rgba(30,58,96,0.10)" },
    dark: { accent: "#7fb0e8", tint: "rgba(127,176,232,0.16)" },
  },
  {
    value: "ngo", urlType: "ngos", label: "NGOs",
    description: "Help an organisation support its community.",
    light: { accent: "#1E6B4F", tint: "rgba(30,107,79,0.10)" },
    dark: { accent: "#86CFAE", tint: "rgba(134,207,174,0.16)" },
  },
];

export function audienceFromUrlType(t: AudienceUrlType): RequestAudience {
  return AUDIENCE_OPTIONS.find(o => o.urlType === t)?.value ?? "everyone";
}

export function urlTypeFromAudience(a: RequestAudience): AudienceUrlType {
  return AUDIENCE_OPTIONS.find(o => o.value === a)?.urlType ?? "all";
}
