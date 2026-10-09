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

    const ctx = gsap.context(() => {}, ref);
    ctx.add(() => {
      const mm = gsap.matchMedia();
      setup(ctx, mm);
    });

    return () => {
      ctx.revert();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...dependencies]);
}
