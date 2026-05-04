import React from "react";
import type { Metadata } from "next";
import { AppProvider } from "./context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot — AI Govt Exam Mission Control",
  description:
    "Track official government exam notifications, check personalized eligibility, plan preparation, and act on deadlines with Career Copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <a href="#main-content" className="cc-skip-link cc-focus-ring">
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
