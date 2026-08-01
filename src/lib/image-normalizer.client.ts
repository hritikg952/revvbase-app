"use client";

import {
  appSettings,
  type AppSettings,
  type ListingImageSourceMimeType,
} from "./listing-images";

export type ListingImageNormalizationErrorCode =
  | "unsupported-source"
  | "source-too-large"
  | "source-dimensions-too-large"
  | "decode-failed"
  | "heic-decoder-unavailable"
  | "encode-failed"
  | "cannot-fit";

export type ListingImageNormalizationResult =
  | {
      ok: true;
      file: File;
      width: number;
      height: number;
      sourceMimeType: ListingImageSourceMimeType;
    }
  | {
      ok: false;
      code: ListingImageNormalizationErrorCode;
      fileName: string;
      message: string;
    };

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

async function detectSourceMimeType(
  file: File,
): Promise<ListingImageSourceMimeType | null> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (
    startsWith(bytes, RIFF_SIGNATURE) &&
    startsWith(bytes, WEBP_SIGNATURE, 8)
  ) {
    return "image/webp";
  }

  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
    if (["heif", "mif1", "msf1"].includes(brand)) {
      return "image/heif";
    }
  }

  return null;
}

function claimedMimeMatches(
  claimed: string,
  detected: ListingImageSourceMimeType,
): boolean {
  if (!claimed) return true;
  if (
    (detected === "image/heic" || detected === "image/heif") &&
    (claimed === "image/heic" || claimed === "image/heif")
  ) {
    return true;
  }
  return claimed === detected;
}

function failure(
  file: File,
  code: ListingImageNormalizationErrorCode,
  message: string,
): ListingImageNormalizationResult {
  return { ok: false, code, fileName: file.name, message };
}

function outputFileName(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]*$/, "").trim() || "listing-photo";
  return `${base}.webp`;
}

function resizeWithinLongEdge(
  width: number,
  height: number,
  maximum: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maximum) return { width, height };
  const scale = maximum / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp",
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

async function hasWebpSignature(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return (
    startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8)
  );
}

function qualities(settings: AppSettings): number[] {
  const values: number[] = [];
  const { initialQuality, minimumQuality, qualityStep } =
    settings.images.canonical;
  for (
    let quality = initialQuality;
    quality >= minimumQuality - Number.EPSILON;
    quality -= qualityStep
  ) {
    values.push(Number(Math.max(minimumQuality, quality).toFixed(2)));
  }
  if (values.at(-1) !== minimumQuality) values.push(minimumQuality);
  return [...new Set(values)];
}

/**
 * Converts one untrusted browser file into the only asset accepted by storage.
 * The original is decoded and re-encoded but never returned or persisted.
 */
export async function normalizeListingImage(
  file: File,
  settings: AppSettings = appSettings,
): Promise<ListingImageNormalizationResult> {
  const { images } = settings;
  if (file.size > images.sourceSafety.maxBytes) {
    return failure(
      file,
      "source-too-large",
      `${file.name} is too large to process safely. Choose a smaller photo.`,
    );
  }

  let sourceMimeType: ListingImageSourceMimeType | null;
  try {
    sourceMimeType = await detectSourceMimeType(file);
  } catch {
    sourceMimeType = null;
  }
  if (
    !sourceMimeType ||
    !images.acceptedSourceMimeTypes.includes(sourceMimeType) ||
    !claimedMimeMatches(file.type, sourceMimeType)
  ) {
    return failure(
      file,
      "unsupported-source",
      `${file.name} could not be used. Choose a supported photo file.`,
    );
  }

  // This branch is deliberately isolated. Plan 06-01 stops for legitimacy review
  // before wiring a dynamically imported HEIC/HEIF decoder into this boundary.
  if (sourceMimeType === "image/heic" || sourceMimeType === "image/heif") {
    return failure(
      file,
      "heic-decoder-unavailable",
      `${file.name} could not be converted on this device. Choose another supported photo file.`,
    );
  }

  if (typeof createImageBitmap !== "function") {
    return failure(
      file,
      "decode-failed",
      `${file.name} could not be used. Choose a supported photo file.`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return failure(
      file,
      "decode-failed",
      `${file.name} could not be used. Choose a supported photo file.`,
    );
  }

  try {
    if (
      bitmap.width <= 0 ||
      bitmap.height <= 0 ||
      bitmap.width * bitmap.height > images.sourceSafety.maxPixels
    ) {
      return failure(
        file,
        "source-dimensions-too-large",
        `${file.name} has dimensions that are too large to process safely.`,
      );
    }

    const dimensions = resizeWithinLongEdge(
      bitmap.width,
      bitmap.height,
      images.canonical.maxLongEdge,
    );
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return failure(
        file,
        "encode-failed",
        `${file.name} could not be converted to a web photo.`,
      );
    }
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    for (const quality of qualities(settings)) {
      const blob = await canvasToBlob(
        canvas,
        images.canonical.mimeType,
        quality,
      );
      if (
        !blob ||
        blob.type !== images.canonical.mimeType ||
        !(await hasWebpSignature(blob))
      ) {
        return failure(
          file,
          "encode-failed",
          `${file.name} could not be converted to a WebP photo.`,
        );
      }
      if (blob.size <= images.canonical.maxBytes) {
        return {
          ok: true,
          file: new File([blob], outputFileName(file.name), {
            type: images.canonical.mimeType,
            lastModified: Date.now(),
          }),
          width: dimensions.width,
          height: dimensions.height,
          sourceMimeType,
        };
      }
    }

    const maximumMegabytes = images.canonical.maxBytes / (1024 * 1024);
    return failure(
      file,
      "cannot-fit",
      `${file.name} could not be reduced to ${maximumMegabytes.toLocaleString()} MB. Choose a smaller or lower-resolution photo.`,
    );
  } finally {
    bitmap.close();
  }
}
