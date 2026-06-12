"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogIn, UserPlus, Shield, Sun, Moon, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function CauseKindLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <span
      className={`font-extrabold tracking-tight ${sizes[size]} flex items-center gap-2 hover:opacity-95 transition-all duration-200`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 sm:h-8 sm:w-8 text-[#b04a15] dark:text-orange-400 shrink-0" xmlns="http://www.w3.org/2000/svg">
        {/* Heart/hands outer cradle */}
        <path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Plant sprout */}
        <path d="M12 18V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 12C12 12 9.5 11 9 9.5C8.5 8 9.5 7 11 8.5C12 9.5 12 11 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 14C12 14 14.5 13 15 11.5C15.5 10 14.5 9 13 10.5C12 11.5 12 13 12 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      </svg>
      <span className="flex items-center text-stone-900 dark:text-stone-100 font-extrabold text-base sm:text-xl">
        <span className="tracking-tight">Cause</span>
        <span className="text-[#b04a15] dark:text-orange-400">Kind</span>
      </span>
    </span>
  );
}

// Keep CareNestLogo exported and map it to CauseKindLogo to prevent any broken imports in other files
export function CareNestLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <CauseKindLogo size={size} />;
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
    { href: "/",                 label: "Home" },
    { href: "/campaigns",        label: "Campaigns" },
    { href: "/requests",         label: "In-Kind Requests" },
    { href: "/items",            label: "Listings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#f5f4ee] dark:bg-zinc-950 border-b border-[#e5e2d5] dark:border-stone-850/30 transition-all duration-200">
      <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between px-6 sm:px-10 py-4 sm:py-5">
        <Link href="/" className="flex items-center gap-2">
          <CareNestLogo />
        </Link>

        {/* Center navigation capsule */}
        <nav className="hidden lg:flex items-center gap-1 bg-white dark:bg-zinc-900 border border-[#e5e2d5] dark:border-stone-800 rounded-full p-1 shadow-sm">
          {navLinks.map((link) => {
            const isLinkActive =
              (link.label === "Home" && pathname === "/") ||
              (link.label === "Campaigns" && pathname === "/campaigns") ||
              (link.label === "In-Kind Requests" && pathname === "/requests") ||
              (link.label === "Listings" && pathname === "/items");

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm px-4 py-2 transition-all duration-200 rounded-full flex items-center gap-2 font-semibold ${
                  isLinkActive
                    ? "text-[#b04a15] dark:text-orange-400 bg-[#f0eee6] dark:bg-zinc-800 border border-[#e5e2d5] dark:border-zinc-700 shadow-2xs"
                    : "text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400"
                }`}
              >
                {isLinkActive && <span className="w-2.5 h-2.5 rounded-full bg-[#f0b97a] shrink-0" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Animated Sleek Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all duration-300 active:scale-95 overflow-hidden shadow-xs bg-white dark:bg-zinc-900"
            aria-label="Toggle theme"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Sun className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-amber-500 transition-all duration-500 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
              <Moon className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-stone-600 dark:text-stone-400 transition-all duration-500 transform ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
            </div>
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link href={dashHref} className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-405 dark:hover:text-orange-400 transition-colors">
                Dashboard
              </Link>
              <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
              <Link href="/profile" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-405 dark:hover:text-orange-400 transition-colors">
                Profile
              </Link>
              <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
              <span className="text-sm font-semibold text-[#b04a15] dark:text-orange-400 max-w-[120px] truncate" title={user.email}>
                {user.email.split("@")[0]}
              </span>
              <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
              <button 
                onClick={handleLogout} 
                className="text-sm font-semibold text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400 transition-colors">
                Log In
              </Link>
              <Link href="/register" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
          
          <Link href="/campaigns" className="hidden lg:block">
            <button className="border border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-stone-900 hover:text-white dark:hover:bg-white dark:hover:text-stone-900 transition-all active:scale-95 duration-200">
              Donate Now
            </button>
          </Link>

          <button onClick={() => setOpen(v => !v)}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-[#e5e2d5] dark:border-zinc-800 text-stone-900 dark:text-white transition-all hover:bg-stone-50 dark:hover:bg-zinc-850"
            aria-label={open ? "Close menu" : "Open menu"}>
            <Menu className={`w-5 h-5 absolute transition-all duration-300 ${open ? "opacity-0 rotate-90 scale-50" : "opacity-100"}`} />
            <X    className={`w-5 h-5 absolute transition-all duration-300 ${open ? "opacity-100" : "opacity-0 -rotate-90 scale-50"}`} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}>
        <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-xs" />
      </div>

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-[#f5f4ee] dark:bg-zinc-950 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full pt-24 px-8 pb-8">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`text-2xl font-semibold text-stone-900 dark:text-white py-4 border-b border-stone-200 dark:border-stone-800 transition-all duration-500 ${open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
                style={{ transitionDelay: open ? `${150 + i * 70}ms` : "0ms" }}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className={`mt-8 flex flex-col gap-4 transition-all duration-500 ${open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
            style={{ transitionDelay: open ? "400ms" : "0ms" }}>
            {user ? (
              <>
                <div className="text-sm font-bold text-stone-400 truncate mb-2">{user.email}</div>
                <Link href={dashHref} onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:text-[#b04a15]"><Shield className="w-4 h-4" /> Dashboard</Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:text-[#b04a15]"><User className="w-4 h-4" /> Profile</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-stone-750 dark:text-stone-200 hover:text-red-650 text-left"><LogIn className="w-4 h-4" /> Log Out</button>
              </>
            ) : (
              <>
                <Link href="/register" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:text-white"><UserPlus className="w-4 h-4" /> Sign Up</Link>
                <Link href="/login"    onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:text-white"><LogIn    className="w-4 h-4" /> Log In</Link>
              </>
            )}
            <Link href="/campaigns" onClick={() => setOpen(false)}>
              <button className="w-full mt-2 bg-[#b04a15] hover:bg-[#963c0d] text-white text-sm font-semibold px-5 py-3 rounded-full">
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
    <footer className="bg-[#120c04] text-stone-250 border-t border-stone-850" id="footer">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-4">
          <div className="inline-block bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-2xl shadow-sm border border-stone-200/10 dark:border-zinc-800">
            <CareNestLogo size="lg" />
          </div>
          <p className="text-stone-400 leading-relaxed font-medium">
            India&apos;s verified giving platform. Zero fees for donors. 100% of your donation goes directly to the cause.
          </p>
          <div className="text-stone-400 font-medium text-xs">
            <span className="text-white font-semibold">Contact us:</span> +91 7719938619
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full text-white">
              <Shield className="h-3.5 w-3.5 text-[#b04a15]" /> Admin Verified
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full text-white">
              <Shield className="h-3.5 w-3.5 text-[#4a7fba]" /> Razorpay Secured
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
            {[{href:"/register",l:"Create an account"},{href:"/dashboard",l:"My dashboard"},{href:"/campaigns/new",l:"Start a campaign"},{href:"/help",l:"Help & FAQ"}].map(({href,l})=>(
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">Our Trust Promise</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b04a15]" /> Admin-verified listings</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b04a15]" /> Zero platform fees for donors</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4a7fba]" /> Verified delivery certificates</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-900 py-6 text-center text-xs text-stone-500 font-medium">
        © {new Date().getFullYear()} <span className="font-bold text-[#b04a15]">Cause</span><span className="font-bold text-stone-300">Kind</span>. Made with care in India.
      </div>
    </footer>
  );
}
