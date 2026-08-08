"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthRequired } from "@/components/auth-required";
import { useAuth } from "@/components/auth-provider";
import { ListingForm } from "@/components/listing-form";
import type { Listing } from "@/lib/database.types";
import {
  getCreatedDraftNotice,
  getListingEditPageCopy,
} from "@/lib/listing-form-workflow";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const createdDraftNotice = getCreatedDraftNotice(searchParams.get("created"));

  useEffect(() => {
    if (!user || !id) return;
    getSupabaseBrowserClient()
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("seller_id", user.id)
      .single()
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setListing(data as Listing);
        setLoading(false);
      });
  }, [user, id]);

  return (
    <div className="shell page-section narrow">
      <AuthRequired>
        {loading ? (
          <div className="state-panel" role="status">Loading your listing…</div>
        ) : error || !listing ? (
          <div className="state-panel" role="alert">
            <h1>Listing not available</h1>
            <p>It may not exist, or it may belong to another account.</p>
            <Link href="/my-listings" className="button button-secondary">Back to my listings</Link>
          </div>
        ) : listing.status === "deleted" ? (
          <div className="state-panel">
            <h1>This listing is deleted</h1>
            <p>Deleted listings cannot be edited or restored in the MVP.</p>
            <Link href="/my-listings" className="button button-secondary">Back to my listings</Link>
          </div>
        ) : (
          <>
            <div className="page-heading">
              <p className="eyebrow">{getListingEditPageCopy(listing.status).eyebrow}</p>
              <h1>{listing.make} {listing.model}</h1>
              {getListingEditPageCopy(listing.status).visibilityNotice && (
                <p>{getListingEditPageCopy(listing.status).visibilityNotice}</p>
              )}
            </div>
            {listing.status === "draft" && createdDraftNotice && (
              <div
                className={`form-alert ${createdDraftNotice.kind}`}
                role={createdDraftNotice.kind === "error" ? "alert" : "status"}
              >
                {createdDraftNotice.message}
              </div>
            )}
            <ListingForm
              listing={listing}
              onLifecycleStatusChange={(status) =>
                setListing((current) => current ? { ...current, status } : current)}
            />
          </>
        )}
      </AuthRequired>
    </div>
  );
}
