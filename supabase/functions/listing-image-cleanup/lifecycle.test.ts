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
}

function createFixture({
  imagesRequired,
  imageCount = 0,
  listing = { id: LISTING_ID, sellerId: OWNER_ID, status: "draft" },
}: FixtureOptions) {
  const events: string[] = [];
  let currentListing = listing;

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
      return imageCount;
    },
    async transitionListingStatus({ expectedStatus, nextStatus }) {
      events.push(`transition:${expectedStatus}->${nextStatus}`);
      assert.ok(currentListing);
      assert.equal(currentListing.status, expectedStatus);
      currentListing = { ...currentListing, status: nextStatus };
      return currentListing;
    },
  };

  const storage: LifecycleStorage = {
    async remove() {
      throw new Error("publish must not access Storage");
    },
  };

  return {
    events,
    lifecycle: createListingImageLifecycle({ database, storage }),
    listing: () => currentListing,
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
