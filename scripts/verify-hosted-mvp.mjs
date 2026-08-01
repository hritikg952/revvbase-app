const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  throw new Error("SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY are required");
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Mvp-${runId}-Aa1!`;
const users = [];

async function request(path, { method = "GET", key = publishableKey, token, body, headers = {} } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 160).replace(/\s+/g, " ") };
    }
  }
  return { response, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `mvp-${label}-${runId}@revvbase.test`;
  const { response, data } = await request("/auth/v1/admin/users", {
    method: "POST",
    key: secretKey,
    body: { email, password, email_confirm: true, user_metadata: { display_name: `MVP ${label}` } },
  });
  assert(
    response.ok,
    `Admin user creation failed (${response.status}, ${response.headers.get("content-type") ?? "unknown content type"}): ${data?.message ?? "no response message"}`,
  );
  users.push(data.id);
  return { email, id: data.id };
}

async function signUpUser() {
  const email = `revvbase.mvp.${runId.replace(/[^a-z0-9]/gi, "")}@gmail.com`;
  const { response, data } = await request("/auth/v1/signup", {
    method: "POST",
    body: { email, password, data: { display_name: "MVP Public Signup" } },
  });
  assert(response.ok && data.user?.id, `Public email/password sign-up failed (${response.status})`);
  users.push(data.user.id);
  return { email, id: data.user.id };
}

async function signIn(email) {
  const { response, data } = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  assert(response.ok && data.access_token, `Password sign-in failed (${response.status})`);
  return data.access_token;
}

async function cleanup() {
  for (const id of users) {
    await request(`/auth/v1/admin/users/${id}`, { method: "DELETE", key: secretKey });
  }
}

try {
  const ownerA = await signUpUser();
  const ownerB = await createUser("owner-b");
  const tokenA = await signIn(ownerA.email);
  const tokenB = await signIn(ownerB.email);

  const listingPayload = {
    seller_id: ownerA.id,
    vehicle_type: "motorcycle",
    make: "Verification",
    model: "Roadster",
    year: 2024,
    odometer_km: 1200,
    price_inr: 125000,
    city: "Pune",
    fuel_type: "petrol",
    previous_owners: 1,
    description: "Temporary hosted MVP verification listing",
    status: "active",
  };

  const created = await request("/rest/v1/listings?select=*", {
    method: "POST",
    token: tokenA,
    body: listingPayload,
    headers: { Prefer: "return=representation" },
  });
  assert(created.response.ok && created.data.length === 1, "Owner listing creation failed");
  const listing = created.data[0];
  assert(listing.seller_id === ownerA.id, "Listing ownership did not match authenticated user");

  const publicActive = await request(`/rest/v1/listings?id=eq.${listing.id}&status=eq.active&select=id`);
  assert(publicActive.response.ok && publicActive.data.length === 1, "Anonymous active listing read failed");

  const crossOwner = await request(`/rest/v1/listings?id=eq.${listing.id}`, {
    method: "PATCH",
    token: tokenB,
    body: { price_inr: 1 },
    headers: { Prefer: "return=representation" },
  });
  assert(crossOwner.response.ok && crossOwner.data.length === 0, "Cross-owner update was not blocked");

  const ownerRead = await request(`/rest/v1/listings?id=eq.${listing.id}&select=price_inr`, { token: tokenA });
  assert(ownerRead.data[0]?.price_inr === 125000, "Cross-owner update changed the listing");

  const edited = await request(`/rest/v1/listings?id=eq.${listing.id}&seller_id=eq.${ownerA.id}`, {
    method: "PATCH",
    token: tokenA,
    body: { city: "Mumbai", price_inr: 120000 },
    headers: { Prefer: "return=representation" },
  });
  assert(edited.response.ok && edited.data[0]?.city === "Mumbai", "Owner edit failed");

  const removed = await request(`/rest/v1/listings?id=eq.${listing.id}&seller_id=eq.${ownerA.id}`, {
    method: "PATCH",
    token: tokenA,
    body: { status: "deleted" },
    headers: { Prefer: "return=representation" },
  });
  assert(removed.response.ok && removed.data[0]?.status === "deleted", "Owner soft delete failed");

  const publicDeleted = await request(`/rest/v1/listings?id=eq.${listing.id}&select=id`);
  assert(publicDeleted.response.ok && publicDeleted.data.length === 0, "Deleted listing leaked publicly");

  console.log("PASS auth: two email/password users created and signed in");
  console.log("PASS listings: owner create, read, edit, and soft delete");
  console.log("PASS RLS: cross-owner update blocked");
  console.log("PASS public feed: active visible, deleted hidden");
} finally {
  await cleanup();
}
