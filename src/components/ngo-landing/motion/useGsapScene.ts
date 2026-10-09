import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export function useGsapScene(
  ref: React.RefObject<Element | null>,
  setup: (context: gsap.Context, mm: gsap.MatchMedia) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    if (!ref.current) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      setup(ctx, mm);
    }, ref);

    return () => {
      ctx.revert();
      mm.revert();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...dependencies]);
}
