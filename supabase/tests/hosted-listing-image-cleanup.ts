// @ts-nocheck -- Executed by Deno against the explicitly linked hosted test project.
const env = (name: string): string | undefined =>
  globalThis.Deno?.env.get(name) ?? globalThis.process?.env?.[name];

const url = env("SUPABASE_URL");
const publishableKey = env("SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const runId = crypto.randomUUID();
const password = `Images-${runId.slice(0, 8)}-Aa1!`;
const createdUsers: string[] = [];
const createdStorageKeys: string[] = [];

interface RequestOptions {
  method?: string;
  key?: string;
  token?: string;
  body?: unknown;
  rawBody?: BodyInit;
  headers?: Record<string, string>;
}

async function request(path: string, {
  method = "GET",
  key = publishableKey,
  token,
  body,
  rawBody,
  headers = {},
}: RequestOptions = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token || key === serviceRoleKey
        ? { Authorization: `Bearer ${token ?? key}` }
        : {}),
      ...(rawBody ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const responseText = await response.text();
  let data: unknown = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }
  return { response, data };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function createUser(label: string) {
  const email = `images-${label}-${runId}@revvbase.test`;
  const created = await request("/auth/v1/admin/users", {
    method: "POST",
    key: serviceRoleKey,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Images ${label}` },
    },
  });
  assert(
    created.response.ok && typeof created.data?.id === "string",
    `Could not create ${label} (${created.response.status}).`,
  );
  createdUsers.push(created.data.id);
  return { id: created.data.id, email };
}

async function signIn(email: string) {
  const signedIn = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  assert(
    signedIn.response.ok && typeof signedIn.data?.access_token === "string",
    `Could not sign in ${email} (${signedIn.response.status}).`,
  );
  return signedIn.data.access_token;
}

async function setRequiredPolicy(required: boolean) {
  const updated = await request(
    "/rest/v1/listing_image_policy?singleton=eq.true",
    {
      method: "PATCH",
      key: serviceRoleKey,
      body: { images_required: required },
      headers: { Prefer: "return=representation" },
    },
  );
  assert(
    updated.response.ok && updated.data?.[0]?.images_required === required,
    `Could not apply required=${required} policy fixture.`,
  );
}

async function createDraft(token: string, sellerId: string, label: string) {
  const created = await request("/rest/v1/listings?select=id,status,seller_id", {
    method: "POST",
    token,
    body: {
      seller_id: sellerId,
      vehicle_type: "motorcycle",
      make: "Lifecycle",
      model: label,
      year: 2024,
      odometer_km: 100,
      price_inr: 100000,
      city: "Pune",
      fuel_type: "petrol",
      previous_owners: 1,
    },
    headers: { Prefer: "return=representation" },
  });
  assert(
    created.response.ok && created.data?.[0]?.status === "draft",
    `Could not create draft fixture ${label}.`,
  );
  return created.data[0].id as string;
}

async function invoke(token: string, body: Record<string, unknown>) {
  return request("/functions/v1/listing-image-cleanup", {
    method: "POST",
    token,
    body,
  });
}

// A tiny RIFF/WEBP payload is sufficient for Storage MIME/size enforcement.
const canonicalWebp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  0x00, 0x00, 0x00, 0x00,
]);

async function uploadAndRegister(
  token: string,
  ownerId: string,
  listingId: string,
) {
  const storageKey = `${ownerId}/${listingId}/${crypto.randomUUID()}.webp`;
  const upload = await request(
    `/storage/v1/object/listing-images/${storageKey}`,
    {
      method: "POST",
      token,
      rawBody: canonicalWebp,
      headers: { "Content-Type": "image/webp", "x-upsert": "false" },
    },
  );
  assert(upload.response.ok, `Could not upload ${storageKey}.`);
  createdStorageKeys.push(storageKey);

  const registered = await request("/rest/v1/rpc/register_listing_image", {
    method: "POST",
    token,
    body: { p_listing_id: listingId, p_storage_key: storageKey },
  });
  assert(
    registered.response.ok && typeof registered.data?.id === "string",
    `Could not register ${storageKey}.`,
  );
  return { storageKey, imageId: registered.data.id as string };
}

async function assertObjectEventuallyMissing(storageKey: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const publicRead = await fetch(
      `${url}/storage/v1/object/public/listing-images/${storageKey}?cleanup-check=${Date.now()}-${attempt}`,
      { cache: "no-store" },
    );
    if (publicRead.status === 400 || publicRead.status === 404) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Deleted object remained publicly readable: ${storageKey}`);
}

async function assertPublicObjectAvailable(storageKey: string, message: string) {
  const publicRead = await fetch(
    `${url}/storage/v1/object/public/listing-images/${storageKey}?availability-check=${Date.now()}`,
    { cache: "no-store" },
  );
  assert(publicRead.ok, message);
}

async function assertDirectStatusDenied(
  token: string,
  listingId: string,
  status: "draft" | "active" | "deleted",
) {
  const directStatus = await request(`/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    token,
    body: { status },
    headers: { Prefer: "return=representation" },
  });
  assert(
    !directStatus.response.ok,
    `Direct browser status transition to ${status} succeeded.`,
  );
}

async function cleanup() {
  if (createdStorageKeys.length > 0) {
    await request("/storage/v1/object/listing-images", {
      method: "DELETE",
      key: serviceRoleKey,
      body: { prefixes: createdStorageKeys },
    });
  }
  for (const userId of createdUsers) {
    await request(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      key: serviceRoleKey,
    });
  }
  await setRequiredPolicy(false);
}

try {
  const owner = await createUser("owner");
  const other = await createUser("other");
  const ownerToken = await signIn(owner.email);
  const otherToken = await signIn(other.email);

  const missingJwt = await request("/functions/v1/listing-image-cleanup", {
    method: "POST",
    body: { action: "publish", listingId: crypto.randomUUID() },
  });
  const invalidJwt = await invoke("not-a-valid-jwt", {
    action: "publish",
    listingId: crypto.randomUUID(),
  });
  assert(missingJwt.response.status === 401, "Missing JWT was not rejected.");
  assert(invalidJwt.response.status === 401, "Invalid JWT was not rejected.");

  await setRequiredPolicy(false);
  const optionalDraft = await createDraft(ownerToken, owner.id, "Optional");

  const ownerDraft = await request(
    `/rest/v1/listings?id=eq.${optionalDraft}&select=id,status`,
    { token: ownerToken },
  );

  const anonymousDraft = await request(
    `/rest/v1/listings?id=eq.${optionalDraft}&select=id`,
  );
  const otherDraft = await request(
    `/rest/v1/listings?id=eq.${optionalDraft}&select=id`,
    { token: otherToken },
  );
  assert(anonymousDraft.data?.length === 0, "Anonymous draft listing leaked.");
  assert(otherDraft.data?.length === 0, "Draft listing leaked to another user.");
  assert(
    ownerDraft.data?.[0]?.status === "draft",
    "Owner could not read their draft listing.",
  );

  const optionalPublish = await invoke(ownerToken, {
    action: "publish",
    listingId: optionalDraft,
  });
  assert(
    optionalPublish.response.ok && optionalPublish.data?.status === "active",
    "required=false did not publish a zero-image draft.",
  );

  await setRequiredPolicy(true);
  const requiredDraft = await createDraft(ownerToken, owner.id, "Required");
  const rejectedPublish = await invoke(ownerToken, {
    action: "publish",
    listingId: requiredDraft,
  });
  assert(
    rejectedPublish.response.status === 409 &&
      rejectedPublish.data?.error?.code === "image_required",
    "required=true did not preserve the zero-image draft.",
  );

  const requiredImage = await uploadAndRegister(
    ownerToken,
    owner.id,
    requiredDraft,
  );
  await assertPublicObjectAvailable(
    requiredImage.storageKey,
    "Accepted public draft object delivery failed.",
  );

  const anonymousMetadata = await request(
    `/rest/v1/listing_images?listing_id=eq.${requiredDraft}&select=id`,
  );
  const otherMetadata = await request(
    `/rest/v1/listing_images?listing_id=eq.${requiredDraft}&select=id`,
    { token: otherToken },
  );
  assert(anonymousMetadata.data?.length === 0, "Draft metadata leaked publicly.");
  assert(otherMetadata.data?.length === 0, "Draft metadata leaked to another user.");

  const forgedDelete = await invoke(ownerToken, {
    action: "delete-image",
    listingId: requiredDraft,
    imageId: requiredImage.imageId,
    storageKey: `${other.id}/${requiredDraft}/${crypto.randomUUID()}.webp`,
  });
  assert(
    forgedDelete.response.status === 403 &&
      forgedDelete.data?.error?.code === "image_binding_mismatch",
    "Forged storage key was not rejected.",
  );

  const forgedOtherListingDelete = await invoke(ownerToken, {
    action: "delete-image",
    listingId: requiredDraft,
    imageId: requiredImage.imageId,
    storageKey: `${owner.id}/${optionalDraft}/${crypto.randomUUID()}.webp`,
  });
  assert(
    forgedOtherListingDelete.response.status === 403 &&
      forgedOtherListingDelete.data?.error?.code === "image_binding_mismatch",
    "Forged cross-listing storage key was not rejected.",
  );

  const nonOwnerPublish = await invoke(otherToken, {
    action: "publish",
    listingId: requiredDraft,
  });
  assert(nonOwnerPublish.response.status === 403, "Non-owner publish was not rejected.");

  await assertDirectStatusDenied(ownerToken, requiredDraft, "active");
  await assertDirectStatusDenied(ownerToken, requiredDraft, "deleted");
  await assertDirectStatusDenied(ownerToken, optionalDraft, "draft");
  await assertDirectStatusDenied(ownerToken, optionalDraft, "deleted");

  const directListingDelete = await request(
    `/rest/v1/listings?id=eq.${requiredDraft}`,
    { method: "DELETE", token: ownerToken },
  );
  assert(!directListingDelete.response.ok, "Direct browser listing deletion succeeded.");

  const directMetadataDelete = await request(
    `/rest/v1/listing_images?id=eq.${requiredImage.imageId}`,
    { method: "DELETE", token: ownerToken },
  );
  assert(!directMetadataDelete.response.ok, "Direct browser metadata deletion succeeded.");

  const directObjectDelete = await request(
    `/storage/v1/object/listing-images/${requiredImage.storageKey}`,
    { method: "DELETE", token: ownerToken },
  );
  assert(!directObjectDelete.response.ok, "Direct browser object deletion succeeded.");
  await assertPublicObjectAvailable(
    requiredImage.storageKey,
    "Denied direct object deletion removed the canonical image.",
  );

  const requiredPublish = await invoke(ownerToken, {
    action: "publish",
    listingId: requiredDraft,
  });
  assert(
    requiredPublish.response.ok && requiredPublish.data?.status === "active",
    "Required listing did not publish after image persistence.",
  );

  const finalRemoval = await invoke(ownerToken, {
    action: "delete-image",
    listingId: requiredDraft,
    imageId: requiredImage.imageId,
    storageKey: requiredImage.storageKey,
  });
  assert(
    finalRemoval.response.ok && finalRemoval.data?.status === "draft",
    "Final required image removal did not return the listing to draft.",
  );
  await assertObjectEventuallyMissing(requiredImage.storageKey);

  const publicAfterFinalRemoval = await request(
    `/rest/v1/listings?id=eq.${requiredDraft}&select=id`,
  );
  const publicMetadataAfterFinalRemoval = await request(
    `/rest/v1/listing_images?listing_id=eq.${requiredDraft}&select=id`,
  );
  const ownerAfterFinalRemoval = await request(
    `/rest/v1/listings?id=eq.${requiredDraft}&select=status`,
    { token: ownerToken },
  );
  assert(
    publicAfterFinalRemoval.data?.length === 0,
    "Final-photo reversion left the listing public.",
  );
  assert(
    publicMetadataAfterFinalRemoval.data?.length === 0,
    "Final-photo reversion left metadata public.",
  );
  assert(
    ownerAfterFinalRemoval.data?.[0]?.status === "draft",
    "Owner did not retain the reverted draft.",
  );

  const cleanupDraft = await createDraft(ownerToken, owner.id, "Cleanup");
  const cleanupImageA = await uploadAndRegister(
    ownerToken,
    owner.id,
    cleanupDraft,
  );
  const cleanupImageB = await uploadAndRegister(
    ownerToken,
    owner.id,
    cleanupDraft,
  );
  await assertPublicObjectAvailable(
    cleanupImageA.storageKey,
    "First cleanup object was not publicly available before deletion.",
  );
  await assertPublicObjectAvailable(
    cleanupImageB.storageKey,
    "Second cleanup object was not publicly available before deletion.",
  );
  const cleanupResult = await invoke(ownerToken, {
    action: "delete-listing",
    listingId: cleanupDraft,
  });
  assert(
    cleanupResult.response.ok && cleanupResult.data?.status === "deleted",
    "Listing-wide cleanup did not retain a deleted listing row.",
  );

  const ownerDeleted = await request(
    `/rest/v1/listings?id=eq.${cleanupDraft}&select=status`,
    { token: ownerToken },
  );
  const deletedMetadata = await request(
    `/rest/v1/listing_images?listing_id=eq.${cleanupDraft}&select=id`,
    { token: ownerToken },
  );
  assert(ownerDeleted.data?.[0]?.status === "deleted", "Deleted row was not retained.");
  assert(deletedMetadata.data?.length === 0, "Listing metadata was not removed.");
  await assertObjectEventuallyMissing(cleanupImageA.storageKey);
  await assertObjectEventuallyMissing(cleanupImageB.storageKey);

  console.log("PASS lifecycle: required=false and required=true publication modes");
  console.log("PASS security: owner/JWT, draft visibility, and forged/direct writes");
  console.log("PASS cleanup: final-photo draft safety and listing-wide permanence");
} finally {
  await cleanup();
}
