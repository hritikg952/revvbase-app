import { describe, expect, it, vi } from "vitest";
import { createSupabaseListingImageStorage } from "./storage/supabase-listing-images";

describe("listing image storage contract", () => {
  it("uploads one canonical image and returns registered ordered metadata", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "ignored" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          "https://project.supabase.co/storage/v1/object/public/listing-images/owner-1/listing-1/image-1.webp",
      },
    });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "metadata-1",
        listing_id: "listing-1",
        storage_key: "owner-1/listing-1/image-1.webp",
        position: 0,
        created_at: "2026-08-01T00:00:00.000Z",
      },
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn().mockReturnValue({ upload, getPublicUrl }),
      },
      rpc,
    };
    const storage = createSupabaseListingImageStorage({
      client,
      createObjectId: () => "image-1",
    });
    const canonicalFile = new File(["webp"], "vehicle.webp", {
      type: "image/webp",
    });

    await expect(
      storage.upload({
        sellerId: "owner-1",
        listingId: "listing-1",
        file: canonicalFile,
      }),
    ).resolves.toEqual({
      id: "metadata-1",
      listingId: "listing-1",
      storageKey: "owner-1/listing-1/image-1.webp",
      publicUrl:
        "https://project.supabase.co/storage/v1/object/public/listing-images/owner-1/listing-1/image-1.webp",
      position: 0,
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    expect(upload).toHaveBeenCalledWith(
      "owner-1/listing-1/image-1.webp",
      canonicalFile,
      {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      },
    );
    expect(rpc).toHaveBeenCalledWith("register_listing_image", {
      p_listing_id: "listing-1",
      p_storage_key: "owner-1/listing-1/image-1.webp",
    });
  });
});
