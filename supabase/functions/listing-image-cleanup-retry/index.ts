// @ts-nocheck -- Supabase type-checks this Deno entrypoint in its Edge runtime.
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

import { createCleanupRetryConsumer } from "../listing-image-cleanup/lifecycle.ts";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST." }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supabaseUrl || !serviceRoleKey || bearer !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const consumer = createCleanupRetryConsumer({
    database: {
      async claimCleanupJobs({ limit }) {
        const { data, error } = await admin.rpc(
          "claim_listing_image_cleanup_jobs",
          { p_limit: limit },
        );
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.cleanup_job_id,
          storageKey: row.cleanup_storage_key,
        }));
      },
      async completeCleanupJob(jobId) {
        const { error } = await admin.rpc("complete_listing_image_cleanup", {
          p_job_id: jobId,
        });
        if (error) throw error;
      },
      async failCleanupJob(jobId, message) {
        const { error } = await admin.rpc("fail_listing_image_cleanup", {
          p_job_id: jobId,
          p_error: message,
        });
        if (error) throw error;
      },
    },
    storage: {
      async remove(storageKeys) {
        const { error } = await admin.storage.from("listing-images").remove(storageKeys);
        if (error) throw error;
      },
    },
  });

  try {
    const result = await consumer.run({ limit: 20 });
    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (error) {
    console.error("listing-image-cleanup-retry failed", error);
    return new Response(JSON.stringify({ error: "Cleanup retry failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
