// @ts-nocheck -- Supabase type-checks this Deno entrypoint in its Edge runtime.
import { corsHeaders } from "npm:@supabase/supabase-js@2.111.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

import {
  LifecycleError,
  createListingImageLifecycle,
  parseListingImageLifecycleAction,
  type LifecycleDatabase,
  type ListingLifecycleStatus,
} from "./lifecycle.ts";

const JSON_HEADERS = {
  ...corsHeaders,
  "content-type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function createDatabase(client: ReturnType<typeof createClient>): LifecycleDatabase {
  return {
    async getOwnedListing(userId, listingId) {
      const { data, error } = await client
        .from("listings")
        .select("id, seller_id, status")
        .eq("id", listingId)
        .eq("seller_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            id: data.id,
            sellerId: data.seller_id,
            status: data.status as ListingLifecycleStatus,
          }
        : null;
    },

    async getImagesRequired() {
      const { data, error } = await client
        .from("listing_image_policy")
        .select("images_required")
        .eq("singleton", true)
        .single();
      if (error || !data) throw error ?? new Error("Image policy is missing.");
      return data.images_required;
    },

    async countImages(listingId) {
      const { count, error } = await client
        .from("listing_images")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);
      if (error || count === null) throw error ?? new Error("Image count failed.");
      return count;
    },

    async transitionListingStatus({
      userId,
      listingId,
      expectedStatus,
      nextStatus,
    }) {
      const { data, error } = await client
        .from("listings")
        .update({ status: nextStatus })
        .eq("id", listingId)
        .eq("seller_id", userId)
        .eq("status", expectedStatus)
        .select("id, seller_id, status")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new LifecycleError(
          "conflict",
          "The listing changed while the request was running. Please try again.",
          409,
          true,
          expectedStatus,
        );
      }
      return {
        id: data.id,
        sellerId: data.seller_id,
        status: data.status as ListingLifecycleStatus,
      };
    },

    async getImage(listingId, imageId) {
      const { data, error } = await client
        .from("listing_images")
        .select("id, listing_id, storage_key, position")
        .eq("id", imageId)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            id: data.id,
            listingId: data.listing_id,
            storageKey: data.storage_key,
            position: data.position,
          }
        : null;
    },

    async getImageByStorageKey(listingId, storageKey) {
      const { data, error } = await client
        .from("listing_images")
        .select("id, listing_id, storage_key, position")
        .eq("listing_id", listingId)
        .eq("storage_key", storageKey)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            id: data.id,
            listingId: data.listing_id,
            storageKey: data.storage_key,
            position: data.position,
          }
        : null;
    },

    async listImages(listingId) {
      const { data, error } = await client
        .from("listing_images")
        .select("id, listing_id, storage_key, position")
        .eq("listing_id", listingId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((image) => ({
        id: image.id,
        listingId: image.listing_id,
        storageKey: image.storage_key,
        position: image.position,
      }));
    },

    async deleteImageMetadata(listingId, imageId) {
      const { error } = await client
        .from("listing_images")
        .delete()
        .eq("id", imageId)
        .eq("listing_id", listingId);
      if (error) throw error;
    },

    async deleteListingImageMetadata(listingId) {
      const { error } = await client
        .from("listing_images")
        .delete()
        .eq("listing_id", listingId);
      if (error) throw error;
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Use POST." } }, 405);
  }

  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return json(
        { error: { code: "unauthorized", message: "Authentication is required." } },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("The lifecycle function is not configured.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return json(
        { error: { code: "unauthorized", message: "The session is invalid." } },
        401,
      );
    }

    const action = parseListingImageLifecycleAction(await request.json());
    const lifecycle = createListingImageLifecycle({
      database: createDatabase(admin),
      storage: {
        async remove(storageKeys) {
          const { error } = await admin.storage
            .from("listing-images")
            .remove(storageKeys);
          if (error) throw error;
        },
      },
    });

    return json(await lifecycle.execute(authData.user.id, action));
  } catch (error) {
    if (error instanceof LifecycleError) {
      return json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            listingStatus: error.listingStatus,
          },
        },
        error.status,
      );
    }

    console.error("listing-image-cleanup failed", error);
    return json(
      {
        error: {
          code: "internal_error",
          message: "The listing photo request could not be completed.",
          retryable: true,
        },
      },
      500,
    );
  }
});
