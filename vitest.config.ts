import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import fs from "fs";

const realRoot = fs.existsSync(process.cwd()) ? fs.realpathSync(process.cwd()) : process.cwd();

export default defineConfig({
  root: realRoot,
  resolve: {
    alias: {
      vitest: path.resolve(realRoot, "node_modules/vitest"),
    },
  },
  server: {
    fs: {
      strict: false,
    },
  },
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
