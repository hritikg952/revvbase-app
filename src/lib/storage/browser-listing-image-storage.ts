"use client";

import { getSupabaseBrowserClient } from "../supabase";
import { invokeListingImageLifecycle } from "../listing-image-lifecycle-client";
import type { ListingImageStorage } from "./listing-image-storage";
import {
  createSupabaseListingImageStorage,
  type SupabaseListingImagesClient,
} from "./supabase-listing-images";

export function createBrowserListingImageStorage(): ListingImageStorage {
  return createSupabaseListingImageStorage({
    client:
      getSupabaseBrowserClient() as unknown as SupabaseListingImagesClient,
    compensateUpload: invokeListingImageLifecycle,
    reserveUploadCleanup: invokeListingImageLifecycle,
  });
}
