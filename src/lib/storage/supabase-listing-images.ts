import type {
  ListingImage,
  ListingImageStorage,
  UploadListingImageInput,
} from "./listing-image-storage";
import { ListingImageStorageError } from "./listing-image-storage";

const LISTING_IMAGES_BUCKET = "listing-images";

interface ProviderResult<T> {
  data: T;
  error: { message?: string } | null;
}

interface ListingImageRow {
  id: string;
  listing_id: string;
  storage_key: string;
  position: number;
  created_at: string;
}

interface StorageBucketClient {
  upload(
    path: string,
    file: File,
    options: {
      cacheControl: string;
      contentType: "image/webp";
      upsert: false;
    },
  ): Promise<ProviderResult<unknown>>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

export interface SupabaseListingImagesClient {
  storage: {
    from(bucket: string): StorageBucketClient;
  };
  rpc(
    name: "register_listing_image",
    args: { p_listing_id: string; p_storage_key: string },
  ): Promise<ProviderResult<ListingImageRow | ListingImageRow[] | null>>;
}

interface CreateSupabaseListingImageStorageOptions {
  client: SupabaseListingImagesClient;
  createObjectId?: () => string;
}

function toListingImage(
  row: ListingImageRow,
  publicUrl: string,
): ListingImage {
  return {
    id: row.id,
    listingId: row.listing_id,
    storageKey: row.storage_key,
    publicUrl,
    position: row.position,
    createdAt: row.created_at,
  };
}

export function createSupabaseListingImageStorage({
  client,
  createObjectId = () => crypto.randomUUID(),
}: CreateSupabaseListingImageStorageOptions): ListingImageStorage {
  const bucket = client.storage.from(LISTING_IMAGES_BUCKET);

  return {
    async upload({
      sellerId,
      listingId,
      file,
    }: UploadListingImageInput): Promise<ListingImage> {
      const storageKey = `${sellerId}/${listingId}/${createObjectId()}.webp`;
      const uploadResult = await bucket.upload(storageKey, file, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
      if (uploadResult.error) {
        throw new ListingImageStorageError(
          "upload_failed",
          "The photo could not be uploaded. Please try again.",
        );
      }

      const registration = await client.rpc("register_listing_image", {
        p_listing_id: listingId,
        p_storage_key: storageKey,
      });
      const registeredRow = Array.isArray(registration.data)
        ? registration.data[0]
        : registration.data;
      if (registration.error || !registeredRow) {
        throw new ListingImageStorageError(
          "registration_failed",
          "The uploaded photo could not be attached to this listing.",
        );
      }

      const { data } = bucket.getPublicUrl(registeredRow.storage_key);
      return toListingImage(registeredRow, data.publicUrl);
    },

    async list(): Promise<ListingImage[]> {
      throw new ListingImageStorageError(
        "list_failed",
        "Listing photos could not be loaded.",
      );
    },
  };
}
