import type { FuelType, Listing, VehicleType } from "@/lib/database.types";

export interface ListingFormValues {
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: string;
  odometer_km: string;
  price_inr: string;
  city: string;
  fuel_type: FuelType;
  previous_owners: string;
  insurance_valid_until: string;
  description: string;
  image_url: string;
}

export const emptyListingForm: ListingFormValues = {
  vehicle_type: "motorcycle",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  odometer_km: "",
  price_inr: "",
  city: "",
  fuel_type: "petrol",
  previous_owners: "1",
  insurance_valid_until: "",
  description: "",
  image_url: "",
};

export function listingToForm(listing: Listing): ListingFormValues {
  return {
    vehicle_type: listing.vehicle_type,
    make: listing.make,
    model: listing.model,
    year: String(listing.year),
    odometer_km: String(listing.odometer_km),
    price_inr: String(listing.price_inr),
    city: listing.city,
    fuel_type: listing.fuel_type,
    previous_owners: String(listing.previous_owners),
    insurance_valid_until: listing.insurance_valid_until ?? "",
    description: listing.description ?? "",
    image_url: listing.image_url ?? "",
  };
}

export function validateListing(values: ListingFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const currentYear = new Date().getFullYear();
  const year = Number(values.year);
  const odometer = Number(values.odometer_km);
  const price = Number(values.price_inr);
  const owners = Number(values.previous_owners);

  if (!values.make.trim()) errors.make = "Enter the vehicle make.";
  if (!values.model.trim()) errors.model = "Enter the vehicle model.";
  if (!values.city.trim()) errors.city = "Enter the city.";
  if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) {
    errors.year = `Enter a year between 1900 and ${currentYear + 1}.`;
  }
  if (!Number.isInteger(odometer) || odometer < 0) {
    errors.odometer_km = "Enter kilometres as zero or a positive whole number.";
  }
  if (!Number.isInteger(price) || price <= 0) {
    errors.price_inr = "Enter a price greater than zero.";
  }
  if (!Number.isInteger(owners) || owners < 0 || owners > 20) {
    errors.previous_owners = "Enter a previous-owner count from 0 to 20.";
  }
  if (values.description.length > 5000) {
    errors.description = "Keep the description within 5,000 characters.";
  }
  if (values.image_url && !/^https?:\/\//i.test(values.image_url)) {
    errors.image_url = "Use a full http:// or https:// image URL.";
  }

  return errors;
}

export function toListingPayload(values: ListingFormValues, sellerId: string) {
  return {
    seller_id: sellerId,
    vehicle_type: values.vehicle_type,
    make: values.make.trim(),
    model: values.model.trim(),
    year: Number(values.year),
    odometer_km: Number(values.odometer_km),
    price_inr: Number(values.price_inr),
    city: values.city.trim(),
    fuel_type: values.fuel_type,
    previous_owners: Number(values.previous_owners),
    insurance_valid_until: values.insurance_valid_until || null,
    description: values.description.trim() || null,
    image_url: values.image_url.trim() || null,
    status: "draft" as const,
  };
}

export function formatPrice(priceInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(priceInr);
}

export function formatVehicleType(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    motorcycle: "Motorcycle",
    scooter: "Scooter",
    electric_two_wheeler: "Electric two-wheeler",
    bicycle: "Bicycle",
  };
  return labels[type];
}
