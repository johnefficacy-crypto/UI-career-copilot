import React from "react";
import type { Metadata } from "next";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot — AI Govt Exam Mission Control",
  description:
    "Track official government exam notifications, check personalized eligibility, plan preparation, and act on deadlines with Career Copilot.",
};

const themeScript = `(() => { try { const key = 'career-copilot-theme'; const saved = localStorage.getItem(key); const theme = saved === 'light' || saved === 'dark' ? saved : 'dark'; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch (_) { document.documentElement.dataset.theme = 'dark'; document.documentElement.style.colorScheme = 'dark'; } })();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppProvider>
          <ThemeProvider>
            <a href="#main-content" className="cc-skip-link cc-focus-ring">
              Skip to main content
            </a>
            <main id="main-content">{children}</main>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
