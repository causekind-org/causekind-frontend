import type { NgoReviewDetail } from "@/lib/api";

const STRUCTURE_LABELS: Record<string, string> = { trust: "Trust", society: "Society", section8: "Section 8 company" };

function sourceLabel(source: string | null) {
  if (source === "card") return "Read from the PAN card";
  if (source === "typed") return "Typed by the NGO";
  return "Unknown";
}

/**
 * The "PAN check" box in the NGO application review: the signup PAN, its holder type
 * (4th letter) against the chosen structure, its 5th letter against the organization
 * name, and whether the values were read from the card or typed. Red for a personal PAN
 * or a mismatch. Advisory only.
 */
export function NgoPanCheckBox({ panCheck }: { panCheck: NgoReviewDetail["panCheck"] }) {
  if (!panCheck) return null;
  const c = panCheck.check;
  const structure = c.legalStructure ? STRUCTURE_LABELS[c.legalStructure] ?? c.legalStructure : "No structure";
  const bad = c.personalPan || c.structureMatches === false || c.nameLetterMatches === false || !c.validFormat;
  const tone = (ok: boolean | null) =>
    ok === false ? "text-red-700 dark:text-red-300 font-semibold" : ok === true ? "text-emerald-700 dark:text-emerald-300" : "";

  return (
    <section
      aria-label="PAN check"
      data-testid="pan-check"
      data-status={bad ? "problem" : "ok"}
      className={`mt-6 rounded-lg border p-4 text-sm ${bad
        ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
        : "border-stone-200 bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900"}`}
    >
      <h3 className="font-bold">PAN check</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><dt className="text-stone-500">PAN</dt><dd className="mt-1 font-mono">{c.panNumber || "Not provided"}</dd></div>
        <div>
          <dt className="text-stone-500">Holder type (4th letter)</dt>
          <dd className={`mt-1 ${tone(c.personalPan ? false : c.structureMatches)}`} data-testid="pan-check-holder">
            {c.holderType ?? "Not a valid PAN"}
            {c.personalPan
              ? " · personal PAN, not an organization's"
              : c.structureMatches === true ? ` · matches ${structure}`
                : c.structureMatches === false ? ` · does not match ${structure}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">5th letter vs organization name</dt>
          <dd className={`mt-1 ${tone(c.nameLetterMatches)}`} data-testid="pan-check-name">
            {c.nameLetterMatches === null ? "Not checked"
              : c.nameLetterMatches ? `Matches (${c.nameLetter})`
                : `Does not match (PAN ${c.panNumber?.[4]}, name ${c.nameLetter})`}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Where the values came from</dt>
          <dd className="mt-1" data-testid="pan-check-sources">
            Name: {sourceLabel(panCheck.organizationNameSource)} · Date: {sourceLabel(panCheck.dateOfFormationSource)} · PAN: {sourceLabel(panCheck.panNumberSource)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
