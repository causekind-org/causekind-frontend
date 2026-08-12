import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest, added alongside the existing `tsc --noEmit` + `next build` gate
 * rather than replacing it.
 *
 * <p>Those two catch type errors and build breaks, which is most of what goes
 * wrong here. They cannot catch the failure this suite exists for: a link that
 * points at a route which does not exist, a `?next=` that silently loses its
 * destination, or a guest board that quietly starts calling an authenticated
 * endpoint. All three compile cleanly and all three are user-visible breakage.
 */
export default defineConfig({
  // Cast, because two copies of Vite's types are in play: Next 16 pulls in the
  // rolldown-based Vite, Vitest ships its own rollup-based one, and their
  // `Plugin` types differ on hook internals that nothing here touches. The
  // plugins are correct and work at runtime; only the structural comparison
  // between the two declaration sets fails. Narrowed to this one property
  // rather than loosening the file, so a genuine mistake elsewhere in the
  // config is still a type error.
  plugins: [tsconfigPaths(), react()] as never,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Scoped to src/ so a stray node_modules fixture is never collected.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
