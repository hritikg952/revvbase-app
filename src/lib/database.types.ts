export type VehicleType =
  | "motorcycle"
  | "scooter"
  | "electric_two_wheeler"
  | "bicycle";

export type FuelType =
  | "petrol"
  | "diesel"
  | "electric"
  | "hybrid"
  | "not_applicable";

export type ListingStatus = "draft" | "active" | "deleted";

export interface Listing {
  id: string;
  seller_id: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  odometer_km: number;
  price_inr: number;
  city: string;
  fuel_type: FuelType;
  previous_owners: number;
  insurance_valid_until: string | null;
  description: string | null;
  image_url: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}
