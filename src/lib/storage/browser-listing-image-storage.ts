"use client";

import { getSupabaseBrowserClient } from "../supabase";
import type { ListingImageStorage } from "./listing-image-storage";
import {
  createSupabaseListingImageStorage,
  type SupabaseListingImagesClient,
} from "./supabase-listing-images";

export function createBrowserListingImageStorage(): ListingImageStorage {
  return createSupabaseListingImageStorage({
    client:
      getSupabaseBrowserClient() as unknown as SupabaseListingImagesClient,
  });
}
