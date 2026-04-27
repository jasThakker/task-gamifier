"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/lib/store";

export function CelebrationTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const triggerEvent = useGameStore((s) => s.triggerEvent);

  useEffect(() => {
    const xp = Number(searchParams.get("xp"));
    const leveled = Number(searchParams.get("leveled"));
    if (!xp) return;

    triggerEvent({ xpGained: xp, leveledUp: leveled > 0, newLevel: leveled });

    // Strip params from URL without a navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("xp");
    url.searchParams.delete("leveled");
    router.replace(url.pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
