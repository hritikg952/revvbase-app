"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/database.types";
import {
  getPublicListingCards,
  type ListingCardView,
} from "@/lib/listing-image-consumers";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";
import type { ListingImage } from "@/lib/storage/listing-image-storage";

export function ListingsFeed() {
  const [cards, setCards] = useState<ListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("listings")
      .select("id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, insurance_valid_until, description, status, created_at, updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setCards([]);
    } else {
      const activeListings = ((data ?? []) as Listing[]).filter(
        (listing) => listing.status === "active",
      );
      const storage = createBrowserListingImageStorage();
      const imageEntries = await Promise.all(
        activeListings.map(async (listing) => {
          try {
            return [listing.id, await storage.list(listing.id)] as const;
          } catch {
            return [listing.id, [] as ListingImage[]] as const;
          }
        }),
      );
      setCards(getPublicListingCards(activeListings, new Map(imageEntries)));
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

  if (!cards.length) {
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
      {cards.map((card) => <ListingCard key={card.listing.id} card={card} />)}
    </div>
  );
}
