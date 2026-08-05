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

export interface LifecycleCleanupJob {
  id: string;
  storageKey: string;
}

export interface LifecycleCleanupReservation {
  status: ListingLifecycleStatus;
  jobs: LifecycleCleanupJob[];
}

export interface CleanupRetryDatabase {
  claimCleanupJobs(input: {
    limit: number;
    sellerId?: string;
  }): Promise<LifecycleCleanupJob[]>;
  completeCleanupJob(jobId: string): Promise<void>;
  failCleanupJob(jobId: string, message: string): Promise<void>;
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
  getImage(listingId: string, imageId: string): Promise<LifecycleImage | null>;
  getImageByStorageKey(
    listingId: string,
    storageKey: string,
  ): Promise<LifecycleImage | null>;
  listImages(listingId: string): Promise<LifecycleImage[]>;
  deleteImageMetadata(listingId: string, imageId: string): Promise<void>;
  deleteListingImageMetadata(listingId: string): Promise<void>;
  reserveImageDeletion(input: {
    userId: string;
    listingId: string;
    imageId: string;
    storageKey: string;
  }): Promise<LifecycleCleanupReservation>;
  reserveListingDeletion(input: {
    userId: string;
    listingId: string;
  }): Promise<LifecycleCleanupReservation>;
  reserveUploadCleanup(input: {
    userId: string;
    listingId: string;
    storageKey: string;
  }): Promise<LifecycleCleanupReservation>;
  completeCleanupJob(jobId: string): Promise<void>;
  failCleanupJob(jobId: string, message: string): Promise<void>;
  publishListing(input: {
    userId: string;
    listingId: string;
  }): Promise<{ status: ListingLifecycleStatus; imageRequired: boolean }>;
}

export interface LifecycleStorage {
  remove(storageKeys: string[]): Promise<void>;
}

export function createCleanupRetryConsumer({
  database,
  storage,
}: {
  database: CleanupRetryDatabase;
  storage: LifecycleStorage;
}) {
  return {
    async run({ limit, sellerId }: { limit: number; sellerId?: string }) {
      const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
      const jobs = await database.claimCleanupJobs({
        limit: boundedLimit,
        ...(sellerId ? { sellerId } : {}),
      });
      let completed = 0;
      let failed = 0;
      for (const job of jobs) {
        try {
          await storage.remove([job.storageKey]);
          await database.completeCleanupJob(job.id);
          completed += 1;
        } catch (error) {
          await database.failCleanupJob(
            job.id,
            error instanceof Error ? error.message : "Storage cleanup failed.",
          );
          failed += 1;
        }
      }
      return { claimed: jobs.length, completed, failed };
    },
  };
}

export interface PublishLifecycleAction {
  action: "publish";
  listingId: string;
}

export interface DeleteImageLifecycleAction {
  action: "delete-image";
  listingId: string;
  imageId: string;
  storageKey: string;
}

export interface DeleteListingLifecycleAction {
  action: "delete-listing";
  listingId: string;
}

export interface CompensateUploadLifecycleAction {
  action: "compensate-upload";
  listingId: string;
  storageKey: string;
}

export type ListingImageLifecycleAction =
  | PublishLifecycleAction
  | DeleteImageLifecycleAction
  | DeleteListingLifecycleAction
  | CompensateUploadLifecycleAction;

export interface ListingLifecycleResult {
  action: ListingImageLifecycleAction["action"];
  listingId: string;
  status: ListingLifecycleStatus;
  cleanupPending?: boolean;
}

export type LifecycleErrorCode =
  | "forbidden"
  | "invalid_request"
  | "invalid_status"
  | "image_required"
  | "image_binding_mismatch"
  | "storage_remove_failed"
  | "metadata_remove_failed"
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

export function parseListingImageLifecycleAction(
  value: unknown,
): ListingImageLifecycleAction {
  if (!value || typeof value !== "object") {
    throw new LifecycleError(
      "invalid_request",
      "The lifecycle request is invalid.",
      400,
    );
  }

  const input = value as Record<string, unknown>;
  const action = input.action;
  const allowedKeys = action === "delete-image"
    ? ["action", "listingId", "imageId", "storageKey"]
    : action === "compensate-upload"
    ? ["action", "listingId", "storageKey"]
    : ["action", "listingId"];
  const hasValidShape =
    ["publish", "delete-image", "delete-listing", "compensate-upload"].includes(
      String(action),
    ) &&
    typeof input.listingId === "string" && input.listingId.length > 0 &&
    (action !== "delete-image" ||
      (typeof input.imageId === "string" && input.imageId.length > 0)) &&
    (!["delete-image", "compensate-upload"].includes(String(action)) ||
      (typeof input.storageKey === "string" && input.storageKey.length > 0)) &&
    Object.keys(input).every((key) => allowedKeys.includes(key));

  if (!hasValidShape) {
    throw new LifecycleError(
      "invalid_request",
      "The lifecycle request is invalid.",
      400,
    );
  }

  return value as ListingImageLifecycleAction;
}

