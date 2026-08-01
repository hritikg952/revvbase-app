"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function AuthRequired({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="state-panel" role="status">Checking your session…</div>;
  }

  if (!user) {
    return (
      <div className="state-panel">
        <p className="eyebrow">Sign in required</p>
        <h1>Ready to sell?</h1>
        <p>Sign in or create an account to publish and manage listings.</p>
        <Link href="/auth" className="button">Continue to sign in</Link>
      </div>
    );
  }

  return children;
}
