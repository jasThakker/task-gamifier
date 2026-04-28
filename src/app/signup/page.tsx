"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/server/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card-playful w-full max-w-sm p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">Start gamifying your learning</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-bold">Username</label>
            <Input id="username" name="username" autoComplete="username" required />
            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-bold">Password</label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-bold">Confirm password</label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive font-medium">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className={buttonVariants({ className: "w-full" })}>
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
