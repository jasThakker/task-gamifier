"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/server/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card-playful w-full max-w-sm p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue learning</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-bold">Username</label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-bold">Password</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive font-medium">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className={buttonVariants({ className: "w-full" })}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
