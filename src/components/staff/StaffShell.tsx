"use client";

import { useState, type ReactNode, type ComponentType } from "react";
import { LogOut, Menu } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

/**
 * Shared frame for the Admin and Super Admin consoles: floating glass sidebar
 * (fixed brand, scrolling nav, fixed identity + sign-out), rounded glass topbar
 * and the tinted workspace. Styling lives in `styles/staff-console.css`,
 * scoped under `.ck-staff`.
 *
 * Permission logic stays in each console — the shell only renders the `nav`
 * node it is given. Below `lg` the same nav opens in a bottom drawer; any click
 * on a nav button inside it closes the drawer.
 */
export function StaffShell({
  consoleLabel,
  nav,
  email,
  onSignOut,
  topbarStart,
  topbarEnd,
  children,
}: {
  /** "Admin" or "Super Admin" — shown under the CauseKind wordmark. */
  consoleLabel: string;
  nav: ReactNode;
  email: string;
  onSignOut: () => void;
  /** Left side of the topbar (e.g. current section, search trigger). */
  topbarStart?: ReactNode;
  /** Right side of the topbar (e.g. notification bell). */
  topbarEnd?: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-white/20 bg-white/10 text-[15px] font-bold">
        CK
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-tight">CauseKind</span>
        <span className="block text-[11.5px] leading-tight text-[color:var(--st-on-dark-2)]">{consoleLabel}</span>
      </span>
    </div>
  );

  const footer = (
    <div className="shrink-0 border-t border-[color:var(--st-line-dark)] p-3">
      <p className="mb-1.5 truncate px-3 font-mono text-[11px] text-[color:var(--st-on-dark-2)]" title={email}>{email}</p>
      <button type="button" onClick={onSignOut} className="ck-staff-nav-item hover:!bg-red-500/15">
        <LogOut className="size-4 shrink-0" aria-hidden /> Sign out
      </button>
    </div>
  );

  return (
    <div className="ck-staff">
      <aside className="ck-staff-aside hidden lg:flex" aria-label={`${consoleLabel} navigation`}>
        <div className="shrink-0 px-4 pb-3 pt-4">{brand}</div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">{nav}</nav>
        {footer}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col gap-5 p-3 sm:p-4 lg:py-6 lg:pr-6 lg:pl-[calc(var(--st-sidebar-w)+48px)]">
        <header className="ck-staff-topbar sticky top-3 z-20 lg:top-6">
          <button type="button" className="ck-staff-icon-btn lg:hidden" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
            <Menu className="size-4.5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">{topbarStart}</div>
          <div className="flex shrink-0 items-center gap-2">{topbarEnd}</div>
        </header>

        <main className="ck-staff-workspace flex-1">{children}</main>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="ck-staff !min-h-0 max-h-[88vh] !border-white/15 !bg-[#153f34] text-[color:var(--st-on-dark)]">
          <DrawerTitle className="sr-only">{consoleLabel} navigation</DrawerTitle>
          <div className="px-4 pt-3">{brand}</div>
          <nav
            className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3"
            onClickCapture={(e) => {
              // Selecting a destination closes the sheet; group toggles
              // (aria-expanded) keep it open.
              const btn = (e.target as HTMLElement).closest("button");
              if (btn && !btn.hasAttribute("aria-expanded")) setDrawerOpen(false);
            }}
          >
            {nav}
          </nav>
          {footer}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function StaffNavHeading({ children }: { children: ReactNode }) {
  return <p className="ck-staff-nav-heading">{children}</p>;
}

/** One sidebar group: heading (or custom header) above a single card whose items are split by hairlines. */
export function StaffNavGroup({ title, header, children }: { title?: ReactNode; header?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {header ?? (title != null && <StaffNavHeading>{title}</StaffNavHeading>)}
      <div className="ck-staff-nav-group">{children}</div>
    </div>
  );
}

export function StaffNavItem({
  label,
  icon: Icon,
  active,
  count,
  countTone,
  onClick,
  title,
  trailing,
}: {
  label: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active: boolean;
  /** Actionable count; hidden when 0 or undefined. */
  count?: number;
  countTone?: "danger";
  onClick: () => void;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title} aria-current={active ? "page" : undefined} className="ck-staff-nav-item">
      {Icon && <Icon className="size-4 shrink-0 opacity-90" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
      {count != null && count > 0 && (
        <span className="ck-staff-nav-badge" data-tone={countTone} aria-label={`${count} waiting`}>{count}</span>
      )}
    </button>
  );
}

/** Topbar left: current page label with its one-line hint. */
export function StaffTopbarTitle({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2.5">
      <span className="truncate text-sm font-semibold">{label}</span>
      {hint && <span className="hidden truncate text-xs text-[color:var(--st-on-dark-2)] md:inline">{hint}</span>}
    </div>
  );
}
