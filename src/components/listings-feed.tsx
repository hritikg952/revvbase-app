"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function ListingsFeed() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setListings([]);
    } else {
      setListings((data ?? []) as Listing[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="listing-grid" aria-busy="true" aria-label="Loading listings">
        {[0, 1, 2].map((item) => <div key={item} className="listing-skeleton" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-panel compact" role="alert">
        <h3>Listings couldn't load</h3>
        <p>Check your connection and try again.</p>
        <button className="button button-secondary" type="button" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="state-panel compact">
        <h3>No vehicles listed yet</h3>
        <p>Be the first seller on Revvbase and help start the marketplace.</p>
        <Link href="/sell" className="button">Sell your two-wheeler</Link>
      </div>
    );
  }

  return (
    <div className="listing-grid">
      {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
    </div>
  );
}
