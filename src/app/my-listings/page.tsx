"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthRequired } from "@/components/auth-required";
import { useAuth } from "@/components/auth-provider";
import { MyListingCard } from "@/components/my-listing-card";
import type { Listing } from "@/lib/database.types";
import {
  getOwnerListingCards,
  type OwnerListingCardView,
} from "@/lib/listing-image-consumers";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";
import type { ListingImage } from "@/lib/storage/listing-image-storage";

export default function MyListingsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<OwnerListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("listings")
      .select("id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, insurance_valid_until, description, status, created_at, updated_at")
      .eq("seller_id", user.id)
      .in("status", ["draft", "active", "booked"])
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      const managedListings = ((data ?? []) as Listing[]).filter(
        (listing) => listing.status === "draft" || listing.status === "active" || listing.status === "booked",
      );
      const storage = createBrowserListingImageStorage();
      const imageEntries = await Promise.all(
        managedListings.map(async (listing) => {
          try {
            return [listing.id, await storage.list(listing.id)] as const;
          } catch {
            return [listing.id, [] as ListingImage[]] as const;
          }
        }),
      );
      setCards(getOwnerListingCards(managedListings, new Map(imageEntries)));
    }
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
        ) : cards.length && user ? (
          <div className="my-listings-grid">
            {cards.map((card) => (
              <MyListingCard
                key={card.listing.id}
                card={card}
                onDeleted={(id) => setCards((rows) => rows.filter((row) => row.listing.id !== id))}
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
