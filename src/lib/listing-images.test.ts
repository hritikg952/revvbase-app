import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appSettings,
  getImageAcceptValue,
  getImageCapacity,
  getImageLifecycleCopy,
  parseAppSettings,
} from "./listing-images";
import { normalizeListingImage } from "./image-normalizer.client";

const heicToMock = vi.hoisted(() => vi.fn());

vi.mock("heic-to", () => ({ heicTo: heicToMock }));

function imageFile(
  name: string,
  type: string,
  signature: number[],
  trailingBytes = 0,
): File {
  return new File(
    [new Uint8Array(signature), new Uint8Array(trailingBytes)],
    name,
    { type },
  );
}

function webpBlob(size: number, type = "image/webp"): Blob {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return new Blob([bytes], { type });
}

function installBrowserImageHarness(outputs: Blob[]) {
  const qualities: number[] = [];
  const drawImage = vi.fn();
  const close = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage })),
    toBlob: vi.fn(
      (callback: BlobCallback, _type?: string, quality?: number) => {
        qualities.push(quality ?? -1);
        callback(outputs.shift() ?? null);
      },
    ),
  };
  const createImageBitmap = vi.fn(async () => ({
    width: 4000,
    height: 3000,
    close,
  }));

  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("document", {
    createElement: vi.fn(() => canvas),
  });

  return { canvas, close, createImageBitmap, drawImage, qualities };
}

afterEach(() => {
  heicToMock.mockReset();
  vi.unstubAllGlobals();
});

describe("listing image settings", () => {
  it("exposes upload and lifecycle behavior from validated JSON settings", () => {
    expect(appSettings.schemaVersion).toBe(1);
    expect(appSettings.images.required).toBe(false);
    expect(getImageCapacity(2)).toEqual({ maximum: 5, remaining: 3 });
    expect(getImageAcceptValue()).toBe(
      "image/jpeg,image/png,image/webp,image/heic,image/heif",
    );
    expect(appSettings.images.canonical).toMatchObject({
      mimeType: "image/webp",
      maxBytes: 1_048_576,
      maxLongEdge: 2560,
    });
    expect(appSettings.images.display).toEqual({
      aspectRatioWidth: 4,
      aspectRatioHeight: 3,
      cardWidth: 640,
      thumbnailWidth: 480,
    });
    expect(getImageLifecycleCopy()).toEqual({
      emptyState:
        "Photos are optional. Add up to 5 photos to help buyers understand your vehicle.",
      draftNotice: "Your listing is ready to publish without photos.",
      minimumToPublish: 0,
    });
  });

  it("changes required-image lifecycle copy without changing application code", () => {
    const requiredSettings = parseAppSettings({
      ...appSettings,
      images: { ...appSettings.images, required: true },
    });

    expect(getImageLifecycleCopy(requiredSettings)).toEqual({
      emptyState:
        "Add at least 1 photo to publish this listing. You can add up to 5 photos.",
      draftNotice: "Your listing is saved as a draft. Add photos to publish it.",
      minimumToPublish: 1,
    });
  });

  it("rejects an invalid settings document during application startup", () => {
    expect(() =>
      parseAppSettings({
        ...appSettings,
        images: {
          ...appSettings.images,
          maxPerListing: 0,
          canonical: {
            ...appSettings.images.canonical,
            minimumQuality: 0.9,
            initialQuality: 0.8,
          },
        },
      }),
    ).toThrow(/maxPerListing/);
  });
});

