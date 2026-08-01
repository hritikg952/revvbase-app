import { describe, expect, it } from "vitest";

import {
  appSettings,
  getImageAcceptValue,
  getImageCapacity,
  getImageLifecycleCopy,
  parseAppSettings,
} from "./listing-images";

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
