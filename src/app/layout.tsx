import type { Metadata } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/db/queries";
import { progressToNextLevel } from "@/lib/xp";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpBar } from "@/components/gamification/xp-bar";
import { CelebrationOverlay } from "@/components/gamification/celebration-overlay";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Task Gamifier",
  description: "Turn any learning resource into a streak.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const xpProgress = user ? progressToNextLevel(user.xp) : null;

  return (
    <html lang="en" className={cn(nunito.variable)} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <header className="flex items-center justify-between gap-2 sm:gap-3 py-4 border-b border-border">
              <Link href="/" className="text-lg font-extrabold tracking-tight hover:opacity-80 transition-opacity shrink-0">
                task gamifier
              </Link>
              <nav className="flex items-center gap-2 sm:gap-4">
                <Link href="/resources/new" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  + new
                </Link>
                <Link href="/resources" className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  resources
                </Link>
              </nav>
              <div className="flex items-center gap-2 sm:gap-3">
                {user && xpProgress && (
                  <>
                    <StreakBadge streak={user.currentStreak} className="text-sm" />
                    <LevelBadge level={xpProgress.level} />
                    <div className="w-24 hidden sm:block">
                      <XpBar
                        xpIntoLevel={xpProgress.xpIntoLevel}
                        xpNeededForNext={xpProgress.xpNeededForNext}
                        progressPercent={xpProgress.progressPercent}
                      />
                    </div>
                  </>
                )}
                <ThemeToggle />
              </div>
            </header>
            <main className="py-6 sm:py-8">{children}</main>
            <CelebrationOverlay />
          </div>
        </Providers>
      </body>
    </html>
  );
}
