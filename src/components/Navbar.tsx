"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const dashHref =
    user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  function handleLogout() {
    logout();
    router.push("/");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">CauseKind</span>
          <span className="ml-1 hidden rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground sm:inline">
            Verified
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link href="/campaigns" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground">
            Campaigns
          </Link>
          <Link href="/requests" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground">
            In-Kind Requests
          </Link>
          <Link href="/items" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground">
            Item Listings
          </Link>
          {user && (
            <Link href={dashHref} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground">
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
              <Link href="/register"><Button size="sm">Sign up</Button></Link>
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
              <Link href="/campaigns" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
                Campaigns
              </Link>
              <Link href="/requests" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
                In-Kind Requests
              </Link>
              <Link href="/items" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent">
                Item Listings
              </Link>
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
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </div>
            <span className="font-semibold">CauseKind</span>
          </div>
          <p className="mt-3 text-muted-foreground">
            India&apos;s verified giving platform. Zero fees for donors — 100% of your donation goes to the cause.
          </p>
        </div>
        <div>
          <p className="font-semibold">Give</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link href="/campaigns" className="hover:text-foreground">Money campaigns</Link></li>
            <li><Link href="/items" className="hover:text-foreground">Item listings</Link></li>
            <li><Link href="/requests" className="hover:text-foreground">In-kind requests</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Receive</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link href="/register" className="hover:text-foreground">Create an account</Link></li>
            <li><Link href="/donee/dashboard" className="hover:text-foreground">Donee dashboard</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Trust</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Admin-verified listings</li>
            <li>Zero fees charged to donors</li>
            <li>Razorpay-secured payments</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CauseKind. Made with care in India.
      </div>
    </footer>
  );
}
