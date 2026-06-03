"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

function CauseKindLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <span
      className={`font-extrabold tracking-tight ${sizes[size]}`}
      style={{ fontFamily: "var(--font-nunito), sans-serif" }}
    >
      <span className="brand-cause">Cause</span>
      <span className="brand-kind">kind</span>
    </span>
  );
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const dashHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  function handleLogout() {
    logout();
    router.push("/");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <CauseKindLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {[
            { href: "/campaigns", label: "Campaigns" },
            { href: "/requests", label: "In-Kind Requests" },
            { href: "/items", label: "Item Listings" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href={dashHref}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-accent hover:text-foreground"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <span className="max-w-[160px] truncate text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link href="/register"><Button size="sm" className="bg-primary text-white hover:bg-primary/90">Sign up</Button></Link>
            </>
          )}
        </div>

        <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex flex-col">
              {[
                { href: "/campaigns", label: "Campaigns" },
                { href: "/requests", label: "In-Kind Requests" },
                { href: "/items", label: "Item Listings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link href={dashHref} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
                  Dashboard
                </Link>
              )}
              <div className="mt-2 flex gap-2 border-t pt-3">
                {user ? (
                  <Button variant="outline" className="w-full" onClick={handleLogout}>Log out</Button>
                ) : (
                  <>
                    <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">Log in</Button>
                    </Link>
                    <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                      <Button className="w-full">Sign up</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <CauseKindLogo size="lg" />
          <p className="mt-3 text-background/60 leading-relaxed">
            India&apos;s verified giving platform. Zero fees for donors — 100% of your donation goes to the cause.
          </p>
        </div>
        <div>
          <p className="font-semibold text-background">Give</p>
          <ul className="mt-3 space-y-2 text-background/60">
            <li><Link href="/campaigns" className="hover:text-background transition">Money campaigns</Link></li>
            <li><Link href="/items" className="hover:text-background transition">Item listings</Link></li>
            <li><Link href="/requests" className="hover:text-background transition">In-kind requests</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-background">Get support</p>
          <ul className="mt-3 space-y-2 text-background/60">
            <li><Link href="/register" className="hover:text-background transition">Create an account</Link></li>
            <li><Link href="/dashboard" className="hover:text-background transition">My dashboard</Link></li>
            <li><Link href="/campaigns/new" className="hover:text-background transition">Start a campaign</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-background">Trust</p>
          <ul className="mt-3 space-y-2 text-background/60">
            <li>Admin-verified listings</li>
            <li>Zero fees charged to donors</li>
            <li>Razorpay-secured payments</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10 py-5 text-center text-xs text-background/40">
        © {new Date().getFullYear()} <span className="brand-cause font-semibold">Cause</span><span className="brand-kind font-semibold">kind</span>. Made with care in India.
      </div>
    </footer>
  );
}
