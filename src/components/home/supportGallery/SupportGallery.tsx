"use client";

/**
 * "Where does my support go?" — real photographs from CauseKind drives, laid
 * out like prints scattered on a table.
 *
 * <p>It follows the landing film on purpose: the film is scroll-driven and
 * cinematic, this is still, tactile and yours to handle. No pin, no carousel —
 * every photo is on the table at once.
 *
 * <p><b>Desktop / tablet</b> (≥ 768px): an asymmetric composition around the
 * headline, which the prints overlap and tuck under. They arrive one by one,
 * drift with the cursor and the scroll by depth, straighten when hovered, and
 * one click picks a print up to the middle of the table with its card, while
 * the rest step aside but stay in view. Another click swaps it for the next.
 *
 * <p><b>Phone</b>: a pile — one print on top, a few peeking out behind it.
 * Swipe, tap a peeking print, or use the index to bring another to the top.
 *
 * <p>Motion is transform and opacity only; the cursor and scroll parallax
 * write three CSS variables once per frame, and only while the table is on
 * screen. Reduced motion gets the finished composition with no movement.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import styles from "./SupportGallery.module.css";
import { galleryFonts } from "./fonts";
import { PHOTOS, SLOTS, type Photo } from "./photos";

const DEPTH_PX = { back: 2.5, mid: 5, front: 11 } as const;
const DEPTH_SCROLL = { back: -8, mid: -18, front: -34 } as const;

const two = (n: number) => String(n).padStart(2, "0");

/** Frame height ÷ width for a photo in its frame (the print has a deep lip). */
function frameRatio(p: Photo) {
  const r = p.h / p.w;
  if (p.frame === "print") return 0.916 * r + 0.192;
  if (p.frame === "tape") return 0.94 * r + 0.06;
  return r;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A small hand-drawn arrow for the margin notes. */
function Squiggle() {
  return (
    <svg viewBox="0 0 44 20" fill="none" aria-hidden>
      <path d="M2 14c8-9 18-11 30-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27 3.5l6 4.6-6.6 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The print itself — frame, image, tape or corners, grain. */
function Print({ photo, depth, sizes }: { photo: Photo; depth: string; sizes: string }) {
  return (
    <span className={styles.frame} data-frame={photo.frame} data-depth={depth}>
      {photo.frame === "corners" && (
        <>
          <span className={styles.corner} aria-hidden />
          <span className={styles.corner} aria-hidden />
          <span className={styles.corner} aria-hidden />
          <span className={styles.corner} aria-hidden />
        </>
      )}
      <span className={styles.img} data-depth={depth} style={{ aspectRatio: `${photo.w} / ${photo.h}` }}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} draggable={false} />
      </span>
    </span>
  );
}

function Counter({ unseen, total }: { unseen: number; total: number }) {
  return (
    <p className={`${styles.counter} ${styles.mono}`} aria-live="polite">
      <span className={styles.counterNum}>{two(unseen)}</span>
      <span>{unseen === 0 ? `all ${two(total)} seen` : unseen === total ? "moments to explore" : "left to explore"}</span>
    </p>
  );
}

/* ══ Desktop / tablet: the table ══════════════════════════════════════════ */

function Table({
  photos,
  viewed,
  onView,
}: {
  photos: Photo[];
  viewed: Set<string>;
  onView: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, vw: 1440, vh: 900 });
  const [active, setActive] = useState<number | null>(null);
  // "static" until JS decides: server HTML and no-JS show the finished table.
  const [arrive, setArrive] = useState<"static" | "false" | "true">("static");

  // Stage size, for the lift geometry.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight, vw: window.innerWidth, vh: window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Arrival: armed only if the table is still below the fold, played once.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;
    setArrive("false");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setArrive("true");
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Cursor + scroll parallax — three CSS variables, written at most once a
  // frame, and the scroll half only while the table is on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    const write = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const sy = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--sy", sy.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };
    const onLeave = () => {
      px = 0;
      py = 0;
      schedule();
    };
    let onScreen = false;
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) {
        window.addEventListener("scroll", schedule, { passive: true });
        schedule();
      } else window.removeEventListener("scroll", schedule);
    });
    io.observe(el);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const pick = useCallback(
    (i: number) => {
      setActive((cur) => (cur === i ? null : i));
      onView(photos[i].id);
    },
    [onView, photos],
  );

  // Esc puts the print back.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const { w: W, h: H, vw, vh } = size;
  const geo = useMemo(
    () =>
      photos.map((p, i) => {
        const s = SLOTS[i % SLOTS.length];
        const sw = (s.w / 100) * W;
        const sh = sw * frameRatio(p);
        return { cx: (s.x / 100) * W + sw / 2, cy: (s.y / 100) * H + sh / 2, sw, sh };
      }),
    [photos, W, H],
  );

  // Where the picked-up print goes: a little left of centre, 55–60% of the
  // viewport wide at most, and never taller than the table.
  const lift = useMemo(() => {
    if (active === null || !W) return null;
    const p = photos[active];
    const ratio = frameRatio(p);
    const maxW = Math.min(W * 0.52, vw * 0.58);
    const maxH = Math.min(H * 0.86, vh * 0.8);
    const tw = Math.min(maxW, maxH / ratio);
    const th = tw * ratio;
    const tcx = W * 0.5;
    const tcy = H * 0.5;
    const cardW = Math.min(336, W * 0.3);
    const cardLeft = Math.min(tcx + tw / 2 - 28, W - cardW - 12);
    const cardTop = Math.max(12, Math.min(H - 230, tcy + th / 2 - 200));
    return { tw, th, tcx, tcy, cardLeft, cardTop };
  }, [active, photos, W, H, vw, vh]);

  const poseFor = (i: number) => {
    const s = SLOTS[i % SLOTS.length];
    const g = geo[i];
    if (active === null || !W || !lift) return `translate(0px, 0px) rotate(${s.rot}deg) scale(1)`;
    if (i === active) {
      return `translate(${(lift.tcx - g.cx).toFixed(1)}px, ${(lift.tcy - g.cy).toFixed(1)}px) rotate(0deg) scale(${(lift.tw / g.sw).toFixed(3)})`;
    }
    // Step aside, a little smaller and a little more turned. A print the
    // lifted one would cover slides sideways to the nearer clear gutter, so
    // every other photo stays in view and can be picked next; the rest just
    // ease outward from the middle.
    const k = 0.8;
    const hw = (g.sw * k) / 2;
    const hh = (g.sh * k) / 2;
    const gap = 14;
    const L = { l: lift.tcx - lift.tw / 2, r: lift.tcx + lift.tw / 2, t: lift.tcy - lift.th / 2, b: lift.tcy + lift.th / 2 };
    let dx: number;
    let dy = 0;
    const covered = g.cx + hw > L.l - gap && g.cx - hw < L.r + gap && g.cy + hh > L.t - gap && g.cy - hh < L.b + gap;
    if (covered) {
      const toLeft = L.l - gap - (g.cx + hw);
      const toRight = L.r + gap - (g.cx - hw);
      const leftFits = g.cx + toLeft - hw > -W * 0.04;
      const rightFits = g.cx + toRight + hw < W * 1.04;
      dx = leftFits && (!rightFits || -toLeft < toRight) ? toLeft : toRight;
    } else {
      const vx = g.cx - W / 2;
      const vy = g.cy - H / 2;
      const len = Math.hypot(vx, vy) || 1;
      dx = (vx / len) * 30;
      dy = (vy / len) * 30;
    }
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${s.rot + Math.sign(s.rot || 1) * 2.5}deg) scale(${k})`;
  };

  const activePhoto = active === null ? null : photos[active];
  const unseen = photos.length - photos.filter((p) => viewed.has(p.id)).length;

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-in={arrive === "false" ? "false" : "true"}
      data-lifted={active !== null}
      onClick={(e) => {
        if (e.target === e.currentTarget) setActive(null);
      }}
    >
      <div className={styles.intro}>
        <p className={`${styles.eyebrow} ${styles.mono}`}>From our drives</p>
        <Counter unseen={unseen} total={photos.length} />
        <span className={`${styles.hint} ${styles.hand}`}>pick one up —</span>
      </div>

      <h2 className={styles.title}>
        <span>Where does</span>
        <span>my support</span>
        <span>
          <em>go?</em>
        </span>
      </h2>

      {photos.map((p, i) => {
        const s = SLOTS[i % SLOTS.length];
        const isActive = i === active;
        return (
          <div
            key={p.id}
            className={styles.slot}
            data-active={isActive}
            style={
              {
                "--x": s.x,
                "--y": s.y,
                "--w": s.w,
                "--z": s.over ? 30 - i : 12 - i,
                "--rot": s.rot,
                "--d": DEPTH_PX[s.depth],
                "--ds": DEPTH_SCROLL[s.depth],
                "--i": i,
              } as React.CSSProperties
            }
          >
            <div className={styles.par}>
              <div className={styles.enter} data-enter={i === photos.length - 1 ? "last" : s.enter}>
                <div className={styles.pose} style={{ transform: poseFor(i) }}>
                  <button
                    type="button"
                    className={styles.photo}
                    aria-pressed={isActive}
                    aria-label={`${p.category}: ${p.caption}${isActive ? " — picked up. Press again or Escape to put it back." : ""}`}
                    onClick={() => pick(i)}
                  >
                    <Print photo={p} depth={s.depth} sizes="(min-width: 768px) 60vw, 80vw" />
                    <span className={styles.tab} aria-hidden>
                      <span className={styles.mono}>{p.category}</span>
                      <span className={`${styles.tabCaption} ${styles.serif}`}>{p.caption}</span>
                    </span>
                  </button>
                </div>
                {p.note && (
                  <span className={`${styles.note} ${styles.hand}`} data-pos={s.note} aria-hidden>
                    {s.note === "left" || s.note.endsWith("right") ? null : <Squiggle />} {p.note}{" "}
                    {s.note === "left" || s.note.endsWith("right") ? <Squiggle /> : null}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {activePhoto && lift && (
        <div
          key={activePhoto.id}
          className={styles.card}
          style={{ left: lift.cardLeft, top: lift.cardTop }}
          role="region"
          aria-live="polite"
          aria-label={`${activePhoto.category} — ${activePhoto.caption}`}
        >
          <p className={`${styles.cardCat} ${styles.mono}`}>
            {two(active! + 1)} · {activePhoto.category}
          </p>
          <p className={`${styles.cardCaption} ${styles.serif}`}>{activePhoto.caption}</p>
          {activePhoto.detail && <p className={styles.cardDetail}>{activePhoto.detail}</p>}
          <button type="button" className={`${styles.cardClose} ${styles.mono}`} onClick={() => setActive(null)}>
            Put it back <span aria-hidden>↩</span>
          </button>
        </div>
      )}

      <ol className={styles.index} aria-label="Photographs">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              className={`${styles.indexBtn} ${styles.mono}`}
              aria-current={i === active}
              aria-label={`Photo ${i + 1}: ${p.category}`}
              onClick={() => pick(i)}
            >
              {two(i + 1)}
              <span className={styles.indexLine} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ══ Phone: the pile ══════════════════════════════════════════════════════ */

/** Where each print sits relative to the top of the pile. */
const PILE = [
  { tx: "0%", ty: "0%", r: "-1.5deg", s: 1, o: 1 },
  { tx: "21%", ty: "-4%", r: "6deg", s: 0.84, o: 1 },
  { tx: "-23%", ty: "2%", r: "-7deg", s: 0.82, o: 1 },
  { tx: "3%", ty: "-9%", r: "3deg", s: 0.78, o: 0.9 },
];
const PILE_HIDDEN = { tx: "0%", ty: "-8%", r: "0deg", s: 0.72, o: 0 };
const PILE_GONE = { tx: "-115%", ty: "6%", r: "-16deg", s: 0.9, o: 0 };

function Pile({
  photos,
  viewed,
  onView,
}: {
  photos: Photo[];
  viewed: Set<string>;
  onView: (id: string) => void;
}) {
  const n = photos.length;
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (next: number, d?: 1 | -1) => {
      const i = ((next % n) + n) % n;
      setDir(d ?? (i > active || (active === n - 1 && i === 0) ? 1 : -1));
      setActive(i);
    },
    [active, n],
  );

  // The top print counts as seen once the pile is actually on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) onView(photos[active].id);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, onView, photos]);

  const unseen = n - photos.filter((p) => viewed.has(p.id)).length;
  const top = photos[active];

  return (
    <div ref={rootRef}>
      <div className="flex items-end justify-between gap-3">
        <p className={`${styles.eyebrow} ${styles.mono}`}>From our drives</p>
        <Counter unseen={unseen} total={n} />
      </div>
      <h2 className={`${styles.mTitle} mt-3`}>
        <span>Where does</span>
        <span>my support</span>
        <span>
          <em>go?</em>
        </span>
      </h2>

      <div
        className={styles.pile}
        role="region"
        aria-roledescription="photo pile"
        aria-label="Photographs from our drives"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) go(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }}
      >
        {photos.map((p, i) => {
          const rel = (i - active + n) % n;
          const pos = rel < PILE.length ? PILE[rel] : rel === n - 1 && dir === 1 ? PILE_GONE : PILE_HIDDEN;
          const visible = rel < PILE.length;
          return (
            <button
              key={p.id}
              type="button"
              className={styles.card2}
              tabIndex={visible ? 0 : -1}
              aria-hidden={!visible}
              aria-label={
                rel === 0
                  ? `Photo ${i + 1} of ${n}, on top: ${p.category}. Tap for the next.`
                  : `Photo ${i + 1} of ${n}: ${p.category}. Bring to the top.`
              }
              onClick={() => (rel === 0 ? go(active + 1, 1) : go(i))}
              style={
                {
                  // The framed print's width ÷ height, so tall prints size by height.
                  "--ar": 1 / frameRatio(p),
                  "--tx": pos.tx,
                  "--ty": pos.ty,
                  "--r": pos.r,
                  "--s": pos.s,
                  "--o": pos.o,
                  "--z": n - rel,
                } as React.CSSProperties
              }
            >
              <Print photo={p} depth="front" sizes="80vw" />
            </button>
          );
        })}
      </div>

      <div className={styles.mCaption} aria-live="polite">
        <div key={top.id}>
          <p className={`${styles.mono} text-[11px] text-[var(--sg-accent)]`}>
            {two(active + 1)} · {top.category}
          </p>
          <p className={`${styles.serif} mt-1.5 text-[1.3rem] leading-snug`}>{top.caption}</p>
          {top.detail && <p className="mt-1.5 text-sm leading-relaxed text-[var(--sg-ink)]">{top.detail}</p>}
        </div>
      </div>

      <ol className={styles.mIndex} aria-label="Photographs">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              className={`${styles.mIndexBtn} ${styles.mono}`}
              aria-current={i === active}
              aria-label={`Photo ${i + 1}: ${p.category}`}
              onClick={() => go(i)}
            >
              {two(i + 1)}
              <span className={styles.indexLine} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ══ Section ═════════════════════════════════════════════════════════════ */

export function SupportGallery({ photos = PHOTOS }: { photos?: Photo[] }) {
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());
  const onView = useCallback((id: string) => {
    setViewed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  return (
    <section
      id="where-support-goes"
      aria-label="Where does my support go? Photographs from CauseKind drives"
      className={`${styles.section} ${galleryFonts} ck-m-section`}
    >
      <div className="relative hidden px-4 py-14 md:block lg:px-8 lg:py-20">
        <Table photos={photos} viewed={viewed} onView={onView} />
      </div>
      <div className="relative px-5 md:hidden">
        <Pile photos={photos} viewed={viewed} onView={onView} />
      </div>
    </section>
  );
}
