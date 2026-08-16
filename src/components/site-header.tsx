"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { loadConversationSummaries, type ConversationSummary } from "@/lib/negotiations";
import { LISTING_IMAGE_PLACEHOLDER } from "@/lib/listing-image-consumers";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});

  const refreshConversations = useCallback(async () => {
    if (!user) { setConversations([]); return; }
    try {
      const rows = await loadConversationSummaries(user.id);
      setConversations(rows);
      const entries = await Promise.all(rows.slice(0, 5).map(async (row) => {
        try { const images = await createBrowserListingImageStorage().list(row.listing_id); return [row.listing_id, images.sort((a, b) => a.position - b.position)[0]?.publicUrl ?? LISTING_IMAGE_PLACEHOLDER] as const; }
        catch { return [row.listing_id, LISTING_IMAGE_PLACEHOLDER] as const; }
      }));
      setCovers(Object.fromEntries(entries));
    } catch { /* The inbox surfaces its own loading error. */ }
  }, [user]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => {
    window.addEventListener("revvbase:conversations-changed", refreshConversations);
    return () => window.removeEventListener("revvbase:conversations-changed", refreshConversations);
  }, [refreshConversations]);

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
              <div className="messages-menu">
                <button type="button" className="messages-trigger" aria-label="Open messages" aria-expanded={messagesOpen} onClick={() => setMessagesOpen((open) => { const next = !open; if (next) void refreshConversations(); return next; })}>⌁{conversations.reduce((total, row) => total + row.unreadCount, 0) > 0 && <b>{conversations.reduce((total, row) => total + row.unreadCount, 0)}</b>}</button>
                {messagesOpen && <div className="messages-popover"><div className="messages-popover-heading"><strong>Negotiations</strong><Link href="/messages" onClick={() => setMessagesOpen(false)}>View all</Link></div>{conversations.length ? conversations.slice(0, 5).map((row) => <Link href={`/messages?conversation=${row.id}`} className="messages-popover-row" onClick={() => setMessagesOpen(false)} key={row.id}><img src={covers[row.listing_id] ?? LISTING_IMAGE_PLACEHOLDER} alt="" /><span><strong>{row.listing.make} {row.listing.model}</strong><small>{row.otherName}</small></span>{row.unreadCount > 0 && <b>{row.unreadCount}</b>}</Link>) : <p className="messages-empty">No negotiations yet.</p>}</div>}
              </div>
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
