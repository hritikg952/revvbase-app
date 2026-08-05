"use client";

import {
  normalizeListingImage,
  type ListingImageNormalizationResult,
} from "./image-normalizer.client";
import {
  appSettings,
  getImageCapacity,
  type AppSettings,
} from "./listing-images";
import type {
  ListingImage,
  UploadListingImageInput,
} from "./storage/listing-image-storage";
import {
  ListingImageLifecycleClientError,
  type ListingImageLifecycleAction,
  type ListingImageLifecycleResult,
  type ListingLifecycleStatus,
} from "./listing-image-lifecycle-client";

export type PhotoFilePhase = "preparing" | "uploading" | "success" | "error";

export interface PhotoFileState {
  id: string;
  fileName: string;
  phase: PhotoFilePhase;
  message: string;
  image?: ListingImage;
}

export interface PhotoFileError {
  fileName: string;
  message: string;
}

interface ProcessListingPhotoSelectionInput {
  files: File[];
  images: ListingImage[];
  listingId: string;
  sellerId: string;
  settings?: AppSettings;
  normalize?: (
    file: File,
    settings: AppSettings,
  ) => Promise<ListingImageNormalizationResult>;
  upload: (input: UploadListingImageInput) => Promise<ListingImage>;
  onFileState?: (state: PhotoFileState) => void;
}

export interface ProcessListingPhotoSelectionResult {
  images: ListingImage[];
  errors: PhotoFileError[];
  selectionError: string | null;
}

function emit(
  onFileState: ProcessListingPhotoSelectionInput["onFileState"],
  id: string,
  fileName: string,
  phase: PhotoFilePhase,
  message: string,
  image?: ListingImage,
): void {
  onFileState?.({ id, fileName, phase, message, image });
}

function normalizationErrorMessage(
  result: Extract<ListingImageNormalizationResult, { ok: false }>,
  settings: AppSettings,
): string {
  if (result.code === "cannot-fit") {
    const maximumMegabytes = settings.images.canonical.maxBytes / (1024 * 1024);
    return `${result.fileName} could not be reduced to ${maximumMegabytes.toLocaleString()} MB. Choose a smaller or lower-resolution photo.`;
  }

  return `${result.fileName} could not be used. Choose a supported photo file.`;
}

export async function processListingPhotoSelection({
  files,
  images,
  listingId,
  sellerId,
  settings = appSettings,
  normalize = normalizeListingImage,
  upload,
  onFileState,
}: ProcessListingPhotoSelectionInput): Promise<ProcessListingPhotoSelectionResult> {
  const capacity = getImageCapacity(images.length, settings);
  if (files.length > capacity.remaining) {
    return {
      images: [...images],
      errors: [],
      selectionError: `You can add only ${capacity.remaining} more photo(s) to this listing.`,
    };
  }

  const nextImages = [...images];
  const errors: PhotoFileError[] = [];
  const batchId = crypto.randomUUID();

  for (const [index, source] of files.entries()) {
    const operationId = `${batchId}-${index}`;
    emit(
      onFileState,
      operationId,
      source.name,
      "preparing",
      `Preparing ${source.name}…`,
    );
    let normalized: ListingImageNormalizationResult;
    try {
      normalized = await normalize(source, settings);
    } catch {
      const message = `${source.name} could not be used. Choose a supported photo file.`;
      errors.push({ fileName: source.name, message });
      emit(onFileState, operationId, source.name, "error", message);
      continue;
    }
    if (!normalized.ok) {
      const message = normalizationErrorMessage(normalized, settings);
      errors.push({ fileName: source.name, message });
      emit(onFileState, operationId, source.name, "error", message);
      continue;
    }

    try {
      emit(
        onFileState,
        operationId,
        source.name,
        "uploading",
        `Uploading ${source.name}…`,
      );
      const image = await upload({
        sellerId,
        listingId,
        file: normalized.file,
      });
      nextImages.push(image);
      nextImages.sort((left, right) => left.position - right.position);
      emit(
        onFileState,
        operationId,
        source.name,
        "success",
        `${source.name} added.`,
        image,
      );
    } catch {
      const message = `${source.name} could not be uploaded. Your existing photos were not changed. Try again.`;
      errors.push({ fileName: source.name, message });
      emit(onFileState, operationId, source.name, "error", message);
    }
  }

  return { images: nextImages, errors, selectionError: null };
}

export function getOrderedPhotoTiles(images: ListingImage[]) {
  return [...images]
    .sort((left, right) => left.position - right.position)
    .map((image, index) => ({
      ...image,
      ordinal: index + 1,
      isCover: index === 0,
    }));
}

interface RemoveListingPhotoInput {
  image: ListingImage;
  images: ListingImage[];
  listingId: string;
  currentStatus: ListingLifecycleStatus;
  execute: (
    action: ListingImageLifecycleAction,
  ) => Promise<ListingImageLifecycleResult>;
}

export type RemoveListingPhotoResult =
  | {
      ok: true;
      images: ListingImage[];
      status: ListingLifecycleStatus;
      message: string;
    }
  | {
      ok: false;
      images: ListingImage[];
      status: ListingLifecycleStatus;
      message: string;
    };

export function reconcilePhotoDeletionStatus(
  currentStatus: ListingLifecycleStatus,
  incomingStatus: ListingLifecycleStatus,
): ListingLifecycleStatus {
  if (currentStatus === "deleted" || incomingStatus === "deleted") {
    return "deleted";
  }
  if (currentStatus === "draft" || incomingStatus === "draft") {
    return "draft";
  }
  return "active";
}

export async function removeListingPhoto({
  image,
  images,
  listingId,
  currentStatus,
  execute,
}: RemoveListingPhotoInput): Promise<RemoveListingPhotoResult> {
  try {
    const result = await execute({
      action: "delete-image",
      listingId,
      imageId: image.id,
      storageKey: image.storageKey,
    });
    return {
      ok: true,
      images: images.filter((candidate) => candidate.id !== image.id),
      status: result.status,
      message: result.cleanupPending
        ? "Photo removed. Permanent file cleanup is queued and will retry automatically."
        : result.status === "draft"
        ? "Photo removed. Your listing is now a draft until you add a photo and publish it again."
        : "Photo removed.",
    };
  } catch (error) {
    const authoritativeStatus =
      error instanceof ListingImageLifecycleClientError && error.listingStatus
        ? error.listingStatus
        : currentStatus;
    return {
      ok: false,
      images: [...images],
      status: authoritativeStatus,
      message: "Photo could not be removed. It is still on your listing. Try again.",
    };
  }
}

interface PublishPersistedListingInput {
  listingId: string;
  currentStatus: ListingLifecycleStatus;
  execute: (
    action: ListingImageLifecycleAction,
  ) => Promise<ListingImageLifecycleResult>;
}

export async function publishPersistedListing({
  listingId,
  currentStatus,
  execute,
}: PublishPersistedListingInput) {
  try {
    const result = await execute({ action: "publish", listingId });
    return {
      ok: true as const,
      status: result.status,
      message: result.status === "active"
        ? "Your listing is published."
        : "Your listing remains a draft.",
    };
  } catch (error) {
    return {
      ok: false as const,
      status:
        error instanceof ListingImageLifecycleClientError && error.listingStatus
          ? error.listingStatus
          : currentStatus,
      message: error instanceof ListingImageLifecycleClientError
        ? error.message
        : "Your listing could not be published. Try again.",
    };
  }
}
