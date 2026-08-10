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
  uploadPhotos?: (listingId: string) => Promise<void>;
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

export function getCreatedDraftNotice(
  reason: string | null,
  settings: AppSettings = appSettings,
): { kind: "success" | "error"; message: string } | null {
  if (reason === "publish-failed") {
    return {
      kind: "error",
      message:
        "Your listing was saved as a draft, but publication could not be completed. Try publishing again from this page.",
    };
  }
  if (reason === "draft") {
    const lifecycleCopy = getImageLifecycleCopy(settings);
    return {
      kind: "success",
      message: lifecycleCopy.minimumToPublish === 1
        ? lifecycleCopy.draftNotice
        : "Your listing was saved as a draft.",
    };
  }
  return null;
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
  uploadPhotos,
  publish,
}: CreateListingThroughPublicationInput): Promise<CreateListingOutcome> {
  const draft = await persistDraft();

  try {
    await uploadPhotos?.(draft.id);
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

    return {
      listingId: draft.id,
      status: "draft",
      destination: `/listings/${draft.id}/edit?created=publish-failed`,
      notice:
        "Your listing was saved as a draft, but publication could not be completed. Try publishing again from this page.",
    };
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
