import { describe, expect, it } from "vitest";
import {
  emptyListingForm,
  formatPrice,
  toListingPayload,
  validateListing,
} from "./listings";

const validForm = {
  ...emptyListingForm,
  make: " Honda ",
  model: " Activa 6G ",
  year: "2023",
  odometer_km: "4500",
  price_inr: "85000",
  city: " Pune ",
};

describe("listing form contract", () => {
  it("accepts zero odometer and previous owners", () => {
    expect(
      validateListing({ ...validForm, odometer_km: "0", previous_owners: "0" }),
    ).toEqual({});
  });

  it("rejects incomplete and invalid numeric values", () => {
    const errors = validateListing({
      ...validForm,
      make: "",
      year: "1800",
      odometer_km: "-1",
      price_inr: "0",
    });
    expect(errors.make).toBeTruthy();
    expect(errors.year).toBeTruthy();
    expect(errors.odometer_km).toBeTruthy();
    expect(errors.price_inr).toBeTruthy();
  });

  it("maps trimmed form data to an owner-scoped database payload", () => {
    expect(toListingPayload(validForm, "owner-1")).toMatchObject({
      seller_id: "owner-1",
      make: "Honda",
      model: "Activa 6G",
      city: "Pune",
      price_inr: 85000,
      status: "draft",
    });
  });

  it("formats whole rupee prices for India", () => {
    expect(formatPrice(125000)).toContain("1,25,000");
  });
});
