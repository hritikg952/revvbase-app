import type { FuelType, Listing, VehicleType } from "./database.types";
import { getSupabaseBrowserClient } from "./supabase";

export type ListingSort = "newest" | "price_asc" | "price_desc";

export interface ListingDiscoveryQuery {
  text?: string;
  vehicleTypes?: VehicleType[];
  fuelTypes?: FuelType[];
  makes?: string[];
  models?: string[];
  cities?: string[];
  minPriceInr?: number;
  maxPriceInr?: number;
  minYear?: number;
  maxYear?: number;
  minOdometerKm?: number;
  maxOdometerKm?: number;
  sort?: ListingSort;
  page?: number;
}

export interface PopularDiscoveryFilter {
  id: string;
  label: string;
  query: Pick<ListingDiscoveryQuery, "vehicleTypes" | "fuelTypes">;
}

export const DEFAULT_DISCOVERY_QUERY: ListingDiscoveryQuery = {
  sort: "newest",
  page: 1,
};

export const POPULAR_DISCOVERY_FILTERS: readonly PopularDiscoveryFilter[] = [
  { id: "electric", label: "Electric", query: { fuelTypes: ["electric"] } },
  { id: "petrol", label: "Petrol", query: { fuelTypes: ["petrol"] } },
  { id: "scooter", label: "Scooter", query: { vehicleTypes: ["scooter"] } },
  { id: "motorcycle", label: "Motorcycle", query: { vehicleTypes: ["motorcycle"] } },
];

const VEHICLE_TYPES: readonly VehicleType[] = [
  "motorcycle",
  "scooter",
  "electric_two_wheeler",
  "bicycle",
];
const FUEL_TYPES: readonly FuelType[] = [
  "petrol",
  "diesel",
  "electric",
  "hybrid",
  "not_applicable",
];
const SORTS: readonly ListingSort[] = ["newest", "price_asc", "price_desc"];
export const LISTING_DISCOVERY_PAGE_SIZE = 12;

const LISTING_FACETS_CACHE_KEY = "revvbase:listing-facets:v1";
const LISTING_FACETS_CACHE_TTL_MS = 5 * 60 * 1000;
type ListingFacets = { cities: string[]; makes: string[] };
let listingFacetsCache: { value: ListingFacets; expiresAt: number } | null = null;
let listingFacetsRequest: Promise<ListingFacets> | null = null;

function sortedUnique(values: readonly string[] | undefined): string[] | undefined {
  const result = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  return result.length ? result : undefined;
}

function validInteger(value: number | undefined, minimum: number): number | undefined {
  return Number.isInteger(value) && value !== undefined && value >= minimum ? value : undefined;
}

function validValues<T extends string>(values: readonly T[] | undefined, allowed: readonly T[]): T[] | undefined {
  return sortedUnique(values?.filter((value) => allowed.includes(value))) as T[] | undefined;
}

export function normalizeListingDiscoveryQuery(input: ListingDiscoveryQuery): ListingDiscoveryQuery {
  const minPriceInr = validInteger(input.minPriceInr, 0);
  const maxPriceInr = validInteger(input.maxPriceInr, 0);
  const minYear = validInteger(input.minYear, 1900);
  const maxYear = validInteger(input.maxYear, 1900);
  const minOdometerKm = validInteger(input.minOdometerKm, 0);
  const maxOdometerKm = validInteger(input.maxOdometerKm, 0);
  const normalized: ListingDiscoveryQuery = {
    text: input.text?.trim() || undefined,
    vehicleTypes: validValues(input.vehicleTypes, VEHICLE_TYPES),
    fuelTypes: validValues(input.fuelTypes, FUEL_TYPES),
    makes: sortedUnique(input.makes),
    models: sortedUnique(input.models),
    cities: sortedUnique(input.cities),
    minPriceInr,
    maxPriceInr,
    minYear,
    maxYear,
    minOdometerKm,
    maxOdometerKm,
    sort: SORTS.includes(input.sort ?? "newest") ? input.sort ?? "newest" : "newest",
    page: validInteger(input.page, 1) ?? 1,
  };

  if (normalized.minPriceInr !== undefined && normalized.maxPriceInr !== undefined && normalized.minPriceInr > normalized.maxPriceInr) {
    [normalized.minPriceInr, normalized.maxPriceInr] = [normalized.maxPriceInr, normalized.minPriceInr];
  }
  if (normalized.minYear !== undefined && normalized.maxYear !== undefined && normalized.minYear > normalized.maxYear) {
    [normalized.minYear, normalized.maxYear] = [normalized.maxYear, normalized.minYear];
  }
  if (normalized.minOdometerKm !== undefined && normalized.maxOdometerKm !== undefined && normalized.minOdometerKm > normalized.maxOdometerKm) {
    [normalized.minOdometerKm, normalized.maxOdometerKm] = [normalized.maxOdometerKm, normalized.minOdometerKm];
  }
  return normalized;
}

