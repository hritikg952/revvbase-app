alter table public.listings
  drop constraint listings_image_url_length,
  drop column image_url;

comment on table public.listings is
  'Owner-managed marketplace listings. Media is represented only by ordered public.listing_images metadata.';
