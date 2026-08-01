const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const action = process.argv[2];
const userId = process.argv[3];

if (!url || !serviceRoleKey || !["create", "delete"].includes(action)) {
  throw new Error("Provide SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and create|delete [user-id]");
}

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Supabase Auth admin request failed (${response.status})`);
  return data;
}

if (action === "create") {
  const stamp = Date.now();
  const email = `revvbase.uat.${stamp}@gmail.com`;
  const password = `Revvbase-UAT-${stamp}-Aa1!`;
  const user = await request("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Revvbase UAT" },
    },
  });
  console.log(JSON.stringify({ id: user.id, email, password }));
} else {
  if (!userId) throw new Error("delete requires a user id");
  await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
  console.log("Deleted temporary UAT user and cascading test data.");
}
