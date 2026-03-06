import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Launchboard — Kanban Task Management",
  description: "Plan. Build. Launch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body
        className="antialiased"
        style={{
          fontFamily: "var(--font-body), sans-serif",
          background: "#0a0a0a",
          color: "#f5f5f5",
        }}
      >
        {children}
      </body>
    </html>
  );
}
