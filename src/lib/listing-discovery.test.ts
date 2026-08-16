import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCOVERY_QUERY,
  POPULAR_DISCOVERY_FILTERS,
  normalizeListingDiscoveryQuery,
  parseListingDiscoveryQuery,
  serializeListingDiscoveryQuery,
  type ListingDiscoveryQuery,
} from "./listing-discovery";

describe("listing discovery query state", () => {
  it("normalizes multi-select values and invalid ranges", () => {
    const query = normalizeListingDiscoveryQuery({
      makes: ["Yamaha", "Honda", "Honda", ""],
      vehicleTypes: ["scooter", "motorcycle", "scooter"],
      minPriceInr: -10,
      maxPriceInr: 150000,
      minYear: 0,
      maxYear: 2024,
      page: 0,
    });

    expect(query.makes).toEqual(["Honda", "Yamaha"]);
    expect(query.vehicleTypes).toEqual(["motorcycle", "scooter"]);
    expect(query.minPriceInr).toBeUndefined();
    expect(query.maxPriceInr).toBe(150000);
    expect(query.minYear).toBeUndefined();
    expect(query.maxYear).toBe(2024);
    expect(query.page).toBe(1);
  });

  it("round-trips canonical URL state for future search and filters", () => {
    const original: ListingDiscoveryQuery = {
      text: "Activa",
      vehicleTypes: ["scooter"],
      fuelTypes: ["electric"],
      makes: ["Honda", "TVS"],
      models: ["Activa 6G"],
      cities: ["Bengaluru, Karnataka", "Mumbai"],
      minPriceInr: 30000,
      maxPriceInr: 150000,
      minYear: 2018,
      maxYear: 2025,
      minOdometerKm: 1000,
      maxOdometerKm: 40000,
      sort: "price_asc",
      page: 2,
    };

    const parsed = parseListingDiscoveryQuery(serializeListingDiscoveryQuery(original));
    expect(parsed).toEqual(normalizeListingDiscoveryQuery(original));
  });

  it("uses configured popular filters as canonical query fragments", () => {
    expect(POPULAR_DISCOVERY_FILTERS.map((filter) => filter.id)).toEqual([
      "electric",
      "petrol",
      "scooter",
      "motorcycle",
    ]);
    expect(POPULAR_DISCOVERY_FILTERS[0].query).toEqual({ fuelTypes: ["electric"] });
    expect(POPULAR_DISCOVERY_FILTERS[2].query).toEqual({ vehicleTypes: ["scooter"] });
  });

  it("parses an empty URL as the default query", () => {
    expect(parseListingDiscoveryQuery("")).toEqual(DEFAULT_DISCOVERY_QUERY);
  });
});
