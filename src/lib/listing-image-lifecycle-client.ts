import { getSupabaseBrowserClient } from "./supabase";

export interface PublishListingAction {
  action: "publish";
  listingId: string;
}

export interface DeleteListingImageAction {
  action: "delete-image";
  listingId: string;
  imageId: string;
  storageKey: string;
}

export interface DeleteListingAction {
  action: "delete-listing";
  listingId: string;
}

export interface CompensateListingImageUploadAction {
  action: "compensate-upload";
  listingId: string;
  storageKey: string;
}

export type ListingImageLifecycleAction =
  | PublishListingAction
  | DeleteListingImageAction
  | DeleteListingAction
  | CompensateListingImageUploadAction;
export type ListingLifecycleStatus = "draft" | "active" | "deleted";

export interface ListingImageLifecycleResult {
  action: ListingImageLifecycleAction["action"];
  listingId: string;
  status: ListingLifecycleStatus;
}

interface LifecycleErrorPayload {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    listingStatus?: ListingLifecycleStatus;
  };
}

interface LifecycleFunctionsClient {
  functions: {
    invoke(
      functionName: "listing-image-cleanup",
      options: { body: ListingImageLifecycleAction },
    ): Promise<{
      data: ListingImageLifecycleResult | LifecycleErrorPayload | null;
      error: {
        message?: string;
        context?: { json(): Promise<unknown> };
      } | null;
    }>;
  };
}

function isLifecycleErrorPayload(
  value: unknown,
): value is LifecycleErrorPayload {
  return typeof value === "object" && value !== null && "error" in value;
}

export class ListingImageLifecycleClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly listingStatus?: ListingLifecycleStatus,
  ) {
    super(message);
    this.name = "ListingImageLifecycleClientError";
  }
}

export async function invokeListingImageLifecycle(
  action: ListingImageLifecycleAction,
  client: LifecycleFunctionsClient = getSupabaseBrowserClient(),
): Promise<ListingImageLifecycleResult> {
  const { data, error } = await client.functions.invoke(
    "listing-image-cleanup",
    { body: action },
  );
  let errorPayload = data && isLifecycleErrorPayload(data)
    ? data.error
    : undefined;

  if (!errorPayload && error?.context) {
    try {
      const contextData = await error.context.json();
      errorPayload = isLifecycleErrorPayload(contextData)
        ? contextData.error
        : undefined;
    } catch {
      // Preserve the SDK error below when the non-2xx body is not JSON.
    }
  }

  if (error || errorPayload || !data || isLifecycleErrorPayload(data)) {
    throw new ListingImageLifecycleClientError(
      errorPayload?.code ?? "request_failed",
      errorPayload?.message ??
        error?.message ??
        "The listing photo request could not be completed.",
      errorPayload?.retryable ?? true,
      errorPayload?.listingStatus,
    );
  }

  return data;
}
