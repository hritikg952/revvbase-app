// @ts-nocheck -- This test is type-checked and executed by Deno, not Next.js.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LifecycleError,
  createCleanupRetryConsumer,
  createListingImageLifecycle,
  parseListingImageLifecycleAction,
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
  const pendingCleanup: Array<{ id: string; storageKey: string }> = [];

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
    async reserveImageDeletion({ userId, listingId, imageId, storageKey }) {
      events.push(`reserve-image-deletion:${listingId}:${imageId}`);
      const image = currentImages.find(
        (candidate) => candidate.listingId === listingId && candidate.id === imageId,
      );
      if (!image || image.storageKey !== storageKey || currentListing?.sellerId !== userId) {
        throw new LifecycleError(
          "image_binding_mismatch",
          "The photo does not belong to this listing.",
          403,
        );
      }
      if (imagesRequired && currentListing?.status === "active" && currentImages.length === 1) {
        currentListing = { ...currentListing, status: "draft" };
      }
      currentImages = currentImages.filter((candidate) => candidate.id !== imageId);
      const job = { id: `job-${image.id}`, storageKey: image.storageKey };
      pendingCleanup.push(job);
      return { status: currentListing?.status ?? "deleted", jobs: [job] };
    },
    async reserveListingDeletion({ userId, listingId }) {
      events.push(`reserve-listing-deletion:${listingId}`);
      assert.equal(currentListing?.sellerId, userId);
      const jobs = currentImages.map((image) => ({
        id: `job-${image.id}`,
        storageKey: image.storageKey,
      }));
      pendingCleanup.push(...jobs);
      currentImages = [];
      assert.ok(currentListing);
      currentListing = { ...currentListing, status: "deleted" };
      return { status: "deleted", jobs };
    },
    async reserveUploadCleanup({ userId, listingId, storageKey }) {
      events.push(`reserve-upload-cleanup:${listingId}:${storageKey}`);
      assert.equal(currentListing?.sellerId, userId);
      const job = { id: `job-${storageKey}`, storageKey };
      pendingCleanup.push(job);
      return { status: currentListing?.status ?? "deleted", jobs: [job] };
    },
    async completeCleanupJob(jobId) {
      events.push(`complete-cleanup:${jobId}`);
      const index = pendingCleanup.findIndex((job) => job.id === jobId);
      if (index >= 0) pendingCleanup.splice(index, 1);
    },
    async failCleanupJob(jobId) {
      events.push(`fail-cleanup:${jobId}`);
    },
    async publishListing({ userId, listingId }) {
      events.push(`publish-listing:${listingId}`);
      assert.equal(currentListing?.sellerId, userId);
      const requiredWithoutImage = imagesRequired &&
        (imageCount ?? currentImages.length) === 0;
      if (!requiredWithoutImage) {
        assert.ok(currentListing);
        currentListing = { ...currentListing, status: "active" };
      }
      return {
        status: currentListing?.status ?? "deleted",
        imageRequired: requiredWithoutImage,
      };
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
    pendingCleanup: () => pendingCleanup,
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
    `publish-listing:${LISTING_ID}`,
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

test("accepts only fixed action fields and rejects browser policy overrides", () => {
  assert.deepEqual(
    parseListingImageLifecycleAction({
      action: "publish",
      listingId: LISTING_ID,
    }),
    { action: "publish", listingId: LISTING_ID },
  );

  assert.throws(
    () =>
      parseListingImageLifecycleAction({
        action: "publish",
        listingId: LISTING_ID,
        imagesRequired: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "invalid_request");
      assert.equal(error.status, 400);
      return true;
    },
  );
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

test("removes a non-final image after its metadata is durably reserved", async () => {
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
    fixture.events.indexOf(`reserve-image-deletion:${LISTING_ID}:${IMAGE_TWO.id}`) <
      fixture.events.indexOf(`remove-objects:${IMAGE_TWO.storageKey}`),
  );
  assert.ok(!fixture.events.some((event) => event.startsWith("transition:")));
});

test("atomically reserves metadata removal before deleting the storage object", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE, IMAGE_TWO],
  });

  await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-image",
    listingId: LISTING_ID,
    imageId: IMAGE_TWO.id,
    storageKey: IMAGE_TWO.storageKey,
  });

  const reservation = fixture.events.indexOf(
    `reserve-image-deletion:${LISTING_ID}:${IMAGE_TWO.id}`,
  );
  const objectRemoval = fixture.events.indexOf(
    `remove-objects:${IMAGE_TWO.storageKey}`,
  );
  assert.ok(reservation >= 0);
  assert.ok(reservation < objectRemoval);
  assert.deepEqual(fixture.pendingCleanup(), []);
});

test("serializes concurrent required-photo deletions and preserves the draft invariant", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE, IMAGE_TWO],
  });

  const results = await Promise.all([
    fixture.lifecycle.execute(OWNER_ID, {
      action: "delete-image",
      listingId: LISTING_ID,
      imageId: IMAGE_ONE.id,
      storageKey: IMAGE_ONE.storageKey,
    }),
    fixture.lifecycle.execute(OWNER_ID, {
      action: "delete-image",
      listingId: LISTING_ID,
      imageId: IMAGE_TWO.id,
      storageKey: IMAGE_TWO.storageKey,
    }),
  ]);

  assert.equal(fixture.listing()?.status, "draft");
  assert.deepEqual(fixture.images(), []);
  assert.ok(results.some((result) => result.status === "draft"));
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
  const reservation = fixture.events.indexOf(
    `reserve-image-deletion:${LISTING_ID}:${IMAGE_ONE.id}`,
  );
  const objectRemoval = fixture.events.indexOf(
    `remove-objects:${IMAGE_ONE.storageKey}`,
  );
  assert.ok(reservation < objectRemoval);
});

