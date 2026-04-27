import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/db/queries";
import { progressToNextLevel } from "@/lib/xp";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpBar } from "@/components/gamification/xp-bar";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Task Gamifier",
  description: "Turn any learning resource into a streak.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const xpProgress = user ? progressToNextLevel(user.xp) : null;

  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable)}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto max-w-3xl px-6">
          <header className="flex items-center justify-between gap-4 py-4 border-b border-border">
            <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
              task gamifier
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/resources/new" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                + new
              </Link>
              <Link href="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                resources
              </Link>
            </nav>
            {user && xpProgress && (
              <div className="flex items-center gap-3">
                <StreakBadge streak={user.currentStreak} className="text-sm" />
                <LevelBadge level={xpProgress.level} />
                <div className="w-24 hidden sm:block">
                  <XpBar
                    xpIntoLevel={xpProgress.xpIntoLevel}
                    xpNeededForNext={xpProgress.xpNeededForNext}
                    progressPercent={xpProgress.progressPercent}
                  />
                </div>
              </div>
            )}
          </header>
          <main className="py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
