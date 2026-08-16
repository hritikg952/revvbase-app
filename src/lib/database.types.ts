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

export const LISTING_STATUSES = ["draft", "active", "booked", "deleted"] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export function isListingStatus(value: unknown): value is ListingStatus {
  return (
    typeof value === "string" &&
    LISTING_STATUSES.includes(value as ListingStatus)
  );
}

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
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface ListingImageRow {
  id: string;
  listing_id: string;
  storage_key: string;
  position: number;
  created_at: string;
}

export type ConversationStatus = "open" | "agreed" | "locked";
export type NegotiationMessageKind = "text" | "offer";
export type OfferStatus = "pending" | "superseded" | "declined" | "accepted";

export interface ListingConversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface NegotiationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: NegotiationMessageKind;
  body: string | null;
  offer_amount_inr: number | null;
  offer_status: OfferStatus | null;
  created_at: string;
}

export interface ConversationRead {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}
