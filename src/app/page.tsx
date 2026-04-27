import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">task gamifier</h1>
        <p className="text-muted-foreground">
          Turn any learning resource into a streak of focused study sessions.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/resources/new" className={buttonVariants()}>
          Start learning
        </Link>
        <Link href="/resources" className={buttonVariants({ variant: "outline" })}>
          My resources
        </Link>
      </div>
    </main>
  );
}