function readList(params: URLSearchParams, key: string): string[] | undefined {
  return sortedUnique(params.getAll(key));
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : Number(value);
}

export function parseListingDiscoveryQuery(search: string | URLSearchParams): ListingDiscoveryQuery {
  const params = typeof search === "string"
    ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    : search;
  return normalizeListingDiscoveryQuery({
    text: params.get("q") ?? undefined,
    vehicleTypes: readList(params, "vehicle_type") as VehicleType[] | undefined,
    fuelTypes: readList(params, "fuel_type") as FuelType[] | undefined,
    makes: readList(params, "make"),
    models: readList(params, "model"),
    cities: readList(params, "city"),
    minPriceInr: readNumber(params, "min_price"),
    maxPriceInr: readNumber(params, "max_price"),
    minYear: readNumber(params, "min_year"),
    maxYear: readNumber(params, "max_year"),
    minOdometerKm: readNumber(params, "min_km"),
    maxOdometerKm: readNumber(params, "max_km"),
    sort: params.get("sort") as ListingSort | undefined,
    page: readNumber(params, "page"),
  });
}

export function serializeListingDiscoveryQuery(input: ListingDiscoveryQuery): string {
  const query = normalizeListingDiscoveryQuery(input);
  const params = new URLSearchParams();
  if (query.text) params.set("q", query.text);
  query.vehicleTypes?.forEach((value) => params.append("vehicle_type", value));
  query.fuelTypes?.forEach((value) => params.append("fuel_type", value));
  query.makes?.forEach((value) => params.append("make", value));
  query.models?.forEach((value) => params.append("model", value));
  query.cities?.forEach((value) => params.append("city", value));
  if (query.minPriceInr !== undefined) params.set("min_price", String(query.minPriceInr));
  if (query.maxPriceInr !== undefined) params.set("max_price", String(query.maxPriceInr));
  if (query.minYear !== undefined) params.set("min_year", String(query.minYear));
  if (query.maxYear !== undefined) params.set("max_year", String(query.maxYear));
  if (query.minOdometerKm !== undefined) params.set("min_km", String(query.minOdometerKm));
  if (query.maxOdometerKm !== undefined) params.set("max_km", String(query.maxOdometerKm));
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

function escapeSearchTerm(value: string): string {
  return value.replace(/[\\%_,().]/g, (character) => `\\${character}`);
}

function buildTextPredicate(text: string): string | undefined {
  const term = escapeSearchTerm(text.trim());
  if (!term) return undefined;
  return [`make.ilike.%${term}%`, `model.ilike.%${term}%`, `city.ilike.%${term}%`].join(",");
}

export async function fetchPublicListings(queryInput: ListingDiscoveryQuery): Promise<{ listings: Listing[]; hasMore: boolean }> {
  const query = normalizeListingDiscoveryQuery(queryInput);
  const start = ((query.page ?? 1) - 1) * LISTING_DISCOVERY_PAGE_SIZE;
  const end = start + LISTING_DISCOVERY_PAGE_SIZE - 1;
  let request = getSupabaseBrowserClient()
    .from("listings")
    .select("id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, insurance_valid_until, description, status, created_at, updated_at")
    .in("status", ["active", "booked"]);

  if (query.text) {
    const predicate = buildTextPredicate(query.text);
    if (predicate) request = request.or(predicate);
  }
  if (query.vehicleTypes) request = request.in("vehicle_type", query.vehicleTypes);
  if (query.fuelTypes) request = request.in("fuel_type", query.fuelTypes);
  if (query.makes) request = request.in("make", query.makes);
  if (query.models) request = request.in("model", query.models);
  if (query.cities) request = request.in("city", query.cities);
  if (query.minPriceInr !== undefined) request = request.gte("price_inr", query.minPriceInr);
  if (query.maxPriceInr !== undefined) request = request.lte("price_inr", query.maxPriceInr);
  if (query.minYear !== undefined) request = request.gte("year", query.minYear);
  if (query.maxYear !== undefined) request = request.lte("year", query.maxYear);
  if (query.minOdometerKm !== undefined) request = request.gte("odometer_km", query.minOdometerKm);
  if (query.maxOdometerKm !== undefined) request = request.lte("odometer_km", query.maxOdometerKm);

  if (query.sort === "price_asc") request = request.order("price_inr", { ascending: true });
  else if (query.sort === "price_desc") request = request.order("price_inr", { ascending: false });
  else request = request.order("created_at", { ascending: false });

  const { data, error } = await request.range(start, end);
  if (error) throw error;
  const listings = ((data ?? []) as Listing[]).filter(
    (listing) => listing.status === "active" || listing.status === "booked",
  );
  return { listings, hasMore: listings.length === LISTING_DISCOVERY_PAGE_SIZE };
}

export async function fetchPublicListingFacets(): Promise<ListingFacets> {
  const now = Date.now();
  if (listingFacetsCache && listingFacetsCache.expiresAt > now) return listingFacetsCache.value;

  if (!listingFacetsCache && typeof window !== "undefined") {
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(LISTING_FACETS_CACHE_KEY) ?? "null") as {
        value?: ListingFacets;
        expiresAt?: number;
      } | null;
      if (cached?.value && cached.expiresAt && cached.expiresAt > now) {
        listingFacetsCache = { value: cached.value, expiresAt: cached.expiresAt };
        return cached.value;
      }
    } catch {
      // Browser storage can be unavailable or contain stale data.
    }
  }

  if (listingFacetsRequest) return listingFacetsRequest;

  listingFacetsRequest = fetchListingFacetsFromSupabase().then((value) => {
    const expiresAt = Date.now() + LISTING_FACETS_CACHE_TTL_MS;
    listingFacetsCache = { value, expiresAt };
    try {
      window.sessionStorage.setItem(LISTING_FACETS_CACHE_KEY, JSON.stringify({ value, expiresAt }));
    } catch {
      // Browser storage is an optimization, not a requirement.
    }
    return value;
  }).finally(() => {
    listingFacetsRequest = null;
  });

  return listingFacetsRequest;
}

async function fetchListingFacetsFromSupabase(): Promise<ListingFacets> {
  const cities = new Set<string>();
  const makes = new Set<string>();
  const pageSize = 1000;
  let page = 0;

  while (true) {
    const { data, error } = await getSupabaseBrowserClient()
      .from("listings")
      .select("id, city, make")
      .in("status", ["active", "booked"])
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;

    for (const row of (data ?? []) as Array<{ id: string; city: string; make: string }>) {
      if (row.city?.trim()) cities.add(row.city.trim());
      if (row.make?.trim()) makes.add(row.make.trim());
    }
    if ((data ?? []).length < pageSize) break;
    page += 1;
  }

  return {
    cities: [...cities].sort((left, right) => left.localeCompare(right)),
    makes: [...makes].sort((left, right) => left.localeCompare(right)),
  };
}
