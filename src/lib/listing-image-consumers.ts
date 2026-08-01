import type { Listing } from "./database.types";
import type { ListingImage } from "./storage/listing-image-storage";

export const LISTING_IMAGE_PLACEHOLDER = "/vehicle-placeholder.svg";

export interface ListingCardView {
  listing: Listing;
  coverUrl: string;
  hasCoverPhoto: boolean;
}

export interface OwnerListingCardView extends ListingCardView {
  statusLabel: "Draft" | "Active";
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
    .filter((listing) => listing.status === "active")
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
      (listing): listing is Listing & { status: "draft" | "active" } =>
        listing.status === "draft" || listing.status === "active",
    )
    .map((listing) => {
      const coverUrl = getCoverUrl(imagesByListing.get(listing.id));
      return {
        listing,
        coverUrl,
        hasCoverPhoto: coverUrl !== LISTING_IMAGE_PLACEHOLDER,
        statusLabel: listing.status === "draft" ? "Draft" : "Active",
        editHref: `/listings/${listing.id}/edit`,
        publicHref: null,
      };
    });
}
