export type ListingLifecycleStatus = "draft" | "active" | "deleted";

export interface LifecycleListing {
  id: string;
  sellerId: string;
  status: ListingLifecycleStatus;
}

export interface LifecycleImage {
  id: string;
  listingId: string;
  storageKey: string;
  position: number;
}

export interface ListingStatusTransition {
  userId: string;
  listingId: string;
  expectedStatus: ListingLifecycleStatus;
  nextStatus: ListingLifecycleStatus;
}

export interface LifecycleDatabase {
  getOwnedListing(
    userId: string,
    listingId: string,
  ): Promise<LifecycleListing | null>;
  getImagesRequired(): Promise<boolean>;
  countImages(listingId: string): Promise<number>;
  transitionListingStatus(
    transition: ListingStatusTransition,
  ): Promise<LifecycleListing>;
}

export interface LifecycleStorage {
  remove(storageKeys: string[]): Promise<void>;
}

export interface PublishLifecycleAction {
  action: "publish";
  listingId: string;
}

export type ListingImageLifecycleAction = PublishLifecycleAction;

export interface ListingLifecycleResult {
  action: ListingImageLifecycleAction["action"];
  listingId: string;
  status: ListingLifecycleStatus;
}

export type LifecycleErrorCode =
  | "forbidden"
  | "invalid_status"
  | "image_required"
  | "conflict"
  | "internal_error";

export class LifecycleError extends Error {
  readonly code: LifecycleErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly listingStatus?: ListingLifecycleStatus;

  constructor(
    code: LifecycleErrorCode,
    message: string,
    status: number,
    retryable = false,
    listingStatus?: ListingLifecycleStatus,
  ) {
    super(message);
    this.name = "LifecycleError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.listingStatus = listingStatus;
  }
}

interface CreateListingImageLifecycleOptions {
  database: LifecycleDatabase;
  storage: LifecycleStorage;
}

export function createListingImageLifecycle({
  database,
}: CreateListingImageLifecycleOptions) {
  return {
    async execute(
      userId: string,
      action: ListingImageLifecycleAction,
    ): Promise<ListingLifecycleResult> {
      const listing = await database.getOwnedListing(userId, action.listingId);
      if (!listing) {
        throw new LifecycleError(
          "forbidden",
          "The listing is not owned by the caller.",
          403,
        );
      }

      if (listing.status !== "draft") {
        throw new LifecycleError(
          "invalid_status",
          "Only a draft listing can be published.",
          409,
          false,
          listing.status,
        );
      }

      const imagesRequired = await database.getImagesRequired();
      const imageCount = await database.countImages(action.listingId);
      if (imagesRequired && imageCount === 0) {
        throw new LifecycleError(
          "image_required",
          "Add at least one photo before publishing this listing.",
          409,
          false,
          "draft",
        );
      }

      const activeListing = await database.transitionListingStatus({
        userId,
        listingId: action.listingId,
        expectedStatus: "draft",
        nextStatus: "active",
      });

      return {
        action: action.action,
        listingId: action.listingId,
        status: activeListing.status,
      };
    },
  };
}
