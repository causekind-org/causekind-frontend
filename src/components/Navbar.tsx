"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogIn, UserPlus, Shield, Globe, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

function CauseKindLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <span
      className={`font-extrabold tracking-tight ${sizes[size]} flex items-center gap-2 hover:opacity-95 transition-all duration-200 text-[#1c1108] dark:text-stone-100`}
      style={{ fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman","Neue Haas Grotesk Text Pro",sans-serif' }}
    >
      <span className="logo-icon-3d h-7 w-7 rounded-xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-md shadow-orange-900/20 shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 10.5C12 10.5 9.2 8 9.2 6.2C9.2 5.1 10.2 4.5 11.1 4.9C11.6 5.2 12 5.7 12 5.7C12 5.7 12.4 5.2 12.9 4.9C13.8 4.5 14.8 5.1 14.8 6.2C14.8 8 12 10.5 12 10.5Z" fill="white"/>
          <path d="M12 11.2 L12 12.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
          <path d="M6.5 16.5C6.5 14.2 8 12.8 9.8 12.8L14.2 12.8C16 12.8 17.5 14.2 17.5 16.5C17.5 18.2 15.2 19.5 12 19.5C8.8 19.5 6.5 18.2 6.5 16.5Z" fill="white" fillOpacity="0.82"/>
        </svg>
      </span>
      <span className="text-3d flex items-center">
        <span className="brand-cause font-bold">Cause</span>
        <span className="brand-kind font-bold">kind</span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ck_theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ck_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const isHome = pathname === "/";
  const dashHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  function handleLogout() { logout(); router.push("/"); setOpen(false); }

  const navLinks = [
    { href: "/campaigns", label: "Campaigns" },
    { href: "/requests",  label: "Requests"  },
    { href: "/items",     label: "Listings"  },
  ];

  return (
    <header className={
      isHome
        ? "absolute top-0 left-0 right-0 z-30 border-b-0 bg-transparent shadow-none"
        : "sticky top-0 z-50 w-full border-b border-orange-100/50 dark:border-stone-850/50 bg-[#faf8f4]/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-sm transition-all duration-200"
    }>
      <div className={
        isHome
          ? "w-full flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6"
          : "mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5"
      }>
        <Link href="/" className="flex items-center gap-2">
          <CauseKindLogo />
        </Link>

        <nav className={
          isHome
            ? "hidden lg:flex items-center gap-1 bg-white/72 dark:bg-zinc-900/72 backdrop-blur-md rounded-full pl-6 pr-1 py-1 shadow-sm border border-white/60 dark:border-stone-800/60"
            : "hidden items-center gap-2 lg:flex"
        }>
          {navLinks.map((link, i) => (
            <Link key={link.href} href={link.href}
              className={
                isHome
                  ? `text-sm px-3 py-2 transition-colors ${i === 0 ? "font-semibold text-[#1c1108] dark:text-white" : "font-medium text-[#5c3a1e] dark:text-[#f0b97a] hover:text-[#1c1108] dark:hover:text-white"}`
                  : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-stone-400 hover:text-[#1c1108] dark:hover:text-white transition-all duration-200 hover:bg-orange-50/60 dark:hover:bg-zinc-900/60 relative group"
              }>
              {link.label}
              {!isHome && (
                <span className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-gradient-to-r from-[#b04a15] to-[#e07b3a] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300" />
              )}
            </Link>
          ))}
          {user && (
            <>
              <Link href={dashHref}
                className={
                  isHome
                    ? "text-sm px-3 py-2 font-medium text-[#5c3a1e] dark:text-[#f0b97a] hover:text-[#1c1108] dark:hover:text-white transition-colors"
                    : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-stone-400 hover:text-[#1c1108] dark:hover:text-white transition-all duration-200 hover:bg-orange-50/60 dark:hover:bg-zinc-900/60 relative group"
                }>
                Dashboard
                {!isHome && <span className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-gradient-to-r from-[#b04a15] to-[#e07b3a] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300" />}
              </Link>
              <Link href="/profile"
                className={
                  isHome
                    ? "text-sm px-3 py-2 font-medium text-[#5c3a1e] dark:text-[#f0b97a] hover:text-[#1c1108] dark:hover:text-white transition-colors"
                    : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-stone-400 hover:text-[#1c1108] dark:hover:text-white transition-all duration-200 hover:bg-orange-50/60 dark:hover:bg-zinc-900/60 relative group"
                }>
                Profile
                {!isHome && <span className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-gradient-to-r from-[#b04a15] to-[#e07b3a] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300" />}
              </Link>
            </>
          )}
          {isHome && (
            <Link href="/campaigns">
              <button className="btn-3d btn-shine ml-2 bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
                Donate Now
              </button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Animated Sleek Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border transition-all duration-300 active:scale-95 overflow-hidden shadow-xs ${
              isHome
                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                : "bg-white/72 border-stone-200/80 text-stone-700 hover:bg-orange-50/60 hover:text-[#ff5722] hover:border-[#ff5722]/30"
            }`}
            aria-label="Toggle theme"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Sun className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-amber-400 transition-all duration-500 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
              <Moon className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-stone-600 transition-all duration-500 transform ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
            </div>
          </button>

          {user ? (
            <>
              <span className={`max-w-[160px] truncate text-sm font-medium px-3 py-1.5 rounded-full border ${
                isHome
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/70 dark:bg-zinc-900/70 border-orange-100/60 dark:border-stone-800 text-[#1c1108] dark:text-stone-100"
              }`}>
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}
                className={`rounded-xl font-medium ${isHome ? "text-white/90 hover:text-white hover:bg-white/10" : "text-[#1c1108] dark:text-stone-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20"}`}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/register" className={`hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors ${isHome ? "text-[#f0b97a] hover:text-white" : "text-[#5c3a1e] dark:text-[#f0b97a] hover:text-[#1c1108] dark:hover:text-white"}`}>
                <UserPlus className="w-4 h-4" /> Sign Up
              </Link>
              <Link href="/login" className={`hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors ${isHome ? "text-[#f0b97a] hover:text-white" : "text-[#5c3a1e] dark:text-[#f0b97a] hover:text-[#1c1108] dark:hover:text-white"}`}>
                <LogIn className="w-4 h-4" /> Log In
              </Link>
            </>
          )}
          <button onClick={() => setOpen(v => !v)}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-white/72 dark:bg-zinc-900/72 backdrop-blur-md border border-white/60 dark:border-stone-800 text-[#1c1108] dark:text-white transition-all hover:bg-white/90 dark:hover:bg-zinc-850"
            aria-label={open ? "Close menu" : "Open menu"}>
            <Menu className={`w-5 h-5 absolute transition-all duration-300 ${open ? "opacity-0 rotate-90 scale-50" : "opacity-100"}`} />
            <X    className={`w-5 h-5 absolute transition-all duration-300 ${open ? "opacity-100" : "opacity-0 -rotate-90 scale-50"}`} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}>
        <div className="absolute inset-0 bg-[#1c1108]/40 backdrop-blur-xs" />
      </div>

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-[#faf8f4]/97 dark:bg-zinc-950/97 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full pt-24 px-8 pb-8">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`text-2xl font-semibold text-[#1c1108] dark:text-white py-4 border-b border-[#1c1108]/10 dark:border-white/10 transition-all duration-500 ${open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
                style={{ transitionDelay: open ? `${150 + i * 70}ms` : "0ms" }}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className={`mt-8 flex flex-col gap-4 transition-all duration-500 ${open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
            style={{ transitionDelay: open ? "400ms" : "0ms" }}>
            {user && (
              <>
                <Link href={dashHref} onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[#1c1108] dark:text-stone-200 hover:text-white">Dashboard</Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[#1c1108] dark:text-stone-200 hover:text-white">Profile</Link>
              </>
            )}
            {!user && (
              <>
                <Link href="/register" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[#1c1108] dark:text-stone-200 hover:text-white"><UserPlus className="w-4 h-4" /> Sign Up</Link>
                <Link href="/login"    onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[#1c1108] dark:text-stone-200 hover:text-white"><LogIn    className="w-4 h-4" /> Log In</Link>
              </>
            )}
            <Link href="/campaigns" onClick={() => setOpen(false)}>
              <button className="btn-3d btn-shine w-full mt-2 bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white text-sm font-semibold px-5 py-3 rounded-full">
                Donate Now
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#120c04] text-stone-200 border-t border-stone-800">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-4">
          <CauseKindLogo size="lg" />
          <p className="text-stone-400 leading-relaxed font-medium">
            India&apos;s verified giving platform. Zero fees for donors. 100% of your donation goes directly to the cause.
          </p>
          <div className="flex gap-3 pt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full">
              <Shield className="h-3.5 w-3.5 text-[#e07b3a]" /> Admin Verified
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full">
              <Globe className="h-3.5 w-3.5 text-[#4a7fba]" /> Razorpay Secured
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">Give Back</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            {[{href:"/campaigns",l:"Money campaigns"},{href:"/items",l:"Item listings"},{href:"/requests",l:"In-kind requests"}].map(({href,l})=>(
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">Get Support</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            {[{href:"/register",l:"Create an account"},{href:"/dashboard",l:"My dashboard"},{href:"/campaigns/new",l:"Start a campaign"}].map(({href,l})=>(
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">Our Trust Promise</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e07b3a]" /> Admin-verified listings</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e07b3a]" /> Zero platform fees for donors</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4a7fba]" /> Verified delivery certificates</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-900 py-6 text-center text-xs text-stone-500 font-medium">
        © {new Date().getFullYear()} <span className="font-bold text-gradient-terra">Cause</span><span className="font-bold text-[#4a7fba]">kind</span>. Made with care in India.
      </div>
    </footer>
  );
}
