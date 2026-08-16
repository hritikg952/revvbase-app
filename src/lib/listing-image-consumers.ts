import type { Listing } from "./database.types";
import {
  ListingImageLifecycleClientError,
  type ListingImageLifecycleAction,
  type ListingImageLifecycleResult,
  type ListingLifecycleStatus,
} from "./listing-image-lifecycle-client";
/*
 * Lifecycle behavior is injected here so browser consumers can react only to
 * the protected server result and never mutate listing status directly.
 */
import type { ListingImage } from "./storage/listing-image-storage";

export const LISTING_IMAGE_PLACEHOLDER = "/vehicle-placeholder.svg";

export interface ListingCardView {
  listing: Listing;
  coverUrl: string;
  hasCoverPhoto: boolean;
}

export interface OwnerListingCardView extends ListingCardView {
  statusLabel: "Draft" | "Active" | "Booked";
  editHref: string;
  publicHref: null;
}

function getCoverUrl(images: readonly ListingImage[] | undefined): string {
  if (!images?.length) return LISTING_IMAGE_PLACEHOLDER;

  return [...images].sort(
    (left, right) => left.position - right.position,
  )[0]?.publicUrl ?? LISTING_IMAGE_PLACEHOLDER;
}

export function getPublicListingCards(
  listings: readonly Listing[],
  imagesByListing: ReadonlyMap<string, readonly ListingImage[]>,
): ListingCardView[] {
  return listings
    .filter((listing) => listing.status === "active" || listing.status === "booked")
    .map((listing) => {
      const coverUrl = getCoverUrl(imagesByListing.get(listing.id));
      return {
        listing,
        coverUrl,
        hasCoverPhoto: coverUrl !== LISTING_IMAGE_PLACEHOLDER,
      };
    });
}

export function getOwnerListingCards(
  listings: readonly Listing[],
  imagesByListing: ReadonlyMap<string, readonly ListingImage[]>,
): OwnerListingCardView[] {
  return listings
    .filter(
      (listing): listing is Listing & { status: "draft" | "active" | "booked" } =>
        listing.status === "draft" || listing.status === "active" || listing.status === "booked",
    )
    .map((listing) => {
      const coverUrl = getCoverUrl(imagesByListing.get(listing.id));
      return {
        listing,
        coverUrl,
        hasCoverPhoto: coverUrl !== LISTING_IMAGE_PLACEHOLDER,
        statusLabel: listing.status === "draft" ? "Draft" : listing.status === "booked" ? "Booked" : "Active",
        editHref: `/listings/${listing.id}/edit`,
        publicHref: null,
      };
    });
}

interface DeleteManagedListingInput {
  listingId: string;
  currentStatus: ListingLifecycleStatus;
  execute: (
    action: ListingImageLifecycleAction,
  ) => Promise<ListingImageLifecycleResult>;
}

export async function deleteManagedListing({
  listingId,
  currentStatus,
  execute,
}: DeleteManagedListingInput) {
  try {
    const result = await execute({ action: "delete-listing", listingId });
    if (result.status !== "deleted") {
      return {
        ok: false as const,
        status: result.status,
        message: "Listing could not be deleted. It is still available to you. Try again.",
      };
    }

    return {
      ok: true as const,
      status: result.status,
      message: result.cleanupPending
        ? "Listing deleted. Permanent photo cleanup is queued and will retry automatically."
        : "Listing deleted.",
    };
  } catch (error) {
    return {
      ok: false as const,
      status:
        error instanceof ListingImageLifecycleClientError && error.listingStatus
          ? error.listingStatus
          : currentStatus,
      message: "Listing could not be deleted. It is still available to you. Try again.",
    };
  }
}
