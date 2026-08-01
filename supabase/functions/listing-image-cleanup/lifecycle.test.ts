// @ts-nocheck -- This test is type-checked and executed by Deno, not Next.js.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LifecycleError,
  createListingImageLifecycle,
  type LifecycleDatabase,
  type LifecycleListing,
  type LifecycleStorage,
} from "./lifecycle.ts";

const OWNER_ID = "61000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "61000000-0000-4000-8000-000000000002";
const LISTING_ID = "62000000-0000-4000-8000-000000000001";

interface FixtureOptions {
  imagesRequired: boolean;
  imageCount?: number;
  listing?: LifecycleListing | null;
  images?: Array<{
    id: string;
    listingId: string;
    storageKey: string;
    position: number;
  }>;
  failStorageRemoval?: boolean;
  failMetadataRemoval?: boolean;
}

function createFixture({
  imagesRequired,
  imageCount,
  listing = { id: LISTING_ID, sellerId: OWNER_ID, status: "draft" },
  images = [],
  failStorageRemoval = false,
  failMetadataRemoval = false,
}: FixtureOptions) {
  const events: string[] = [];
  let currentListing = listing;
  let currentImages = [...images];

  const database: LifecycleDatabase = {
    async getOwnedListing(userId, listingId) {
      events.push(`get-owned-listing:${userId}:${listingId}`);
      return currentListing?.sellerId === userId && currentListing.id === listingId
        ? currentListing
        : null;
    },
    async getImagesRequired() {
      events.push("get-images-required");
      return imagesRequired;
    },
    async countImages(listingId) {
      events.push(`count-images:${listingId}`);
      return imageCount ?? currentImages.length;
    },
    async transitionListingStatus({ expectedStatus, nextStatus }) {
      events.push(`transition:${expectedStatus}->${nextStatus}`);
      assert.ok(currentListing);
      assert.equal(currentListing.status, expectedStatus);
      currentListing = { ...currentListing, status: nextStatus };
      return currentListing;
    },
    async getImage(listingId, imageId) {
      events.push(`get-image:${listingId}:${imageId}`);
      return currentImages.find(
        (image) => image.listingId === listingId && image.id === imageId,
      ) ?? null;
    },
    async getImageByStorageKey(listingId, storageKey) {
      events.push(`get-image-by-key:${listingId}:${storageKey}`);
      return currentImages.find(
        (image) => image.listingId === listingId && image.storageKey === storageKey,
      ) ?? null;
    },
    async listImages(listingId) {
      events.push(`list-images:${listingId}`);
      return currentImages.filter((image) => image.listingId === listingId);
    },
    async deleteImageMetadata(listingId, imageId) {
      events.push(`delete-metadata:${listingId}:${imageId}`);
      if (failMetadataRemoval) throw new Error("metadata removal failed");
      currentImages = currentImages.filter(
        (image) => image.listingId !== listingId || image.id !== imageId,
      );
    },
    async deleteListingImageMetadata(listingId) {
      events.push(`delete-listing-metadata:${listingId}`);
      if (failMetadataRemoval) throw new Error("metadata removal failed");
      currentImages = currentImages.filter(
        (image) => image.listingId !== listingId,
      );
    },
  };

  const storage: LifecycleStorage = {
    async remove(storageKeys) {
      events.push(`remove-objects:${storageKeys.join(",")}`);
      if (failStorageRemoval) throw new Error("storage removal failed");
    },
  };

  return {
    events,
    lifecycle: createListingImageLifecycle({ database, storage }),
    listing: () => currentListing,
    images: () => currentImages,
  };
}

test("publishes an owned zero-image draft when the server policy is optional", async () => {
  const fixture = createFixture({ imagesRequired: false });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "publish",
    listingId: LISTING_ID,
  });

  assert.deepEqual(result, {
    action: "publish",
    listingId: LISTING_ID,
    status: "active",
  });
  assert.equal(fixture.listing()?.status, "active");
  assert.deepEqual(fixture.events, [
    `get-owned-listing:${OWNER_ID}:${LISTING_ID}`,
    "get-images-required",
    `count-images:${LISTING_ID}`,
    "transition:draft->active",
  ]);
});

test("keeps a required-image zero-photo listing draft with a typed precondition error", async () => {
  const fixture = createFixture({ imagesRequired: true });

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "publish",
      listingId: LISTING_ID,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "image_required");
      assert.equal(error.status, 409);
      assert.equal(error.listingStatus, "draft");
      assert.equal(error.retryable, false);
      return true;
    },
  );
  assert.equal(fixture.listing()?.status, "draft");
  assert.ok(!fixture.events.includes("transition:draft->active"));
});

test("publishes a required-image draft after one persisted image exists", async () => {
  const fixture = createFixture({ imagesRequired: true, imageCount: 1 });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "publish",
    listingId: LISTING_ID,
  });

  assert.equal(result.status, "active");
  assert.equal(fixture.listing()?.status, "active");
});

test("rejects a non-owner before reading policy or image metadata", async () => {
  const fixture = createFixture({ imagesRequired: false });

  await assert.rejects(
    fixture.lifecycle.execute(OTHER_USER_ID, {
      action: "publish",
      listingId: LISTING_ID,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "forbidden");
      assert.equal(error.status, 403);
      return true;
    },
  );
  assert.deepEqual(fixture.events, [
    `get-owned-listing:${OTHER_USER_ID}:${LISTING_ID}`,
  ]);
});

