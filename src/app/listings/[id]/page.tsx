"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingDetail } from "@/components/listing-detail";
import type { Listing } from "@/lib/database.types";
import { getDetailImageDescriptors, type DetailImageDescriptor } from "@/lib/listing-detail-images";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<DetailImageDescriptor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      setLoading(true);
      const { data, error } = await getSupabaseBrowserClient()
        .from("listings")
        .select("id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, insurance_valid_until, description, status, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (error || !data || !["active", "booked"].includes((data as Listing).status)) {
        setListing(null);
        setImages([]);
        setLoading(false);
        return;
      }

      const activeListing = data as Listing;
      setListing(activeListing);
      try {
        const records = await createBrowserListingImageStorage().list(activeListing.id);
        if (active) setImages(getDetailImageDescriptors(records));
      } catch {
        if (active) setImages([]);
      }
      if (active) setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="shell page-section"><div className="state-panel" role="status">Loading listing…</div></div>;
  }

  if (!listing) {
    return (
      <div className="shell page-section">
        <div className="state-panel">
          <h1>Listing unavailable</h1>
          <p>This listing is no longer available to view.</p>
          <Link href="/" className="button button-secondary">Browse listings</Link>
        </div>
      </div>
    );
  }

  return <main className="shell page-section listing-detail-page"><ListingDetail listing={listing} images={images} /></main>;
}
