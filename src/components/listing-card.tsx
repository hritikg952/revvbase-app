"use client";

import { useState } from "react";
import type { ListingCardView } from "@/lib/listing-image-consumers";
import { formatPrice, formatVehicleType } from "@/lib/listings";

export function ListingCard({ card }: { card: ListingCardView }) {
  const { listing } = card;
  const [imageSrc, setImageSrc] = useState(card.coverUrl);
  const [hasCoverPhoto, setHasCoverPhoto] = useState(card.hasCoverPhoto);

  return (
    <article className="listing-card">
      <div className="listing-image-wrap">
        <img
          src={imageSrc}
          alt={hasCoverPhoto
            ? `${listing.make} ${listing.model} — photo 1`
            : "Stock two-wheeler illustration"}
          className="listing-image"
          onError={() => {
            setImageSrc("/vehicle-placeholder.svg");
            setHasCoverPhoto(false);
          }}
        />
        <span className="vehicle-pill">{formatVehicleType(listing.vehicle_type)}</span>
      </div>
      <div className="listing-card-body">
        <p className="listing-price">{formatPrice(listing.price_inr)}</p>
        <h3>{listing.make} {listing.model}</h3>
        <dl className="vehicle-facts">
          <div><dt>Year</dt><dd>{listing.year}</dd></div>
          <div><dt>Driven</dt><dd>{listing.odometer_km.toLocaleString("en-IN")} km</dd></div>
          <div><dt>City</dt><dd>{listing.city}</dd></div>
        </dl>
      </div>
    </article>
  );
}
