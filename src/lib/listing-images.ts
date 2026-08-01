import rawAppSettings from "../config/app-settings.json";

export const LISTING_IMAGE_SOURCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type ListingImageSourceMimeType =
  (typeof LISTING_IMAGE_SOURCE_MIME_TYPES)[number];

export interface AppSettings {
  schemaVersion: 1;
  images: {
    required: boolean;
    maxPerListing: number;
    acceptedSourceMimeTypes: ListingImageSourceMimeType[];
    sourceSafety: {
      maxBytes: number;
      maxPixels: number;
    };
    canonical: {
      mimeType: "image/webp";
      maxBytes: number;
      maxLongEdge: number;
      initialQuality: number;
      minimumQuality: number;
      qualityStep: number;
    };
    display: {
      aspectRatioWidth: number;
      aspectRatioHeight: number;
      cardWidth: number;
      thumbnailWidth: number;
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean.`);
  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${path} must be a positive integer.`);
  }
  return Number(value);
}

function requireQuality(value: unknown, path: string): number {
  if (typeof value !== "number" || value <= 0 || value > 1) {
    throw new Error(`${path} must be greater than 0 and at most 1.`);
  }
  return value;
}

export function parseAppSettings(value: unknown): AppSettings {
  const root = requireRecord(value, "settings");
  if (root.schemaVersion !== 1) {
    throw new Error("schemaVersion must be 1.");
  }

  const images = requireRecord(root.images, "images");
  const maxPerListing = requirePositiveInteger(
    images.maxPerListing,
    "images.maxPerListing",
  );
  const acceptedSourceMimeTypes = images.acceptedSourceMimeTypes;
  if (
    !Array.isArray(acceptedSourceMimeTypes) ||
    acceptedSourceMimeTypes.length === 0 ||
    acceptedSourceMimeTypes.some(
      (type) =>
        typeof type !== "string" ||
        !LISTING_IMAGE_SOURCE_MIME_TYPES.includes(
          type as ListingImageSourceMimeType,
        ),
    )
  ) {
    throw new Error(
      "images.acceptedSourceMimeTypes must contain supported image MIME types.",
    );
  }
  if (new Set(acceptedSourceMimeTypes).size !== acceptedSourceMimeTypes.length) {
    throw new Error("images.acceptedSourceMimeTypes must not contain duplicates.");
  }

  const sourceSafety = requireRecord(
    images.sourceSafety,
    "images.sourceSafety",
  );
  const canonical = requireRecord(images.canonical, "images.canonical");
  const display = requireRecord(images.display, "images.display");
  if (canonical.mimeType !== "image/webp") {
    throw new Error("images.canonical.mimeType must be image/webp.");
  }

  const initialQuality = requireQuality(
    canonical.initialQuality,
    "images.canonical.initialQuality",
  );
  const minimumQuality = requireQuality(
    canonical.minimumQuality,
    "images.canonical.minimumQuality",
  );
  if (minimumQuality > initialQuality) {
    throw new Error(
      "images.canonical.minimumQuality must not exceed initialQuality.",
    );
  }

  return {
    schemaVersion: 1,
    images: {
      required: requireBoolean(images.required, "images.required"),
      maxPerListing,
      acceptedSourceMimeTypes:
        acceptedSourceMimeTypes as ListingImageSourceMimeType[],
      sourceSafety: {
        maxBytes: requirePositiveInteger(
          sourceSafety.maxBytes,
          "images.sourceSafety.maxBytes",
        ),
        maxPixels: requirePositiveInteger(
          sourceSafety.maxPixels,
          "images.sourceSafety.maxPixels",
        ),
      },
      canonical: {
        mimeType: "image/webp",
        maxBytes: requirePositiveInteger(
          canonical.maxBytes,
          "images.canonical.maxBytes",
        ),
        maxLongEdge: requirePositiveInteger(
          canonical.maxLongEdge,
          "images.canonical.maxLongEdge",
        ),
        initialQuality,
        minimumQuality,
        qualityStep: requireQuality(
          canonical.qualityStep,
          "images.canonical.qualityStep",
        ),
      },
      display: {
        aspectRatioWidth: requirePositiveInteger(
          display.aspectRatioWidth,
          "images.display.aspectRatioWidth",
        ),
        aspectRatioHeight: requirePositiveInteger(
          display.aspectRatioHeight,
          "images.display.aspectRatioHeight",
        ),
        cardWidth: requirePositiveInteger(
          display.cardWidth,
          "images.display.cardWidth",
        ),
        thumbnailWidth: requirePositiveInteger(
          display.thumbnailWidth,
          "images.display.thumbnailWidth",
        ),
      },
    },
  };
}

export const appSettings = parseAppSettings(rawAppSettings);

export function getImageAcceptValue(
  settings: AppSettings = appSettings,
): string {
  return settings.images.acceptedSourceMimeTypes.join(",");
}

export function getImageCapacity(
  currentCount: number,
  settings: AppSettings = appSettings,
): { maximum: number; remaining: number } {
  return {
    maximum: settings.images.maxPerListing,
    remaining: Math.max(0, settings.images.maxPerListing - currentCount),
  };
}

export function getImageLifecycleCopy(settings: AppSettings = appSettings): {
  emptyState: string;
  draftNotice: string;
  minimumToPublish: 0 | 1;
} {
  const maximum = settings.images.maxPerListing;
  if (settings.images.required) {
    return {
      emptyState: `Add at least 1 photo to publish this listing. You can add up to ${maximum} photos.`,
      draftNotice: "Your listing is saved as a draft. Add photos to publish it.",
      minimumToPublish: 1,
    };
  }

  return {
    emptyState: `Photos are optional. Add up to ${maximum} photos to help buyers understand your vehicle.`,
    draftNotice: "Your listing is ready to publish without photos.",
    minimumToPublish: 0,
  };
}
