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
const NATIVE_DIMENSION_HEADER_BYTES = 64 * 1024;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

interface SourceDimensions {
  width: number;
  height: number;
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function parseJpegDimensions(bytes: Uint8Array): SourceDimensions | null {
  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) return null;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  return null;
}

function parseWebpDimensions(bytes: Uint8Array): SourceDimensions | null {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height:
        1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) +
        ((bytes[24] & 0x0f) << 10),
    };
  }
  if (
    chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d &&
    bytes[24] === 0x01 && bytes[25] === 0x2a
  ) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  return null;
}

function parseIsoBmffDimensions(bytes: Uint8Array): SourceDimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dimensions: SourceDimensions[] = [];

  function walk(start: number, end: number, depth: number): boolean {
    if (depth > 8) return false;
    let offset = start;
    while (offset < end) {
      if (end - offset < 8) return false;
      let size = view.getUint32(offset);
      const type = ascii(bytes, offset + 4, 4);
      let headerSize = 8;
      if (size === 1) {
        if (end - offset < 16) return false;
        const extendedSize = view.getBigUint64(offset + 8);
        if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return false;
        size = Number(extendedSize);
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < headerSize || offset + size > end) return false;

      const payloadStart = offset + headerSize;
      const boxEnd = offset + size;
      if (type === "ispe") {
        if (boxEnd - payloadStart < 12) return false;
        dimensions.push({
          width: view.getUint32(payloadStart + 4),
          height: view.getUint32(payloadStart + 8),
        });
      } else if (type === "meta") {
        if (boxEnd - payloadStart < 4 || !walk(payloadStart + 4, boxEnd, depth + 1)) {
          return false;
        }
      } else if (
        (type === "iprp" || type === "ipco") &&
        !walk(payloadStart, boxEnd, depth + 1)
      ) {
        return false;
      }
      offset = boxEnd;
    }
    return offset === end;
  }

  if (!walk(0, bytes.length, 0) || dimensions.length === 0) return null;
  return dimensions.reduce((largest, candidate) =>
    BigInt(candidate.width) * BigInt(candidate.height) >
        BigInt(largest.width) * BigInt(largest.height)
      ? candidate
      : largest
  );
}

async function parseSourceDimensions(
  file: File,
  sourceMimeType: ListingImageSourceMimeType,
  byteBudget: number,
): Promise<SourceDimensions | null> {
  const inspectionBytes = sourceMimeType === "image/jpeg" ||
      sourceMimeType === "image/heic" || sourceMimeType === "image/heif"
    ? Math.min(file.size, byteBudget)
    : Math.min(file.size, NATIVE_DIMENSION_HEADER_BYTES);
  const bytes = new Uint8Array(
    await file.slice(0, inspectionBytes).arrayBuffer(),
  );
  if (sourceMimeType === "image/png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (sourceMimeType === "image/jpeg") return parseJpegDimensions(bytes);
  if (sourceMimeType === "image/webp") return parseWebpDimensions(bytes);
  if (sourceMimeType === "image/heic" || sourceMimeType === "image/heif") {
    return parseIsoBmffDimensions(bytes);
  }
  return null;
}

function exceedsPixelLimit(
  dimensions: SourceDimensions,
  maxPixels: number,
): boolean {
  return dimensions.width <= 0 || dimensions.height <= 0 ||
    dimensions.width > Math.floor(maxPixels / dimensions.height);
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

function isImageBitmapLike(value: unknown): value is ImageBitmap {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ImageBitmap>;
  return (
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.close === "function"
  );
}

async function decodeSourceBitmap(
  file: File,
  sourceMimeType: ListingImageSourceMimeType,
): Promise<ImageBitmap> {
  if (sourceMimeType === "image/heic" || sourceMimeType === "image/heif") {
    const { heicTo } = await import("heic-to");
    const decoded = await heicTo({ blob: file, type: "bitmap" });
    if (!isImageBitmapLike(decoded)) {
      throw new Error("The HEIC decoder did not return a bitmap.");
    }
    return decoded;
  }

  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot decode image files.");
  }
  return createImageBitmap(file);
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

  try {
    const headerDimensions = await parseSourceDimensions(
      file,
      sourceMimeType,
      images.sourceSafety.maxBytes,
    );
    if (
      !headerDimensions &&
      ["image/jpeg", "image/heic", "image/heif"].includes(sourceMimeType)
    ) {
      return failure(
        file,
        "decode-failed",
        `${file.name} dimensions could not be verified safely.`,
      );
    }
    if (
      headerDimensions &&
      exceedsPixelLimit(headerDimensions, images.sourceSafety.maxPixels)
    ) {
      return failure(
        file,
        "source-dimensions-too-large",
        `${file.name} has dimensions that are too large to process safely.`,
      );
    }
  } catch {
    return failure(
      file,
      "decode-failed",
      `${file.name} could not be used. Choose a supported photo file.`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeSourceBitmap(file, sourceMimeType);
  } catch {
    return failure(
      file,
      "decode-failed",
      `${file.name} could not be used. Choose a supported photo file.`,
    );
  }

  try {
    if (
      exceedsPixelLimit(bitmap, images.sourceSafety.maxPixels)
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
