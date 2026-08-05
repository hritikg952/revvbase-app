import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appSettings,
  getImageAcceptValue,
  getImageCapacity,
  getImageLifecycleCopy,
  parseAppSettings,
} from "./listing-images";
import { normalizeListingImage } from "./image-normalizer.client";
import {
  createListingThroughPublication,
  getCreateListingGuidance,
  getCreatedDraftNotice,
  getListingEditPageCopy,
  getListingFieldUpdate,
} from "./listing-form-workflow";
import {
  deleteManagedListing,
  getOwnerListingCards,
  getPublicListingCards,
} from "./listing-image-consumers";
import {
  invokeListingImageLifecycle,
  ListingImageLifecycleClientError,
} from "./listing-image-lifecycle-client";
import {
  getOrderedPhotoTiles,
  processListingPhotoSelection,
  publishPersistedListing,
  reconcilePhotoDeletionStatus,
  removeListingPhoto,
} from "./listing-image-manager";
import { emptyListingForm, toListingPayload } from "./listings";

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

function lateSofJpeg(width: number, height: number): File {
  const appLength = 65_535;
  const bytes = new Uint8Array(2 + 2 + appLength + 19);
  bytes.set([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff], 0);
  const sof = 2 + 2 + appLength;
  bytes.set([
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ], sof);
  return new File([bytes], "late-sof.jpg", { type: "image/jpeg" });
}

function jpegWithSof(name: string, width: number, height: number): File {
  const bytes = new Uint8Array(21);
  bytes.set([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]);
  return new File([bytes], name, { type: "image/jpeg" });
}

function heicWithIspe(
  width: number,
  height: number,
  name = "pixel-bomb.heic",
  type = "image/heic",
  brand = "heic",
): File {
  const bytes = new Uint8Array(72);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 24);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set([...brand].map((character) => character.charCodeAt(0)), 8);
  bytes.set([...brand].map((character) => character.charCodeAt(0)), 16);
  view.setUint32(24, 48);
  bytes.set([0x6d, 0x65, 0x74, 0x61], 28);
  view.setUint32(36, 36);
  bytes.set([0x69, 0x70, 0x72, 0x70], 40);
  view.setUint32(44, 28);
  bytes.set([0x69, 0x70, 0x63, 0x6f], 48);
  view.setUint32(52, 20);
  bytes.set([0x69, 0x73, 0x70, 0x65], 56);
  view.setUint32(64, width);
  view.setUint32(68, height);
  return new File([bytes], name, { type });
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

describe("public listing image consumers", () => {
  it("does not construct a legacy image URL in a listing mutation payload", () => {
    const payload = toListingPayload(
      {
        ...emptyListingForm,
        make: "Honda",
        model: "CB350",
        year: "2024",
        odometer_km: "4000",
        price_inr: "210000",
        city: "Pune",
      },
      "owner-1",
    );

    expect(payload).not.toHaveProperty("image_url");
  });

  it("keeps only active listings and selects the first ordered photo or stock placeholder", () => {
    const baseListing = {
      seller_id: "owner-1",
      vehicle_type: "motorcycle" as const,
      make: "Honda",
      model: "CB350",
      year: 2024,
      odometer_km: 4_000,
      price_inr: 210_000,
      city: "Pune",
      fuel_type: "petrol" as const,
      previous_owners: 1,
      insurance_valid_until: null,
      description: null,
      image_url: "https://legacy.example/must-not-render.jpg",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    };
    const listings = [
      { ...baseListing, id: "active-with-photos", status: "active" as const },
      { ...baseListing, id: "active-without-photos", status: "active" as const },
      { ...baseListing, id: "draft-with-photo", status: "draft" as const },
    ];
    const imagesByListing = new Map([
      [
        "active-with-photos",
        [
          {
            id: "second",
            listingId: "active-with-photos",
            storageKey: "opaque-second",
            publicUrl: "https://cdn.example/second.webp",
            position: 1,
            createdAt: "2026-08-01T00:00:02.000Z",
          },
          {
            id: "cover",
            listingId: "active-with-photos",
            storageKey: "opaque-cover",
            publicUrl: "https://cdn.example/cover.webp",
            position: 0,
            createdAt: "2026-08-01T00:00:01.000Z",
          },
        ],
      ],
      [
        "draft-with-photo",
        [{
          id: "draft-photo",
          listingId: "draft-with-photo",
          storageKey: "opaque-draft",
          publicUrl: "https://cdn.example/draft.webp",
          position: 0,
          createdAt: "2026-08-01T00:00:03.000Z",
        }],
      ],
    ]);

    expect(getPublicListingCards(listings, imagesByListing)).toEqual([
      expect.objectContaining({
        listing: expect.objectContaining({ id: "active-with-photos" }),
        coverUrl: "https://cdn.example/cover.webp",
      }),
      expect.objectContaining({
        listing: expect.objectContaining({ id: "active-without-photos" }),
        coverUrl: "/vehicle-placeholder.svg",
      }),
    ]);
  });
});