interface CreateListingImageLifecycleOptions {
  database: LifecycleDatabase;
  storage: LifecycleStorage;
}

export function createListingImageLifecycle({
  database,
  storage,
}: CreateListingImageLifecycleOptions) {
  async function processCleanupJobs(
    jobs: LifecycleCleanupJob[],
  ): Promise<boolean> {
    let cleanupPending = false;
    for (const job of jobs) {
      try {
        await storage.remove([job.storageKey]);
        await database.completeCleanupJob(job.id);
      } catch (error) {
        cleanupPending = true;
        await database.failCleanupJob(
          job.id,
          error instanceof Error ? error.message : "Storage cleanup failed.",
        );
      }
    }
    return cleanupPending;
  }

  async function removeImageMetadata(
    listingId: string,
    imageId: string,
    listingStatus: ListingLifecycleStatus,
  ): Promise<void> {
    try {
      await database.deleteImageMetadata(listingId, imageId);
    } catch {
      throw new LifecycleError(
        "metadata_remove_failed",
        "The photo record could not be removed. Please try again.",
        502,
        true,
        listingStatus,
      );
    }
  }

  async function removeListingMetadata(
    listingId: string,
    listingStatus: ListingLifecycleStatus,
  ): Promise<void> {
    try {
      await database.deleteListingImageMetadata(listingId);
    } catch {
      throw new LifecycleError(
        "metadata_remove_failed",
        "The listing photo records could not be removed. Please try again.",
        502,
        true,
        listingStatus,
      );
    }
  }

  function requireMutableListing(listing: LifecycleListing): void {
    if (listing.status === "deleted") {
      throw new LifecycleError(
        "invalid_status",
        "A deleted listing cannot be changed.",
        409,
        false,
        "deleted",
      );
    }
  }

  function isBoundCanonicalKey(
    userId: string,
    listingId: string,
    storageKey: string,
  ): boolean {
    const escapedOwner = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedListing = listingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `^${escapedOwner}/${escapedListing}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.webp$`,
      "i",
    ).test(storageKey);
  }

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

      if (action.action === "publish") {
        if (listing.status !== "draft") {
          throw new LifecycleError(
            "invalid_status",
            "Only a draft listing can be published.",
            409,
            false,
            listing.status,
          );
        }

        const publication = await database.publishListing({
          userId,
          listingId: action.listingId,
        });
        if (publication.imageRequired) {
          throw new LifecycleError(
            "image_required",
            "Add at least one photo before publishing this listing.",
            409,
            false,
            "draft",
          );
        }

        return {
          action: action.action,
          listingId: action.listingId,
          status: publication.status,
        };
      }

      requireMutableListing(listing);

      if (action.action === "delete-image") {
        const image = await database.getImage(action.listingId, action.imageId);
        if (
          !image ||
          image.storageKey !== action.storageKey ||
          !isBoundCanonicalKey(userId, action.listingId, image.storageKey)
        ) {
          throw new LifecycleError(
            "image_binding_mismatch",
            "The photo does not belong to this listing.",
            403,
            false,
            listing.status,
          );
        }

        const reservation = await database.reserveImageDeletion({
          userId,
          listingId: action.listingId,
          imageId: image.id,
          storageKey: image.storageKey,
        });
        const cleanupPending = await processCleanupJobs(reservation.jobs);
        return {
          action: action.action,
          listingId: action.listingId,
          status: reservation.status,
          ...(cleanupPending ? { cleanupPending: true } : {}),
        };
      }

      if (action.action === "delete-listing") {
        const images = await database.listImages(action.listingId);
        if (
          images.some(
            (image) =>
              !isBoundCanonicalKey(userId, action.listingId, image.storageKey),
          )
        ) {
          throw new LifecycleError(
            "image_binding_mismatch",
            "A photo key does not belong to this listing.",
            403,
            false,
            listing.status,
          );
        }
        const reservation = await database.reserveListingDeletion({
          userId,
          listingId: action.listingId,
        });
        const cleanupPending = await processCleanupJobs(reservation.jobs);
        return {
          action: action.action,
          listingId: action.listingId,
          status: reservation.status,
          ...(cleanupPending ? { cleanupPending: true } : {}),
        };
      }

      if (!isBoundCanonicalKey(userId, action.listingId, action.storageKey)) {
        throw new LifecycleError(
          "image_binding_mismatch",
          "The photo key does not belong to this listing.",
          403,
          false,
          listing.status,
        );
      }

      const registeredImage = await database.getImageByStorageKey(
        action.listingId,
        action.storageKey,
      );
      if (registeredImage) {
        throw new LifecycleError(
          "image_binding_mismatch",
          "A registered photo must use the normal delete action.",
          409,
          false,
          listing.status,
        );
      }

      const reservation = await database.reserveUploadCleanup({
        userId,
        listingId: action.listingId,
        storageKey: action.storageKey,
      });
      const cleanupPending = await processCleanupJobs(reservation.jobs);
      return {
        action: action.action,
        listingId: action.listingId,
        status: reservation.status,
        ...(cleanupPending ? { cleanupPending: true } : {}),
      };
    },
  };
}
