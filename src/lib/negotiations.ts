import type {
  ConversationRead,
  Listing,
  ListingConversation,
  NegotiationMessage,
} from "@/lib/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const listingFields = "id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, insurance_valid_until, description, status, created_at, updated_at";

export interface ConversationSummary extends ListingConversation {
  listing: Listing;
  otherName: string;
  unreadCount: number;
  latestMessage: NegotiationMessage | null;
}

function displayName(row: { display_name: string | null } | null | undefined) {
  return row?.display_name?.trim() || "Revvbase member";
}

export async function loadConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: rows, error } = await supabase
    .from("listing_conversations")
    .select("id, listing_id, buyer_id, seller_id, status, created_at, updated_at, last_message_at")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const conversations = (rows ?? []) as ListingConversation[];
  if (!conversations.length) return [];
  const ids = conversations.map((row) => row.id);
  const listingIds = [...new Set(conversations.map((row) => row.listing_id))];
  const personIds = [...new Set(conversations.map((row) => row.buyer_id === userId ? row.seller_id : row.buyer_id))];
  const [{ data: listings, error: listingsError }, { data: profiles }, { data: messages }, { data: reads }] = await Promise.all([
    supabase.from("listings").select(listingFields).in("id", listingIds),
    supabase.from("profiles").select("id, display_name").in("id", personIds),
    supabase.from("negotiation_messages").select("id, conversation_id, sender_id, kind, body, offer_amount_inr, offer_status, created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
    supabase.from("conversation_reads").select("conversation_id, user_id, last_read_at").eq("user_id", userId).in("conversation_id", ids),
  ]);
  if (listingsError) throw listingsError;
  const listingsById = new Map(((listings ?? []) as Listing[]).map((listing) => [listing.id, listing]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const readsByConversation = new Map(((reads ?? []) as ConversationRead[]).map((read) => [read.conversation_id, read]));
  const latestByConversation = new Map<string, NegotiationMessage>();
  const unreadByConversation = new Map<string, number>();
  for (const message of (messages ?? []) as NegotiationMessage[]) {
    if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
    const read = readsByConversation.get(message.conversation_id);
    if (message.sender_id !== userId && (!read || new Date(message.created_at) > new Date(read.last_read_at))) {
      unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) ?? 0) + 1);
    }
  }
  return conversations.flatMap((conversation) => {
    const listing = listingsById.get(conversation.listing_id);
    if (!listing) return [];
    const otherId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
    return [{ ...conversation, listing, otherName: displayName(profilesById.get(otherId)), unreadCount: unreadByConversation.get(conversation.id) ?? 0, latestMessage: latestByConversation.get(conversation.id) ?? null }];
  });
}

export async function loadConversationMessages(conversationId: string) {
  const { data, error } = await getSupabaseBrowserClient().from("negotiation_messages")
    .select("id, conversation_id, sender_id, kind, body, offer_amount_inr, offer_status, created_at")
    .eq("conversation_id", conversationId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NegotiationMessage[];
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseBrowserClient().rpc(name, args);
  if (error) throw error;
  return data;
}

export const createInitialOffer = (listingId: string, amount: number, note: string) => rpc("create_initial_offer", { p_listing_id: listingId, p_amount_inr: amount, p_note: note || null }) as Promise<string>;
export const sendNegotiationMessage = (conversationId: string, body: string) => rpc("send_negotiation_message", { p_conversation_id: conversationId, p_body: body });
export const makeCounterOffer = (conversationId: string, amount: number) => rpc("make_counter_offer", { p_conversation_id: conversationId, p_amount_inr: amount });
export const declineOffer = (offerId: string) => rpc("decline_offer", { p_offer_id: offerId });
export const acceptOffer = (offerId: string) => rpc("accept_offer", { p_offer_id: offerId });
export const reopenBookedListing = (listingId: string) => rpc("reopen_booked_listing", { p_listing_id: listingId });
export const markConversationRead = (conversationId: string) => rpc("mark_conversation_read", { p_conversation_id: conversationId });