test("keeps durable cleanup pending when final-image object removal fails", async () => {
  const fixture = createFixture({
    imagesRequired: true,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE],
    failStorageRemoval: true,
  });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-image",
    listingId: LISTING_ID,
    imageId: IMAGE_ONE.id,
    storageKey: IMAGE_ONE.storageKey,
  });

  assert.deepEqual(result, {
    action: "delete-image",
    listingId: LISTING_ID,
    status: "draft",
    cleanupPending: true,
  });
  assert.equal(fixture.listing()?.status, "draft");
  assert.deepEqual(fixture.images(), []);
  assert.deepEqual(fixture.pendingCleanup(), [
    { id: `job-${IMAGE_ONE.id}`, storageKey: IMAGE_ONE.storageKey },
  ]);
});

test("marks the listing deleted and reserves every object before cleanup", async () => {
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
  const reservation = fixture.events.indexOf(`reserve-listing-deletion:${LISTING_ID}`);
  assert.ok(reservation < fixture.events.indexOf(`remove-objects:${IMAGE_ONE.storageKey}`));
  assert.ok(reservation < fixture.events.indexOf(`remove-objects:${IMAGE_TWO.storageKey}`));
});

test("keeps a deleted listing hidden while failed object cleanup remains durable", async () => {
  const fixture = createFixture({
    imagesRequired: false,
    listing: { id: LISTING_ID, sellerId: OWNER_ID, status: "active" },
    images: [IMAGE_ONE],
    failStorageRemoval: true,
  });

  const result = await fixture.lifecycle.execute(OWNER_ID, {
    action: "delete-listing",
    listingId: LISTING_ID,
  });

  assert.equal(result.status, "deleted");
  assert.equal(result.cleanupPending, true);
  assert.equal(fixture.listing()?.status, "deleted");
  assert.deepEqual(fixture.images(), []);
  assert.deepEqual(fixture.pendingCleanup(), [
    { id: `job-${IMAGE_ONE.id}`, storageKey: IMAGE_ONE.storageKey },
  ]);
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

test("does not let compensation delete an object with registered metadata", async () => {
  const fixture = createFixture({
    imagesRequired: false,
    images: [IMAGE_ONE],
  });

  await assert.rejects(
    fixture.lifecycle.execute(OWNER_ID, {
      action: "compensate-upload",
      listingId: LISTING_ID,
      storageKey: IMAGE_ONE.storageKey,
    }),
    (error: unknown) => {
      assert.ok(error instanceof LifecycleError);
      assert.equal(error.code, "image_binding_mismatch");
      return true;
    },
  );
  assert.ok(!fixture.events.some((event) => event.startsWith("remove-objects:")));
});

test("retries a durable cleanup job and completes it after a transient storage failure", async () => {
  const events: string[] = [];
  const job = { id: "job-1", storageKey: IMAGE_ONE.storageKey };
  let attempt = 0;
  let completed = false;
  const consumer = createCleanupRetryConsumer({
    database: {
      async claimCleanupJobs() {
        events.push("claim");
        return completed ? [] : [job];
      },
      async completeCleanupJob(jobId: string) {
        events.push(`complete:${jobId}`);
        completed = true;
      },
      async failCleanupJob(jobId: string) {
        events.push(`fail:${jobId}`);
      },
    },
    storage: {
      async remove(storageKeys: string[]) {
        attempt += 1;
        events.push(`remove:${storageKeys.join(",")}`);
        if (attempt === 1) throw new Error("temporary provider failure");
      },
    },
  });

  await assert.doesNotReject(consumer.run({ limit: 10 }));
  assert.equal(completed, false);
  await assert.doesNotReject(consumer.run({ limit: 10 }));
  assert.equal(completed, true);
  assert.deepEqual(events, [
    "claim",
    `remove:${IMAGE_ONE.storageKey}`,
    "fail:job-1",
    "claim",
    `remove:${IMAGE_ONE.storageKey}`,
    "complete:job-1",
  ]);
});

test("does not remove a reserved upload until a failed registration activates cleanup", async () => {
  const fixture = createFixture({ imagesRequired: false });
  const storageKey = `${OWNER_ID}/${LISTING_ID}/64000000-0000-4000-8000-000000000099.webp`;

  const reserved = await fixture.lifecycle.execute(OWNER_ID, {
    action: "reserve-upload-cleanup",
    listingId: LISTING_ID,
    storageKey,
  });

  assert.equal(reserved.cleanupPending, true);
  assert.ok(!fixture.events.some((event) => event.startsWith("remove-objects:")));

  await fixture.lifecycle.execute(OWNER_ID, {
    action: "compensate-upload",
    listingId: LISTING_ID,
    storageKey,
  });
  assert.ok(fixture.events.some((event) => event === `remove-objects:${storageKey}`));
});
