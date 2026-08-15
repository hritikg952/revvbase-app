import { describe, expect, it } from "vitest";
import { getGalleryMode, getNextGalleryIndex } from "./listing-detail-media";

describe("listing detail media helpers", () => {
  it("selects the correct presentation branch by image count", () => {
    expect(getGalleryMode(0)).toBe("placeholder");
    expect(getGalleryMode(1)).toBe("static");
    expect(getGalleryMode(2)).toBe("carousel");
  });

  it("wraps carousel navigation at either end", () => {
    expect(getNextGalleryIndex(0, -1, 3)).toBe(2);
    expect(getNextGalleryIndex(2, 1, 3)).toBe(0);
    expect(getNextGalleryIndex(0, 1, 1)).toBe(0);
  });
});
