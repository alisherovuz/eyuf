"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Bosh sahifa", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/mashq", label: "Mashq", icon: "M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h3" },
  { href: "/imtihon", label: "Imtihon", icon: "M12 7v5l3 2 M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18" },
  { href: "/xatolar", label: "Xatolar", icon: "M12 4l9 16H3z M12 10v4 M12 17v.5" },
];

export function Nav() {
  const path = usePathname();
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "dark" || t === "light" ? t : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">EYUF <span>Prep Lab</span></Link>
        <nav className="nav" aria-label="Asosiy">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.icon} /></svg>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className="theme-btn" onClick={toggle} aria-label={theme === "dark" ? "Yorug‘ mavzuga o‘tish" : "Qorong‘i mavzuga o‘tish"}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {theme === "dark" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
          </svg>
        </button>
      </div>
    </header>
  );
}
