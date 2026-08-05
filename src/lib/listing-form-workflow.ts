import {
  ListingImageLifecycleClientError,
  type ListingLifecycleStatus,
} from "./listing-image-lifecycle-client";
import {
  appSettings,
  getImageLifecycleCopy,
  type AppSettings,
} from "./listing-images";

interface CreateListingThroughPublicationInput {
  draftNotice: string;
  persistDraft: () => Promise<{ id: string }>;
  publish: (
    listingId: string,
  ) => Promise<{ status: Extract<ListingLifecycleStatus, "draft" | "active"> }>;
}

export interface CreateListingOutcome {
  listingId: string;
  status: Extract<ListingLifecycleStatus, "draft" | "active">;
  destination: string;
  notice: string | null;
}

export function getCreateListingGuidance(
  settings: AppSettings = appSettings,
): string {
  return getImageLifecycleCopy(settings).emptyState;
}

export function getListingEditPageCopy(
  status: ListingLifecycleStatus,
): { eyebrow: string; visibilityNotice: string | null } {
  return status === "draft"
    ? {
        eyebrow: "Edit draft",
        visibilityNotice:
          "This listing is visible only in your garage until protected publication succeeds.",
      }
    : { eyebrow: "Edit listing", visibilityNotice: null };
}

export async function createListingThroughPublication({
  draftNotice,
  persistDraft,
  publish,
}: CreateListingThroughPublicationInput): Promise<CreateListingOutcome> {
  const draft = await persistDraft();

  try {
    const result = await publish(draft.id);
    if (result.status === "active") {
      return {
        listingId: draft.id,
        status: "active",
        destination: "/my-listings",
        notice: null,
      };
    }

    return {
      listingId: draft.id,
      status: "draft",
      destination: `/listings/${draft.id}/edit?created=draft`,
      notice: "Your listing was saved as a draft.",
    };
  } catch (error) {
    if (
      error instanceof ListingImageLifecycleClientError &&
      error.code === "image_required" &&
      error.listingStatus === "draft"
    ) {
      return {
        listingId: draft.id,
        status: "draft",
        destination: `/listings/${draft.id}/edit?created=draft`,
        notice: draftNotice,
      };
    }

    throw error;
  }
}

export function getListingFieldUpdate<
  Payload extends Record<string, unknown> & {
    seller_id: unknown;
    status: unknown;
  },
>(payload: Payload): Omit<Payload, "seller_id" | "status"> {
  const { seller_id: _sellerId, status: _status, ...fields } = payload;
  return fields;
}
