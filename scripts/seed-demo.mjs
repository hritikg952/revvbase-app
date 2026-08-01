const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${data?.message ?? "unknown error"}`);
  return data;
}

const demoEmail = "demo-seller@revvbase.test";
const usersResponse = await request("/auth/v1/admin/users?per_page=1000");
let demoUser = usersResponse.users.find((user) => user.email === demoEmail);

if (!demoUser) {
  demoUser = await request("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: demoEmail,
      password: `Demo-${crypto.randomUUID()}-Aa1!`,
      email_confirm: true,
      user_metadata: { display_name: "Revvbase Demo Seller" },
    },
  });
}

const listings = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    seller_id: demoUser.id,
    vehicle_type: "motorcycle",
    make: "Royal Enfield",
    model: "Classic 350",
    year: 2022,
    odometer_km: 8400,
    price_inr: 168000,
    city: "Pune",
    fuel_type: "petrol",
    previous_owners: 1,
    insurance_valid_until: "2027-03-31",
    description: "Carefully used city motorcycle with regular service history.",
    image_url: null,
    status: "active",
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    seller_id: demoUser.id,
    vehicle_type: "scooter",
    make: "Honda",
    model: "Activa 6G",
    year: 2023,
    odometer_km: 5100,
    price_inr: 76000,
    city: "Mumbai",
    fuel_type: "petrol",
    previous_owners: 1,
    insurance_valid_until: "2027-01-15",
    description: "Easy-running commuter scooter with low kilometres.",
    image_url: null,
    status: "active",
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    seller_id: demoUser.id,
    vehicle_type: "electric_two_wheeler",
    make: "Ather",
    model: "450X",
    year: 2024,
    odometer_km: 3200,
    price_inr: 129000,
    city: "Bengaluru",
    fuel_type: "electric",
    previous_owners: 0,
    insurance_valid_until: "2027-08-20",
    description: "Connected electric scooter with home charger included.",
    image_url: null,
    status: "active",
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    seller_id: demoUser.id,
    vehicle_type: "bicycle",
    make: "Firefox",
    model: "Bad Attitude 8",
    year: 2023,
    odometer_km: 650,
    price_inr: 18500,
    city: "Delhi",
    fuel_type: "not_applicable",
    previous_owners: 1,
    insurance_valid_until: null,
    description: "Lightly used hybrid bicycle, ready for daily commutes.",
    image_url: null,
    status: "active",
  },
];

await request("/rest/v1/listings?on_conflict=id", {
  method: "POST",
  body: listings,
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
});

console.log(`Seeded ${listings.length} synthetic demo listings for public browsing.`);
