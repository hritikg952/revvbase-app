"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthRequired } from "@/components/auth-required";
import { useAuth } from "@/components/auth-provider";
import { MyListingCard } from "@/components/my-listing-card";
import type { Listing } from "@/lib/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function MyListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setListings((data ?? []) as Listing[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  return (
    <div className="shell page-section">
      <AuthRequired>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your garage</p>
            <h1>My listings</h1>
          </div>
          <Link href="/sell" className="button">Create listing</Link>
        </div>
        {loading ? (
          <div className="state-panel compact" role="status">Loading your listings…</div>
        ) : error ? (
          <div className="state-panel compact" role="alert">
            <h3>Your listings couldn't load</h3>
            <p>{error}</p>
            <button className="button button-secondary" type="button" onClick={() => void load()}>Try again</button>
          </div>
        ) : listings.length && user ? (
          <div className="my-listings-grid">
            {listings.map((listing) => (
              <MyListingCard
                key={listing.id}
                listing={listing}
                ownerId={user.id}
                onDeleted={(id) => setListings((rows) => rows.map((row) => row.id === id ? { ...row, status: "deleted" } : row))}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel compact">
            <h3>You haven't listed a vehicle yet</h3>
            <p>Create your first listing and it will appear in the public marketplace.</p>
            <Link href="/sell" className="button">Create your first listing</Link>
          </div>
        )}
      </AuthRequired>
    </div>
  );
}
