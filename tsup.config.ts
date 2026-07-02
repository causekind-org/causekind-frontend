import { defineConfig } from "tsup";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json") as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

// "next" is deliberately excluded here (see the define block below) — esbuild
// treats a bare package name in `external` as covering ALL its subpaths too
// (next/link, next/navigation, ...), so leaving it in would still defer them.
const externalDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
].filter((name) => name !== "next");

export default defineConfig({
  entry: { index: "src/design-system-entry.ts" },
  format: ["esm"],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  outDir: "dist",
  clean: true,
  tsconfig: "tsconfig.json",
  platform: "browser",
  // NOTE: next/* subpaths (next/link, next/navigation, next/image) are
  // intentionally NOT external — see the define block below for why.
  external: [...externalDeps, /^@\/app\//],
  // tsup auto-externalizes anything in package.json `dependencies` even
  // when it's not in the `external` array above — noExternal is the
  // documented override to force "next" to actually get bundled.
  noExternal: ["next"],
  // KNOWN UNRESOLVED BUG: `import Image from "next/image"` crashes any
  // component that's given a real image URL with "Element type is invalid
  // ... got: object" (floor cards never hit this — their default props
  // leave listing arrays empty, so the <Image> branch never even renders).
  // `import Link from "next/link"` uses the IDENTICAL wrapper pattern
  // (node_modules/next/{link,image}.js both do a runtime
  // `module.exports = require("./inner-file")`, and both inner files set
  // `__esModule` via Object.defineProperty + a `default` getter) yet Link
  // works fine — so this isn't the __esModule-visibility issue it looks
  // like at first (tried aliasing straight past the wrapper to
  // next/dist/shared/lib/image-external via esbuildOptions().alias — same
  // crash, confirming that theory wrong; removed). Root cause not isolated
  // after significant investigation. WORKAROUND (see .design-sync/NOTES.md
  // "next/image previews"): author previews with `imageUrl: null` /
  // omit real image props so the component's own image-missing fallback
  // renders instead of hitting the <Image> branch. Real fix TODO for a
  // future session: bisect __toESM's isNodeMode path more precisely, or
  // patch next/image usage sites to use a plain <img> in this build only.
  // Our own NEXT_PUBLIC_* vars: Next.js normally inlines these at build
  // time, tsup doesn't know to. Left as bare `process.env.X`, they crash the
  // whole bundle at load (ReferenceError: process is not defined) since
  // every component's module evaluates together in one shared chunk. A
  // placeholder covers the OAuth client ID (design previews never complete
  // a live OAuth flow, so only "some string" is needed) and the real dev
  // API URL for the rest.
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://localhost:8080"),
    "process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID": JSON.stringify("unused-in-design-sync-preview"),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  // next/link, next/navigation, and next/image's own compiled client code
  // reads MANY internal process.env.__NEXT_* flags (basePath, trailingSlash,
  // i18n, image opts, deployment id, ...) that Next's webpack config
  // normally statically replaces at build time — same crash-everything
  // problem as above, but the exact flag set is large, undocumented, and
  // version-specific (tried enumerating them individually; missed several,
  // and got NEXT_RUNTIME's meaning backwards — it silently routed a
  // scheduler helper to the Node-only process.nextTick branch instead of
  // the browser-safe setTimeout branch). A general runtime shim is more
  // robust than chasing each one: this is why next/* is bundled here
  // (noExternal) rather than left external — so the shim below, prepended
  // before ALL bundle code, covers every process.* access uniformly,
  // including ones we haven't hit yet.
  banner: {
    js: [
      `if (typeof globalThis.process === "undefined") { globalThis.process = { env: new Proxy({}, { get: () => undefined }), nextTick: (cb, ...a) => Promise.resolve().then(() => cb(...a)), browser: true, version: "" }; }`,
      // Next's inlined CJS internals call require("react"), require("react-dom"),
      // and require("react/jsx-runtime") from inside function bodies
      // (esbuild can't statically lift those), which throws "Dynamic
      // require of ... is not supported" in a browser with no real
      // require(). The design-sync preview HTML loads _vendor/react.js and
      // _vendor/react-dom.js as real globals (window.React/window.ReactDOM)
      // before this bundle runs, so "react"/"react-dom" resolve straight
      // from those. react/jsx-runtime has no vendor build (only the main
      // UMD react.js ships) — first attempt was importing the real module
      // ourselves and stashing it on a global for this shim to read, but
      // that assignment didn't reliably survive the converter's SECOND,
      // separate esbuild pass (dist/index.js -> _ds_bundle.js) — by the time
      // next/link's code called require("react/jsx-runtime"), the stashed
      // global was undefined ("Cannot read properties of undefined (reading
      // 'jsx')"). Rebuilt jsx/jsxs from window.React.createElement instead —
      // zero cross-pass ordering dependency, since React.createElement is a
      // real global by the time this shim even runs. React.createElement
      // already merges a `children` prop found on the config object (same
      // one the jsx-runtime call convention passes), so no manual argument
      // juggling is needed; jsxs (multiple static children) has the same
      // runtime signature as jsx in the automatic runtime.
      `globalThis.__csJsxRuntime = { jsx: function(type, props, key) { var p = key === undefined ? props : Object.assign({}, props, { key: key }); return React.createElement(type, p); }, Fragment: React.Fragment };`,
      `globalThis.__csJsxRuntime.jsxs = globalThis.__csJsxRuntime.jsx;`,
      // `require("react")` must resolve to something EVERY interop helper
      // treats consistently — Next ships its OWN Babel/SWC-style
      // _interop_require_wildcard alongside esbuild's __toESM in its
      // compiled internals, and they don't agree on unmarked objects.
      // Belt-and-suspenders: hand back an already-ESM-shaped object (real
      // __esModule flag + default + every named export spread on top) so
      // neither interop helper feels the need to wrap it further.
      `var __csReactESM = Object.assign({ __esModule: true, default: globalThis.React }, globalThis.React);`,
      `var __csReactDomESM = Object.assign({ __esModule: true, default: globalThis.ReactDOM }, globalThis.ReactDOM);`,
      `if (typeof globalThis.require === "undefined") { globalThis.require = function(spec) { if (spec === "react") return __csReactESM; if (spec === "react-dom" || spec === "react-dom/client") return __csReactDomESM; if (spec === "react/jsx-runtime" || spec === "react/jsx-dev-runtime") return globalThis.__csJsxRuntime; throw new Error('Dynamic require of "' + spec + '" is not supported'); }; }`,
      // Sections built as scroll reveals (framer-motion `whileInView`, and
      // our own useInView/IntersectionObserver hooks) start at opacity:0 and
      // only animate in once scrolled into the viewport — a static preview
      // screenshot never scrolls, so they'd render genuinely blank (no
      // crash, just invisible). Global fix: make every observed element
      // report "already intersecting" immediately, so scroll-reveal content
      // just shows in its final visible state instead of staying hidden.
      `globalThis.IntersectionObserver = class { constructor(cb) { this._cb = cb; } observe(target) { Promise.resolve().then(() => this._cb([{ isIntersecting: true, intersectionRatio: 1, target }], this)); } unobserve() {} disconnect() {} takeRecords() { return []; } };`,
    ].join("\n"),
  },
});
