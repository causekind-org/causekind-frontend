"use client";

/* Controlled, Next-adapted fork of the React Bits StaggeredMenu.
   Differences from the original:
   - `"use client"` (App Router).
   - CONTROLLED: open state is owned by the parent (the navbar hamburger) via
     `open` / `onClose`. The component's own toggle button + logo header are
     removed — the navbar owns the trigger.
   - `onNavigate(link)` lets items route client-side (Next router) instead of a
     full page reload; items may also carry an `onClick` action instead of a link.
   - `header` / `footer` slots render arbitrary content at the top/bottom of the
     panel (used to keep the profile line + theme/language/logout controls). */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronDown, Lock } from 'lucide-react';
import './StaggeredMenu.css';

const StaggeredMenuParentItem = ({
  item,
  idx,
  handleItemClick,
  parentMenuOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const leaveTimerRef = useRef(null);
  const parentButtonRef = useRef(null);
  const wrapperRef = useRef(null);
  const submenuId = `sm-submenu-${(item.label || 'item').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  const isChildActive = Boolean(item.children && item.children.some(c => c.active));

  const checkHoverSupported = () => {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  };

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (checkHoverSupported()) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (checkHoverSupported()) {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }
  };

  const handleFocus = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleBlur = (e) => {
    if (wrapperRef.current && wrapperRef.current.contains(e.relatedTarget)) {
      return;
    }
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      parentButtonRef.current?.focus();
    }
  };

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!parentMenuOpen) {
      setIsOpen(false);
    }
  }, [parentMenuOpen]);

  return (
    <li
      ref={wrapperRef}
      className="sm-panel-itemWrap sm-panel-itemWrap--parent"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={parentButtonRef}
        type="button"
        className={'sm-panel-item sm-panel-item--parent' + (item.active || isChildActive ? ' is-active' : '')}
        aria-label={item.ariaLabel || item.label}
        aria-expanded={isOpen}
        aria-controls={submenuId}
        data-index={idx + 1}
        onClick={handleClick}
      >
        <span className="sm-panel-itemLabel">
          <span className="inline-flex items-center gap-2">
            <span>{item.label}</span>
            <ChevronDown
              className={`sm-submenu-chevron w-4 h-4 sm:w-5 sm:h-5 text-[var(--sm-accent,#1E6B4F)] opacity-75 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </span>
      </button>

      <div
        id={submenuId}
        className={'sm-submenu-wrapper' + (isOpen ? ' is-open' : '')}
        role="region"
        aria-label={item.label}
      >
        <ul className="sm-submenu-list" role="list">
          {item.children.map((child, cIdx) => (
            <li className="sm-submenu-itemWrap" key={child.label + cIdx}>
              <a
                className={
                  'sm-submenu-item' +
                  (child.active ? ' is-active' : '') +
                  (child.isLocked ? ' is-locked' : '')
                }
                href={child.link || '#'}
                aria-label={child.ariaLabel || child.label}
                aria-current={child.active ? 'page' : undefined}
                tabIndex={isOpen ? 0 : -1}
                onClick={(e) => handleItemClick(e, child)}
              >
                <span className="sm-submenu-label">{child.label}</span>
                {child.isLocked && (
                  <Lock
                    className="w-3.5 h-3.5 text-ngo-600 dark:text-ngo-400 shrink-0 opacity-80 sm-lock-icon"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
};

export const StaggeredMenu = ({
  open = false,
  onClose,
  position = 'right',
  colors = ['#B497CF', '#5227FF'],
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  className,
  accentColor = '#5227FF',
  onNavigate,
  header,
  footer
}) => {
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });
    });
    return () => ctx.revert();
  }, [position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] > .sm-panel-itemWrap > .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          { duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: 0.08, from: 'start' } },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => gsap.set(socialLinks, { clearProps: 'opacity' })
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        busyRef.current = false;
      }
    });
  }, [position]);

  // Drive open/close from the controlled `open` prop. Skip the very first mount
  // so the panel starts hidden without a stray close animation.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (open) playOpen();
    else playClose();
  }, [open, playOpen, playClose]);

  const handleItemClick = (e, it) => {
    if (it.onClick) {
      e.preventDefault();
      it.onClick();
      onClose?.();
      return;
    }
    if (it.link && onNavigate) {
      e.preventDefault();
      onNavigate(it.link);
      onClose?.();
    }
  };

  const rawColors = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
  let layerColors = [...rawColors];
  if (layerColors.length >= 3) {
    const mid = Math.floor(layerColors.length / 2);
    layerColors.splice(mid, 1);
  }

  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper fixed-wrapper'}
      style={accentColor ? { ['--sm-accent']: accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
      /* inert, not aria-hidden: aria-hidden hides from assistive tech but leaves
         the subtree in the tab order, so a closed menu was still Tab-reachable —
         and the browser refuses to apply it at all when a descendant holds focus
         (tapping a link closes the menu while that <a> is still focused). inert
         does both, and moves focus out itself. Safe on the wrapper because this
         component is controlled: the trigger lives in the navbar, outside it. */
      inert={!open}
    >
      {/* Backdrop — click away to close */}
      <button
        type="button"
        className="sm-backdrop backdrop-blur-md"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => onClose?.()}
      />

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {layerColors.map((c, i) => (
          <div key={i} className="sm-prelayer" style={{ background: c }} />
        ))}
      </div>

      <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" inert={!open}>
        <div className="sm-panel-inner">
          {header && <div className="sm-panel-header">{header}</div>}

          <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
            {items && items.length ? (
              items.map((it, idx) =>
                it.children && it.children.length > 0 ? (
                  <StaggeredMenuParentItem
                    key={it.label + idx}
                    item={it}
                    idx={idx}
                    handleItemClick={handleItemClick}
                    parentMenuOpen={open}
                  />
                ) : (
                  <li className="sm-panel-itemWrap" key={it.label + idx}>
                    <a
                      className={
                        'sm-panel-item' +
                        (it.active ? ' is-active' : '') +
                        (it.isLocked ? ' is-locked' : '')
                      }
                      href={it.link || '#'}
                      aria-label={it.ariaLabel || it.label}
                      aria-current={it.active ? 'page' : undefined}
                      data-index={idx + 1}
                      onClick={e => handleItemClick(e, it)}
                    >
                      <span className="sm-panel-itemLabel">
                        <span className="inline-flex items-center gap-2">
                          <span>{it.label}</span>
                          {it.isLocked && (
                            <Lock
                              className="w-4 h-4 text-ngo-600 dark:text-ngo-400 shrink-0 opacity-80 sm-lock-icon"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </span>
                    </a>
                  </li>
                )
              )
            ) : (
              <li className="sm-panel-itemWrap" aria-hidden="true">
                <span className="sm-panel-item">
                  <span className="sm-panel-itemLabel">No items</span>
                </span>
              </li>
            )}
          </ul>

          {displaySocials && socialItems && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {footer && <div className="sm-panel-footer">{footer}</div>}
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;
