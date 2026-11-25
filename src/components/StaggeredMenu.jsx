"use client";
import { LandingText, LandingAttributes } from "@/components/LandingTranslation";


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

import React, { useEffect, useRef, useState } from 'react';
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
      style={{ '--sm-reveal-delay': `${Math.min(idx, 8) * 28}ms` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <LandingAttributes><button
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
            <span><LandingText>{item.label}</LandingText></span>
            <ChevronDown
              className={`sm-submenu-chevron w-4 h-4 sm:w-5 sm:h-5 text-[var(--sm-accent,#1E6B4F)] opacity-75 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </span>
      </button></LandingAttributes>

      <LandingAttributes><div
        id={submenuId}
        className={'sm-submenu-wrapper' + (isOpen ? ' is-open' : '')}
        role="region"
        aria-label={item.label}
      >
        <ul className="sm-submenu-list" role="list">
          {item.children.map((child, cIdx) => (
            <li className="sm-submenu-itemWrap" key={child.label + cIdx}>
              <LandingAttributes><a
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
                <span className="sm-submenu-label"><LandingText>{child.label}</LandingText></span>
                {child.isLocked && (
                  <Lock
                    className="w-3.5 h-3.5 text-ngo-600 dark:text-ngo-400 shrink-0 opacity-80 sm-lock-icon"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
              </a></LandingAttributes>
            </li>
          ))}
        </ul>
      </div></LandingAttributes>
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
  // CSS owns the panel transform; no per-item JS animation on opening.
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
      <LandingAttributes><button
        type="button"
        className="sm-backdrop"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => onClose?.()}
      /></LandingAttributes>

      <aside id="staggered-menu-panel" className="staggered-menu-panel" data-lenis-prevent inert={!open}>
        <div className="sm-panel-inner">
          {header && <div className="sm-panel-header"><LandingText>{header}</LandingText></div>}

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
                  <li className="sm-panel-itemWrap" key={it.label + idx} style={{ '--sm-reveal-delay': `${Math.min(idx, 8) * 28}ms` }}>
                    <LandingAttributes><a
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
                          <span><LandingText>{it.label}</LandingText></span>
                          {it.isLocked && (
                            <Lock
                              className="w-4 h-4 text-ngo-600 dark:text-ngo-400 shrink-0 opacity-80 sm-lock-icon"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </span>
                    </a></LandingAttributes>
                  </li>
                )
              )
            ) : (
              <li className="sm-panel-itemWrap" aria-hidden="true">
                <span className="sm-panel-item">
                  <span className="sm-panel-itemLabel"><LandingText>No items</LandingText></span>
                </span>
              </li>
            )}
          </ul>

          {displaySocials && socialItems && socialItems.length > 0 && (
            <LandingAttributes><div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title"><LandingText>Socials</LandingText></h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                      <LandingText>{s.label}</LandingText>
                    </a>
                  </li>
                ))}
              </ul>
            </div></LandingAttributes>
          )}

          {footer && <div className="sm-panel-footer"><LandingText>{footer}</LandingText></div>}
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;
