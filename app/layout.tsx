import React from "react";
import Link from "next/link";
import { AppProvider } from "./context/AppContext";
import { TierBadgeInner } from "./components/TierBadge";
import "./globals.css";

export const metadata = {
  title: "Career Copilot",
  description: "Your unified career preparation dashboard",
};

const ROOT_NAV_ITEMS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/forum", label: "Forum" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <a href="#main-content" className="cc-skip-link cc-focus-ring">
            Skip to main content
          </a>

          <header className="root-shell-header">
            <nav className="root-shell-nav" aria-label="Primary">
              <Link href="/" className="root-shell-brand cc-focus-ring">
                Career Copilot
              </Link>

              <ul className="root-shell-nav-list">
                {ROOT_NAV_ITEMS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="root-shell-nav-link cc-focus-ring">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="root-shell-tier">
                <TierBadgeInner />
              </div>
            </nav>
          </header>

          <main id="main-content">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
