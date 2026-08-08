export interface ListingImage {
  id: string;
  listingId: string;
  storageKey: string;
  publicUrl: string;
  position: number;
  createdAt: string;
}

export interface UploadListingImageInput {
  sellerId: string;
  listingId: string;
  file: File;
}

export interface ListingImageStorage {
  upload(input: UploadListingImageInput): Promise<ListingImage>;
  list(listingId: string): Promise<ListingImage[]>;
}

export type ListingImageStorageErrorCode =
  | "upload_failed"
  | "cleanup_reservation_failed"
  | "registration_failed"
  | "registration_retryable"
  | "list_failed";

export class ListingImageStorageError extends Error {
  constructor(
    public readonly code: ListingImageStorageErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ListingImageStorageError";
  }
}