const IMAGE_ONE = {
  id: "63000000-0000-4000-8000-000000000001",
  listingId: LISTING_ID,
  storageKey:
    `${OWNER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000001.webp`,
  position: 0,
};

const IMAGE_TWO = {
  id: "63000000-0000-4000-8000-000000000002",
  listingId: LISTING_ID,
  storageKey:
    `${OWNER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000002.webp`,
  position: 1,
};

test("removes a non-final image object before its metadata", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE, IMAGE_TWO],
  });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-image",
    listingId: LISTING_ID,
    imageId: IMAGE_TWO.id,
    storageKey: IMAGE_TWO.storageKey,
  });

  assert.equal(result.status, "active");
  assert.deepEqual(fixture.images(), [IMAGE_ONE]);
  assert.ok(
    fixture.events.indexOf(`remove-objects:${IMAGE_TWO.storageKey}`) <
      fixture.events.indexOf(`delete-metadata:${LISTING_ID}:${IMAGE_TWO.id}`),
  );
  assert.ok(!fixture.events.some((event) => event.startsWith("transition:")));
});

test("moves an active required listing to draft before removing its final image", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE],
  });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-image",
    listingId: LISTING_ID,
    imageId: IMAGE_ONE.id,
    storageKey: IMAGE_ONE.storageKey,
  });

  assert.equal(result.status, "draft");
  assert.equal(fixture.listing()?.status, "draft");
  assert.deepEqual(fixture.images(), []);
  const transition = fixture.events.indexOf("transition:active->draft");
  const objectRemoval = fixture.events.indexOf(
    `remove-objects:${IMAGE_ONE.storageKey}`,
  );
  const metadataRemoval = fixture.events.indexOf(
    `delete-metadata:${LISTING_ID}:${IMAGE_ONE.id}`,
  );
  assert.ok(transition < objectRemoval && objectRemoval < metadataRemoval);
});

test("keeps retryable metadata and draft status when final-image object removal fails", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE],
    failStorageRemoval: true,
  });

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "delete-image",
      listingId: LISTING_ID,
      imageId: IMAGE_ONE.id,
      storageKey: IMAGE_ONE.storageKey,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "storage_remove_failed");
      assert.equal(error.retryable, true);
      assert.equal(error.listingStatus, "draft");
      return true;
    },
  );

  assert.equal(fixture.listing()?.status, "draft");
  assert.deepEqual(fixture.images(), [IMAGE_ONE]);
  assert.ok(!fixture.events.some((event) => event.startsWith("delete-metadata:")));
});

test("removes every listing object, then metadata, then marks the row deleted", async () => {
  const fixture = createFixture({
    imagesRequired: false,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE, IMAGE_TWO],
  });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-listing",
    listingId: LISTING_ID,
  });

  assert.equal(result.status, "deleted");
  assert.deepEqual(fixture.images(), []);
  const objects = fixture.events.indexOf(
    `remove-objects:${IMAGE_ONE.storageKey},${IMAGE_TWO.storageKey}`,
  );
  const metadata = fixture.events.indexOf(
    `delete-listing-metadata:${LISTING_ID}`,
  );
  const status = fixture.events.indexOf("transition:active->deleted");
  assert.ok(objects < metadata && metadata < status);
});

test("preserves listing status and metadata when listing object cleanup fails", async () => {
  const fixture = createFixture({
    imagesRequired: false,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE],
    failStorageRemoval: true,
  });

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "delete-listing",
      listingId: LISTING_ID,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "storage_remove_failed");
      assert.equal(error.retryable, true);
      assert.equal(error.listingStatus, "active");
      return true;
    },
  );

  assert.equal(fixture.listing()?.status, "active");
  assert.deepEqual(fixture.images(), [IMAGE_ONE]);
  assert.ok(!fixture.events.includes(`delete-listing-metadata:${LISTING_ID}`));
  assert.ok(!fixture.events.includes("transition:active->deleted"));
});

test("rejects a forged storage key without removing the authoritative image", async () => {
  const fixture = createFixture({
    imagesRequired: false,
    images: [IMAGE_ONE],
  });

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "delete-image",
      listingId: LISTING_ID,
      imageId: IMAGE_ONE.id,
      storageKey: `${OTHER_USER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000099.webp`,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "image_binding_mismatch");
      return true;
    },
  );
  assert.ok(!fixture.events.some((event) => event.startsWith("remove-objects:")));
  assert.deepEqual(fixture.images(), [IMAGE_ONE]);
});

test("compensates only an unregistered canonical key bound to the owner listing", async () => {
  const fixture = createFixture({ imagesRequired: false });
  const orphanKey =
    `${OWNER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000099.webp`;

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "compensate-upload",
    listingId: LISTING_ID,
    storageKey: orphanKey,
  });

  assert.equal(result.status, "draft");
  assert.ok(fixture.events.includes(`remove-objects:${orphanKey}`));

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "compensate-upload",
      listingId: LISTING_ID,
      storageKey: `${OTHER_USER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000099.webp`,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "image_binding_mismatch");
      return true;
    },
  );
});