describe("owner listing image consumers", () => {
  it("keeps draft and active listings manageable while excluding deleted records", () => {
    const baseListing = {
      seller_id: "owner-1",
      vehicle_type: "scooter" as const,
      make: "TVS",
      model: "Ntorq",
      year: 2023,
      odometer_km: 8_000,
      price_inr: 85_000,
      city: "Mumbai",
      fuel_type: "petrol" as const,
      previous_owners: 1,
      insurance_valid_until: null,
      description: null,
      image_url: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    };
    const listings = [
      { ...baseListing, id: "draft-1", status: "draft" as const },
      { ...baseListing, id: "active-1", status: "active" as const },
      { ...baseListing, id: "deleted-1", status: "deleted" as const },
    ];

    expect(getOwnerListingCards(listings, new Map())).toEqual([
      expect.objectContaining({
        listing: expect.objectContaining({ id: "draft-1" }),
        statusLabel: "Draft",
        editHref: "/listings/draft-1/edit",
        publicHref: null,
      }),
      expect.objectContaining({
        listing: expect.objectContaining({ id: "active-1" }),
        statusLabel: "Active",
        editHref: "/listings/active-1/edit",
      }),
    ]);
  });

  it("removes an owner card only after protected lifecycle returns deleted", async () => {
    const execute = vi.fn().mockResolvedValue({
      action: "delete-listing",
      listingId: "listing-1",
      status: "deleted",
    });

    const result = await deleteManagedListing({
      listingId: "listing-1",
      currentStatus: "active",
      execute,
    });

    expect(execute).toHaveBeenCalledWith({
      action: "delete-listing",
      listingId: "listing-1",
    });
    expect(result).toEqual({
      ok: true,
      status: "deleted",
      message: "Listing deleted.",
    });
  });

  it("keeps the owner card and gives retry guidance when protected deletion fails", async () => {
    const result = await deleteManagedListing({
      listingId: "listing-1",
      currentStatus: "draft",
      execute: vi.fn().mockRejectedValue(
        new ListingImageLifecycleClientError(
          "storage_remove_failed",
          "provider detail",
          true,
          "draft",
        ),
      ),
    });

    expect(result).toEqual({
      ok: false,
      status: "draft",
      message: "Listing could not be deleted. It is still available to you. Try again.",
    });
  });
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

describe("draft-first listing publication", () => {
  it("uses required-mode photo guidance on the create-listing page", () => {
    const requiredSettings = parseAppSettings({
      ...appSettings,
      images: { ...appSettings.images, required: true },
    });

    expect(getCreateListingGuidance(requiredSettings)).toBe(
      "Add at least 1 photo to publish this listing. You can add up to 5 photos.",
    );
  });

  it("preserves the typed lifecycle payload from a non-2xx Edge Function response", async () => {
    const contextJson = vi.fn().mockResolvedValue({
      error: {
        code: "image_required",
        message: "Add at least one photo before publishing this listing.",
        retryable: false,
        listingStatus: "draft",
      },
    });
    const client = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Edge Function returned a non-2xx status code",
            context: { json: contextJson },
          },
        }),
      },
    };

    await expect(
      invokeListingImageLifecycle(
        { action: "publish", listingId: "listing-1" },
        client,
      ),
    ).rejects.toMatchObject({
      name: "ListingImageLifecycleClientError",
      code: "image_required",
      message: "Add at least one photo before publishing this listing.",
      retryable: false,
      listingStatus: "draft",
    });
    expect(contextJson).toHaveBeenCalledOnce();
  });

  it("persists a draft before protected publication and follows the active server result", async () => {
    const calls: string[] = [];

    const outcome = await createListingThroughPublication({
      draftNotice: "Your listing is ready to publish without photos.",
      persistDraft: async () => {
        calls.push("persist-draft");
        return { id: "listing-1" };
      },
      publish: async (listingId) => {
        calls.push(`publish:${listingId}`);
        return { status: "active" };
      },
    });

    expect(calls).toEqual(["persist-draft", "publish:listing-1"]);
    expect(outcome).toEqual({
      listingId: "listing-1",
      status: "active",
      destination: "/my-listings",
      notice: null,
    });
  });

  it("keeps the persisted owner draft reachable when protected publication requires a photo", async () => {
    const outcome = await createListingThroughPublication({
      draftNotice: "Your listing is saved as a draft. Add photos to publish it.",
      persistDraft: async () => ({ id: "listing-2" }),
      publish: async () => {
        throw new ListingImageLifecycleClientError(
          "image_required",
          "Add at least one photo before publishing this listing.",
          false,
          "draft",
        );
      },
    });

    expect(outcome).toEqual({
      listingId: "listing-2",
      status: "draft",
      destination: "/listings/listing-2/edit?created=draft",
      notice: "Your listing is saved as a draft. Add photos to publish it.",
    });
  });

  it("uses an authoritative draft result even when client copy expects optional photos", async () => {
    const outcome = await createListingThroughPublication({
      draftNotice: "Your listing is ready to publish without photos.",
      persistDraft: async () => ({ id: "listing-3" }),
      publish: async () => ({ status: "draft" }),
    });

    expect(outcome).toEqual({
      listingId: "listing-3",
      status: "draft",
      destination: "/listings/listing-3/edit?created=draft",
      notice: "Your listing was saved as a draft.",
    });
  });

  it("keeps a saved draft reachable after a generic publication failure", async () => {
    const persistDraft = vi.fn().mockResolvedValue({ id: "listing-4" });

    const outcome = await createListingThroughPublication({
      draftNotice: "Your listing is ready to publish without photos.",
      persistDraft,
      publish: vi.fn().mockRejectedValue(new Error("network timeout")),
    });

    expect(persistDraft).toHaveBeenCalledOnce();
    expect(outcome).toEqual({
      listingId: "listing-4",
      status: "draft",
      destination: "/listings/listing-4/edit?created=publish-failed",
      notice:
        "Your listing was saved as a draft, but publication could not be completed. Try publishing again from this page.",
    });
    expect(getCreatedDraftNotice("publish-failed")).toEqual({
      kind: "error",
      message:
        "Your listing was saved as a draft, but publication could not be completed. Try publishing again from this page.",
    });
  });

  it("never writes owner or lifecycle fields during an existing listing field update", () => {
    expect(
      getListingFieldUpdate({
        seller_id: "owner-1",
        status: "draft",
        make: "Honda",
        city: "Pune",
      }),
    ).toEqual({ make: "Honda", city: "Pune" });
  });
});

