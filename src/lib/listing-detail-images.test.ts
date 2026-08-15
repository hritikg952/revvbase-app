import { describe, expect, it } from "vitest";
import { getDetailImageDescriptors } from "./listing-detail-images";

describe("getDetailImageDescriptors", () => {
  it("returns ordered public display descriptors without provider keys", () => {
    expect(getDetailImageDescriptors([
      { publicUrl: "https://cdn.example/two.webp", position: 2 },
      { publicUrl: "https://cdn.example/one.webp", position: 1 },
    ])).toEqual([
      { src: "https://cdn.example/one.webp", position: 1 },
      { src: "https://cdn.example/two.webp", position: 2 },
    ]);
  });

  it("drops malformed records and safely returns an empty image set", () => {
    expect(getDetailImageDescriptors([
      { publicUrl: "", position: 0 },
      { publicUrl: "https://cdn.example/valid.webp", position: 0 },
      { publicUrl: "https://cdn.example/not-a-number.webp", position: Number.NaN },
    ])).toEqual([{ src: "https://cdn.example/valid.webp", position: 0 }]);
  });
});
