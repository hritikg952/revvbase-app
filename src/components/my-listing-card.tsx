"use client";

import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@/lib/database.types";
import { formatPrice } from "@/lib/listings";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface MyListingCardProps {
  listing: Listing;
  ownerId: string;
  onDeleted: (id: string) => void;
}

export function MyListingCard({ listing, ownerId, onDeleted }: MyListingCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      "Delete listing? This removes it from public browsing and cannot be undone here.",
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    const { error: updateError } = await getSupabaseBrowserClient()
      .from("listings")
      .update({ status: "deleted" })
      .eq("id", listing.id)
      .eq("seller_id", ownerId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onDeleted(listing.id);
    }
    setPending(false);
  }

  return (
    <article className="my-listing-card">
      <div>
        <span className={`status-badge ${listing.status}`}>{listing.status}</span>
        <h3>{listing.make} {listing.model}</h3>
        <p>{formatPrice(listing.price_inr)} · {listing.city}</p>
      </div>
      {listing.status === "active" && (
        <div className="card-actions">
          <Link className="button button-secondary button-small" href={`/listings/${listing.id}/edit`}>
            Edit
          </Link>
          <button className="text-button destructive" type="button" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
      {error && <p className="form-alert error" role="alert">{error}</p>}
    </article>
  );
}
