"use client";

import { useState } from "react";
import type { Listing } from "@/lib/database.types";
import { formatPrice, formatVehicleType } from "@/lib/listings";

export function ListingCard({ listing }: { listing: Listing }) {
  const [imageSrc, setImageSrc] = useState(listing.image_url || "/vehicle-placeholder.svg");

  return (
    <article className="listing-card">
      <div className="listing-image-wrap">
        {/* Dynamic seller URLs are intentionally rendered as plain images for the MVP. */}
        <img
          src={imageSrc}
          alt={listing.image_url ? `${listing.make} ${listing.model}` : "Stock two-wheeler illustration"}
          className="listing-image"
          onError={() => setImageSrc("/vehicle-placeholder.svg")}
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
