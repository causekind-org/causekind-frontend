# Blog source

Raw material the blog posts in `src/data/blogData.ts` were built from.

- `json/` — the authored article files (committed).
- `images/` — the original full-size artwork (**not committed**, see `.gitignore`).
  The optimised WebP the site serves is committed under `public/`.

`src/data/blogData.ts` is the single source of truth the site renders from;
these files are kept for reference and re-editing, not read at build time.
