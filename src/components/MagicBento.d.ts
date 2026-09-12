/*
  MagicBento is the React Bits JS/CSS variant — `MagicBento.jsx`, no types
  shipped. It was imported with a `@ts-expect-error` while it was a static
  import; through `next/dynamic` that suppression would have had to move to the
  JSX call site, where it blankets every prop at once and a mistyped one stops
  failing the build.

  This declares only the surface `src/app/requests/RequestsClient.tsx` actually
  passes. The index signature keeps the remaining React Bits knobs (the glow,
  spotlight and particle options) usable without enumerating them, so this file
  does not have to track upstream.
*/
declare module "@/components/MagicBento" {
  import type { ComponentType, ReactNode } from "react";

  export interface MagicBentoCard {
    className?: string;
    media?: ReactNode;
    label?: ReactNode;
    badge?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    meta?: ReactNode;
    onClick?: () => void;
    [prop: string]: unknown;
  }

  export interface MagicBentoProps {
    cards: MagicBentoCard[];
    gridClassName?: string;
    glowColor?: string;
    [prop: string]: unknown;
  }

  const MagicBento: ComponentType<MagicBentoProps>;
  export default MagicBento;
}
