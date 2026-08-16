"use client";

import Link from "next/link";
import { useState } from "react";
import {
  deleteManagedListing,
  type OwnerListingCardView,
} from "@/lib/listing-image-consumers";
import { invokeListingImageLifecycle } from "@/lib/listing-image-lifecycle-client";
import { formatPrice } from "@/lib/listings";

interface MyListingCardProps {
  card: OwnerListingCardView;
  onDeleted: (id: string) => void;
}

export function MyListingCard({ card, onDeleted }: MyListingCardProps) {
  const { listing } = card;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      "Delete listing and all its photos permanently? This cannot be undone.",
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    const result = await deleteManagedListing({
      listingId: listing.id,
      currentStatus: listing.status,
      execute: invokeListingImageLifecycle,
    });

    if (result.ok && result.status === "deleted") {
      onDeleted(listing.id);
    } else {
      setError(result.message);
    }
    setPending(false);
  }

  return (
    <article className="my-listing-card">
      <div>
        <span className={`status-badge ${listing.status}`}>{card.statusLabel}</span>
        <h3>{listing.make} {listing.model}</h3>
        <p>{formatPrice(listing.price_inr)} · {listing.city}</p>
      </div>
      <div className="card-actions">
        {listing.status === "booked" ? (
          <Link className="button button-secondary button-small" href="/messages">View negotiation</Link>
        ) : pending ? (
          <span className="button button-secondary button-small" aria-disabled="true">
            Edit
          </span>
        ) : (
          <Link className="button button-secondary button-small" href={card.editHref}>
            Edit
          </Link>
        )}
        <button className="text-button destructive" type="button" onClick={remove} disabled={pending}>
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && <p className="form-alert error" role="alert">{error}</p>}
    </article>
  );
}
