import type { RequestAudience } from "@/lib/requestAudience";
import styles from "./AudienceIllustration.module.css";

/**
 * Small animated illustrations for the audience dialog — decorative support
 * for the option's visible label, so aria-hidden and unfocusable.
 *
 * Everything is drawn in `currentColor` on a shared 64×64 grid; the option
 * button supplies the role colour (light and dark) via its CSS variables, so
 * the three keep their own identity whatever role the viewer has. No ids, masks
 * or gradients, so any number of instances can coexist.
 *
 * Motion is pure CSS (AudienceIllustration.module.css). `playing` runs the
 * loop; `settled` holds the resting pose (used for the option just chosen).
 * Without the CSS, the base geometry is still a complete, recognisable icon.
 */
export default function AudienceIllustration({
  audience,
  playing,
  settled = false,
  className = "",
}: {
  audience: RequestAudience;
  playing: boolean;
  settled?: boolean;
  className?: string;
}) {
  const a = (cls: string) => `${styles.anim} ${cls}`;
  const svgProps = {
    className: `${styles.svg} ${styles[audience]} ${className}`,
    viewBox: "0 0 64 64",
    "aria-hidden": true,
    focusable: false,
    "data-playing": playing ? "true" : "false",
    "data-settled": settled ? "true" : "false",
  } as const;

  if (audience === "everyone") {
    // People on the left, an organisation on the right, a shared heart between.
    return (
      <svg {...svgProps}>
        <path className={styles.neutral} d="M5 50h54" />
        <g className={a(styles.evPeople)}>
          <circle cx="12" cy="28" r="4" />
          <path d="M5 46c0-5.6 3.1-9 7-9s7 3.4 7 9" />
          <circle cx="24" cy="31" r="3.4" />
          <path d="M18.5 46c0-4.6 2.5-7.4 5.5-7.4s5.5 2.8 5.5 7.4" />
        </g>
        <path className={`${styles.link} ${a(styles.evLinkL)}`} pathLength={1} d="M26 25c1.5-3 3-5 5-6" />
        <path className={`${styles.link} ${a(styles.evLinkR)}`} pathLength={1} d="M37 19c2 1 3.5 3 4.5 5.5" />
        <path
          className={a(styles.evHeart)}
          d="M34 22.5s-4.8-2.9-4.8-6.3a2.7 2.7 0 0 1 4.8-1.6 2.7 2.7 0 0 1 4.8 1.6c0 3.4-4.8 6.3-4.8 6.3z"
          fill="currentColor"
          fillOpacity={0.9}
        />
        <g className={a(styles.evBuilding)}>
          <path d="M40 32l9.5-6.5L59 32" />
          <path d="M42 31v15h15V31" />
          <path d="M47.5 46v-5a2 2 0 0 1 4 0v5" />
        </g>
      </svg>
    );
  }

  if (audience === "donee") {
    // A person standing tall, a supportive hand, one parcel between them.
    return (
      <svg {...svgProps}>
        <path className={styles.neutral} d="M5 52h54" />
        <path className={a(styles.dnHeart)} d="M35 16.5s-3.6-2.2-3.6-4.8a2 2 0 0 1 3.6-1.2 2 2 0 0 1 3.6 1.2c0 2.6-3.6 4.8-3.6 4.8z" />
        <g className={a(styles.dnPerson)}>
          <circle cx="45" cy="21" r="5" />
          <path d="M35 52c0-9.4 4.4-15 10-15s10 5.6 10 15" />
        </g>
        <g className={a(styles.dnHand)}>
          <path d="M6 37v11" />
          <path d="M6 39.5h5.5c1.4 0 2.6.5 3.6 1.4l2.4 2.1h7.5a2.2 2.2 0 0 1 0 4.4H16.5" />
        </g>
        <g className={a(styles.dnParcel)}>
          <rect x="18.5" y="31" width="9.5" height="8" rx="1.5" />
          <path d="M23.25 31v8" />
        </g>
        <g className={a(styles.dnParcelRest)}>
          <rect x="18.5" y="31" width="9.5" height="8" rx="1.5" />
          <path d="M23.25 31v8" />
        </g>
      </svg>
    );
  }

  // A community building with its doorway, one parcel, two people it serves.
  return (
    <svg {...svgProps}>
      <path className={styles.neutral} d="M5 50h54" />
      <path d="M17 25L32 15l15 10" />
      <path d="M19.5 24v26h25V24" />
      <path className={`${styles.soft} ${a(styles.ngDoor)}`} d="M28 50v-7.5a4 4 0 0 1 8 0V50z" />
      <path d="M28 50v-7.5a4 4 0 0 1 8 0V50" />
      <g className={a(styles.ngParcel)}>
        <rect x="21.5" y="44" width="5" height="5" rx="1" />
      </g>
      <path className={`${styles.link} ${a(styles.ngLinkL)}`} pathLength={1} d="M29 55c-6 2.5-12 2.5-17-.5" />
      <path className={`${styles.link} ${a(styles.ngLinkR)}`} pathLength={1} d="M35 55c6 2.5 12 2.5 17-.5" />
      <g className={a(styles.ngPersonL)}>
        <circle cx="10" cy="39" r="3" />
        <path d="M5.5 50c0-3.8 2-6.2 4.5-6.2s4.5 2.4 4.5 6.2" />
      </g>
      <g className={a(styles.ngPersonR)}>
        <circle cx="54" cy="39" r="3" />
        <path d="M49.5 50c0-3.8 2-6.2 4.5-6.2s4.5 2.4 4.5 6.2" />
      </g>
    </svg>
  );
}
