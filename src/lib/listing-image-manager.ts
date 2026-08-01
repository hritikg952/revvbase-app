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

export type PhotoFilePhase = "preparing" | "uploading" | "success" | "error";

export interface PhotoFileState {
  id: string;
  fileName: string;
  phase: PhotoFilePhase;
  message: string;
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
): void {
  onFileState?.({ id, fileName, phase, message });
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

  for (const [index, source] of files.entries()) {
    const operationId = `selected-${index}`;
    emit(
      onFileState,
      operationId,
      source.name,
      "preparing",
      `Preparing ${source.name}…`,
    );
    const normalized = await normalize(source, settings);
    if (!normalized.ok) {
      const message = normalizationErrorMessage(normalized, settings);
      errors.push({ fileName: source.name, message });
      emit(onFileState, operationId, source.name, "error", message);
      continue;
    }

    emit(
      onFileState,
      operationId,
      source.name,
      "uploading",
      `Uploading ${source.name}…`,
    );
    try {
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
