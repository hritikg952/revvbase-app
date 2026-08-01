"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await getSupabaseBrowserClient().auth.signOut();
    setSigningOut(false);
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Revvbase home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Revvbase</span>
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link href="/">Browse</Link>
          {loading ? (
            <span className="nav-muted" aria-live="polite">Checking session…</span>
          ) : user ? (
            <>
              <Link href="/my-listings">My listings</Link>
              <Link href="/sell" className="button button-small">Sell</Link>
              <button
                type="button"
                className="text-button"
                onClick={signOut}
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth">Sign in</Link>
              <Link href="/sell" className="button button-small">Sell</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