describe("listing image normalization", () => {
  it("turns a decodable native photo into a bounded canonical WebP", async () => {
    const harness = installBrowserImageHarness([
      webpBlob(1_048_577),
      webpBlob(900_000),
    ]);
    const source = imageFile("bike.jpeg", "image/jpeg", [0xff, 0xd8, 0xff]);

    const result = await normalizeListingImage(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file).toMatchObject({
      name: "bike.webp",
      type: "image/webp",
      size: 900_000,
    });
    expect(result).toMatchObject({ width: 2560, height: 1920 });
    expect(harness.canvas).toMatchObject({ width: 2560, height: 1920 });
    expect(harness.qualities).toEqual([0.86, 0.8]);
    expect(harness.drawImage).toHaveBeenCalledOnce();
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it.each([
    {
      label: "unsupported bytes",
      file: imageFile("bike.gif", "image/gif", [0x47, 0x49, 0x46, 0x38]),
      code: "unsupported-source",
    },
    {
      label: "a MIME claim that disagrees with the bytes",
      file: imageFile("bike.png", "image/png", [0xff, 0xd8, 0xff]),
      code: "unsupported-source",
    },
  ])("rejects $label before browser decoding", async ({ file, code }) => {
    const harness = installBrowserImageHarness([]);

    const result = await normalizeListingImage(file);

    expect(result).toMatchObject({ ok: false, code, fileName: file.name });
    expect(harness.createImageBitmap).not.toHaveBeenCalled();
    expect(harness.canvas.toBlob).not.toHaveBeenCalled();
  });

  it("reports corrupt native input without changing prior image state", async () => {
    const harness = installBrowserImageHarness([]);
    harness.createImageBitmap.mockRejectedValueOnce(new Error("decode failed"));
    const source = imageFile("broken.jpg", "image/jpeg", [0xff, 0xd8, 0xff]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "decode-failed",
      fileName: "broken.jpg",
    });
    expect(harness.canvas.toBlob).not.toHaveBeenCalled();
  });

  it("applies the configured source safety ceiling before decoding", async () => {
    const harness = installBrowserImageHarness([]);
    const settings = parseAppSettings({
      ...appSettings,
      images: {
        ...appSettings.images,
        sourceSafety: { ...appSettings.images.sourceSafety, maxBytes: 8 },
      },
    });
    const source = imageFile(
      "large.jpg",
      "image/jpeg",
      [0xff, 0xd8, 0xff],
      6,
    );

    const result = await normalizeListingImage(source, settings);

    expect(result).toMatchObject({
      ok: false,
      code: "source-too-large",
      fileName: "large.jpg",
    });
    expect(harness.createImageBitmap).not.toHaveBeenCalled();
  });

  it("returns a bounded cannot-fit error when every quality exceeds 1 MB", async () => {
    const harness = installBrowserImageHarness(
      Array.from({ length: 7 }, () => webpBlob(1_048_577)),
    );
    const source = imageFile("detail.png", "image/png", [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "cannot-fit",
      fileName: "detail.png",
    });
    expect(harness.qualities).toHaveLength(7);
    expect(harness.qualities.at(-1)).toBe(0.5);
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("rejects a falsely labelled encoder result", async () => {
    const badOutput = new Blob([new Uint8Array(64)], { type: "image/webp" });
    const harness = installBrowserImageHarness([badOutput]);
    const source = imageFile("bike.webp", "image/webp", [
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "encode-failed",
      fileName: "bike.webp",
    });
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "iphone.heic",
      mimeType: "image/heic",
      brand: [0x68, 0x65, 0x69, 0x63],
    },
    {
      name: "iphone.heif",
      mimeType: "image/heif",
      brand: [0x6d, 0x69, 0x66, 0x31],
    },
  ])(
    "routes $mimeType through the reviewed decoder and canonical WebP path",
    async ({ name, mimeType, brand }) => {
      const harness = installBrowserImageHarness([webpBlob(700_000)]);
      const decodedBitmap = {
        width: 3024,
        height: 4032,
        close: vi.fn(),
      };
      heicToMock.mockResolvedValueOnce(decodedBitmap);
      const source = imageFile(name, mimeType, [
        0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, ...brand,
      ]);

      const result = await normalizeListingImage(source);

      expect(result).toMatchObject({
        ok: true,
        width: 1920,
        height: 2560,
        sourceMimeType: mimeType,
        file: { name: `${name.replace(/\.[^.]+$/, "")}.webp` },
      });
      expect(heicToMock).toHaveBeenCalledWith({ blob: source, type: "bitmap" });
      expect(harness.createImageBitmap).not.toHaveBeenCalled();
      expect(harness.drawImage).toHaveBeenCalledWith(
        decodedBitmap,
        0,
        0,
        1920,
        2560,
      );
      expect(decodedBitmap.close).toHaveBeenCalledOnce();
    },
  );

  it.each([
    {
      label: "decoder rejection",
      decoded: "reject",
    },
    {
      label: "non-bitmap decoder output",
      decoded: "blob",
    },
  ])("returns a file-specific error for $label", async ({ decoded }) => {
    installBrowserImageHarness([]);
    if (decoded === "reject") {
      heicToMock.mockRejectedValueOnce(new Error("bad HEIC"));
    } else {
      heicToMock.mockResolvedValueOnce(new Blob([]));
    }
    const source = imageFile("broken.heic", "image/heic", [
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "decode-failed",
      fileName: "broken.heic",
    });
  });
});