describe("immediate listing photo uploads", () => {
  const cover = {
    id: "image-1",
    listingId: "listing-1",
    storageKey: "opaque-cover-key",
    publicUrl: "https://cdn.example/cover.webp",
    position: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
  };

  it("adds each valid file independently while preserving ready photos and ordered cover state", async () => {
    const second = imageFile("second.jpg", "image/jpeg", [0xff, 0xd8, 0xff]);
    const broken = imageFile("broken.gif", "image/gif", [0x47, 0x49, 0x46]);
    const canonical = new File(["webp"], "second.webp", { type: "image/webp" });
    const updates: Array<{ phase: string; fileName: string }> = [];
    const normalize = vi.fn(async (file: File) =>
      file === second
        ? {
            ok: true as const,
            file: canonical,
            width: 1200,
            height: 900,
            sourceMimeType: "image/jpeg" as const,
          }
        : {
            ok: false as const,
            code: "unsupported-source" as const,
            fileName: file.name,
            message: `${file.name} could not be used.`,
          },
    );
    const upload = vi.fn(async () => ({
      ...cover,
      id: "image-2",
      storageKey: "opaque-second-key",
      publicUrl: "https://cdn.example/second.webp",
      position: 1,
    }));

    const result = await processListingPhotoSelection({
      files: [second, broken],
      images: [cover],
      listingId: "listing-1",
      sellerId: "owner-1",
      normalize,
      upload,
      onFileState: (state) => updates.push({
        phase: state.phase,
        fileName: state.fileName,
      }),
    });

    expect(upload).toHaveBeenCalledWith({
      sellerId: "owner-1",
      listingId: "listing-1",
      file: canonical,
    });
    expect(result.images).toEqual([cover, expect.objectContaining({ id: "image-2" })]);
    expect(result.errors).toEqual([
      {
        fileName: "broken.gif",
        message: "broken.gif could not be used. Choose a supported photo file.",
      },
    ]);
    expect(updates).toEqual([
      { phase: "preparing", fileName: "second.jpg" },
      { phase: "uploading", fileName: "second.jpg" },
      { phase: "success", fileName: "second.jpg" },
      { phase: "preparing", fileName: "broken.gif" },
      { phase: "error", fileName: "broken.gif" },
    ]);
    expect(getOrderedPhotoTiles(result.images)).toEqual([
      expect.objectContaining({ id: "image-1", ordinal: 1, isCover: true }),
      expect.objectContaining({ id: "image-2", ordinal: 2, isCover: false }),
    ]);
  });

  it("rejects an over-capacity selection without touching existing photos", async () => {
    const normalize = vi.fn();
    const upload = vi.fn();
    const files = [
      imageFile("fourth.jpg", "image/jpeg", [0xff, 0xd8, 0xff]),
      imageFile("fifth.jpg", "image/jpeg", [0xff, 0xd8, 0xff]),
    ];

    const result = await processListingPhotoSelection({
      files,
      images: [cover, { ...cover, id: "2" }, { ...cover, id: "3" }, { ...cover, id: "4" }],
      listingId: "listing-1",
      sellerId: "owner-1",
      normalize,
      upload,
    });

    expect(result.selectionError).toBe(
      "You can add only 1 more photo(s) to this listing.",
    );
    expect(result.images).toHaveLength(4);
    expect(normalize).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("isolates an unexpected normalizer rejection to its file and continues the batch", async () => {
    const first = imageFile("broken.jpg", "image/jpeg", [0xff, 0xd8, 0xff]);
    const second = imageFile("ready.jpg", "image/jpeg", [0xff, 0xd8, 0xff]);
    const canonical = new File(["webp"], "ready.webp", { type: "image/webp" });
    const states: Array<{ fileName: string; phase: string }> = [];
    const normalize = vi.fn(async (file: File) => {
      if (file === first) throw new Error("canvas unavailable");
      return {
        ok: true as const,
        file: canonical,
        width: 1200,
        height: 900,
        sourceMimeType: "image/jpeg" as const,
      };
    });
    const upload = vi.fn().mockResolvedValue({
      ...cover,
      id: "image-2",
      position: 1,
    });

    const result = await processListingPhotoSelection({
      files: [first, second],
      images: [cover],
      listingId: "listing-1",
      sellerId: "owner-1",
      normalize,
      upload,
      onFileState: ({ fileName, phase }) => states.push({ fileName, phase }),
    });

    expect(result.errors).toEqual([
      {
        fileName: "broken.jpg",
        message:
          "broken.jpg could not be used. Choose a supported photo file.",
      },
    ]);
    expect(result.images).toEqual([cover, expect.objectContaining({ id: "image-2" })]);
    expect(states).toContainEqual({ fileName: "broken.jpg", phase: "error" });
    expect(states).toContainEqual({ fileName: "ready.jpg", phase: "success" });
  });

  it("assigns distinct operation IDs to separate upload batches", async () => {
    const source = imageFile("ready.jpg", "image/jpeg", [0xff, 0xd8, 0xff]);
    const canonical = new File(["webp"], "ready.webp", { type: "image/webp" });
    const ids: string[] = [];
    const normalize = vi.fn().mockResolvedValue({
      ok: true,
      file: canonical,
      width: 1200,
      height: 900,
      sourceMimeType: "image/jpeg",
    });
    const upload = vi.fn().mockResolvedValue({ ...cover, id: "image-2" });

    for (let batch = 0; batch < 2; batch += 1) {
      await processListingPhotoSelection({
        files: [source],
        images: [cover],
        listingId: "listing-1",
        sellerId: "owner-1",
        normalize,
        upload,
        onFileState: (state) => ids.push(state.id),
      });
    }

    expect(new Set(ids).size).toBe(2);
  });
});

describe("authoritative listing photo removal", () => {
  const onlyPhoto = {
    id: "image-1",
    listingId: "listing-1",
    storageKey: "opaque-image-key",
    publicUrl: "https://cdn.example/image.webp",
    position: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
  };

  it("removes the final tile and reports the server-returned draft status", async () => {
    const execute = vi.fn().mockResolvedValue({
      action: "delete-image",
      listingId: "listing-1",
      status: "draft",
    });

    const result = await removeListingPhoto({
      image: onlyPhoto,
      images: [onlyPhoto],
      listingId: "listing-1",
      currentStatus: "active",
      execute,
    });

    expect(execute).toHaveBeenCalledWith({
      action: "delete-image",
      listingId: "listing-1",
      imageId: "image-1",
      storageKey: "opaque-image-key",
    });
    expect(result).toEqual({
      ok: true,
      images: [],
      status: "draft",
      message:
        "Photo removed. Your listing is now a draft until you add a photo and publish it again.",
    });
  });

  it("keeps the ready tile and current status when protected deletion fails", async () => {
    const result = await removeListingPhoto({
      image: onlyPhoto,
      images: [onlyPhoto],
      listingId: "listing-1",
      currentStatus: "active",
      execute: vi.fn().mockRejectedValue(
        new ListingImageLifecycleClientError(
          "storage_remove_failed",
          "provider detail",
          true,
          "active",
        ),
      ),
    });

    expect(result).toEqual({
      ok: false,
      images: [onlyPhoto],
      status: "active",
      message: "Photo could not be removed. It is still on your listing. Try again.",
    });
  });

  it("does not let an older active deletion response overwrite an authoritative draft", () => {
    const afterFinalDeletion = reconcilePhotoDeletionStatus("active", "draft");
    const afterOlderResponse = reconcilePhotoDeletionStatus(
      afterFinalDeletion,
      "active",
    );

    expect(afterOlderResponse).toBe("draft");
  });
});

describe("persisted draft republication", () => {
  it("switches edit-page messaging to active after protected publication", async () => {
    const result = await publishPersistedListing({
      listingId: "listing-1",
      currentStatus: "draft",
      execute: vi.fn().mockResolvedValue({
        action: "publish",
        listingId: "listing-1",
        status: "active",
      }),
    });

    expect(getListingEditPageCopy(result.status)).toEqual({
      eyebrow: "Edit listing",
      visibilityNotice: null,
    });
  });

  it("requests protected publication and displays only the returned status", async () => {
    const execute = vi.fn().mockResolvedValue({
      action: "publish",
      listingId: "listing-1",
      status: "active",
    });

    const result = await publishPersistedListing({
      listingId: "listing-1",
      currentStatus: "draft",
      execute,
    });

    expect(execute).toHaveBeenCalledWith({
      action: "publish",
      listingId: "listing-1",
    });
    expect(result).toEqual({
      ok: true,
      status: "active",
      message: "Your listing is published.",
    });
  });
});

describe("listing image normalization", () => {
  it("turns a decodable native photo into a bounded canonical WebP", async () => {
    const harness = installBrowserImageHarness([
      webpBlob(1_048_577),
      webpBlob(900_000),
    ]);
    const source = jpegWithSof("bike.jpeg", 4000, 3000);

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

  it("rejects oversized PNG dimensions from bounded headers before decoding", async () => {
    const harness = installBrowserImageHarness([]);
    const source = imageFile("pixel-bomb.png", "image/png", [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x01, 0x86, 0xa0,
      0x00, 0x01, 0x86, 0xa0,
    ]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "source-dimensions-too-large",
      fileName: "pixel-bomb.png",
    });
    expect(harness.createImageBitmap).not.toHaveBeenCalled();
  });

  it("rejects an oversized late-SOF JPEG before browser decoding", async () => {
    const harness = installBrowserImageHarness([]);

    const result = await normalizeListingImage(lateSofJpeg(10_000, 10_000));

    expect(result).toMatchObject({
      ok: false,
      code: "source-dimensions-too-large",
      fileName: "late-sof.jpg",
    });
    expect(harness.createImageBitmap).not.toHaveBeenCalled();
  });

  it("rejects oversized HEIC ispe dimensions before invoking heic-to", async () => {
    installBrowserImageHarness([]);

    const result = await normalizeListingImage(heicWithIspe(10_000, 10_000));

    expect(result).toMatchObject({
      ok: false,
      code: "source-dimensions-too-large",
      fileName: "pixel-bomb.heic",
    });
    expect(heicToMock).not.toHaveBeenCalled();
  });

  it("rejects HEIC when bounded metadata cannot prove dimensions", async () => {
    installBrowserImageHarness([]);
    const source = imageFile("unknown.heic", "image/heic", [
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "decode-failed",
      fileName: "unknown.heic",
    });
    expect(heicToMock).not.toHaveBeenCalled();
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
      const source = heicWithIspe(
        3024,
        4032,
        name,
        mimeType,
        String.fromCharCode(...brand),
      );

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
    const source = heicWithIspe(
      3024,
      4032,
      "broken.heic",
      "image/heic",
    );

    const result = await normalizeListingImage(source);

    expect(result).toMatchObject({
      ok: false,
      code: "decode-failed",
      fileName: "broken.heic",
    });
  });
});
