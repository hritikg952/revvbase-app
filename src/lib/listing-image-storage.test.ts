import { describe, expect, it, vi } from "vitest";
import { isListingStatus } from "./database.types";
import { emptyListingForm, toListingPayload } from "./listings";
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

  it("lists owner-visible metadata in cover order with stable public URLs", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "metadata-1",
          listing_id: "listing-1",
          storage_key: "owner-1/listing-1/cover.webp",
          position: 0,
          created_at: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "metadata-2",
          listing_id: "listing-1",
          storage_key: "owner-1/listing-1/second.webp",
          position: 1,
          created_at: "2026-08-01T00:01:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const getPublicUrl = vi.fn((storageKey: string) => ({
      data: { publicUrl: `https://cdn.example/${storageKey}` },
    }));
    const client = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn(),
          getPublicUrl,
        }),
      },
      from,
      rpc: vi.fn(),
    };
    const storage = createSupabaseListingImageStorage({ client });

    await expect(storage.list("listing-1")).resolves.toEqual([
      expect.objectContaining({
        id: "metadata-1",
        position: 0,
        publicUrl:
          "https://cdn.example/owner-1/listing-1/cover.webp",
      }),
      expect.objectContaining({
        id: "metadata-2",
        position: 1,
        publicUrl:
          "https://cdn.example/owner-1/listing-1/second.webp",
      }),
    ]);
    expect(from).toHaveBeenCalledWith("listing_images");
    expect(select).toHaveBeenCalledWith(
      "id, listing_id, storage_key, position, created_at",
    );
    expect(eq).toHaveBeenCalledWith("listing_id", "listing-1");
    expect(order).toHaveBeenCalledWith("position", { ascending: true });
  });
});

describe("draft listing lifecycle contract", () => {
  it("creates every browser-authored listing as a draft", () => {
    const payload = toListingPayload(
      {
        ...emptyListingForm,
        make: "Honda",
        model: "Activa 6G",
        year: "2023",
        odometer_km: "4500",
        price_inr: "85000",
        city: "Pune",
      },
      "owner-1",
    );

    expect(payload.status).toBe("draft");
  });

  it("keeps draft, active, and deleted as distinct persisted states", () => {
    expect(["draft", "active", "deleted"].map(isListingStatus)).toEqual([
      true,
      true,
      true,
    ]);
    expect(isListingStatus("published")).toBe(false);
  });
});
