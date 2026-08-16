"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { OfferSheet } from "@/components/offer-sheet";
import type { Listing } from "@/lib/database.types";
import type { DetailImageDescriptor } from "@/lib/listing-detail-images";
import { formatPrice, formatVehicleType } from "@/lib/listings";
import { ListingMediaGallery } from "@/components/listing-media-gallery";

export function ListingDetail({
  listing,
  images,
}: {
  listing: Listing;
  images: readonly DetailImageDescriptor[];
}) {
  const name = `${listing.make} ${listing.model}`;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [offering, setOffering] = useState(false);
  const isOwner = user?.id === listing.seller_id;
  const isBooked = listing.status === "booked";

  return (
    <article className="listing-detail">
      <Link href="/" className="detail-back">← Back to listings</Link>
      <div className="listing-detail-hero">
        <ListingMediaGallery images={images} vehicleName={name} />
        <div className="listing-detail-summary">
          <p className="eyebrow">{formatVehicleType(listing.vehicle_type)}</p>
          <div className="detail-title-row">
            <h1>{name} · {listing.year}</h1>
            <span className="decorative-heart" aria-hidden="true">♡</span>
          </div>
          <p className="listing-detail-price">{formatPrice(listing.price_inr)}</p>
          <p className="listing-detail-city">{listing.city}</p>
          <dl className="listing-detail-facts">
            <div><dt>Driven</dt><dd>{listing.odometer_km.toLocaleString("en-IN")} km</dd></div>
            <div><dt>Fuel</dt><dd>{listing.fuel_type.replaceAll("_", " ")}</dd></div>
            <div><dt>Owners</dt><dd>{listing.previous_owners}</dd></div>
            {listing.insurance_valid_until && <div><dt>Insurance</dt><dd>{listing.insurance_valid_until}</dd></div>}
          </dl>
          {isBooked ? <><span className="status-badge booked detail-booked">Booked</span><p className="detail-cta-note">Price agreed — this vehicle is no longer accepting offers.</p></> : isOwner ? <p className="detail-cta-note">This is your listing. Manage it from My listings.</p> : <><button type="button" className="button button-wide detail-quote" disabled={loading} onClick={() => user ? setOffering(true) : router.push(`/auth?next=/listings/${listing.id}`)}>{loading ? "Checking session…" : "Make an offer"}</button><p className="detail-cta-note">Make an offer to start a private negotiation.</p></>}
        </div>
      </div>
      {listing.description && (
        <section className="listing-detail-description" aria-labelledby="description-heading">
          <p className="eyebrow">About this vehicle</p>
          <h2 id="description-heading">Seller&apos;s description</h2>
          <p>{listing.description}</p>
        </section>
      )}
      {offering && <OfferSheet listingId={listing.id} vehicleName={name} onClose={() => setOffering(false)} onCreated={(conversationId) => router.push(`/messages?conversation=${conversationId}`)} />}
    </article>
  );
}
