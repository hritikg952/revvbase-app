"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ListingImageManager } from "@/components/listing-image-manager";
import type { Listing } from "@/lib/database.types";
import {
  createListingThroughPublication,
  getListingFieldUpdate,
} from "@/lib/listing-form-workflow";
import {
  invokeListingImageLifecycle,
  type ListingLifecycleStatus,
} from "@/lib/listing-image-lifecycle-client";
import {
  appSettings,
  getImageAcceptValue,
  getImageCapacity,
  getImageLifecycleCopy,
} from "@/lib/listing-images";
import {
  getSelectedPhotoPreviews,
  processListingPhotoSelection,
  type SelectedPhotoPreview,
} from "@/lib/listing-image-manager";
import {
  emptyListingForm,
  listingToForm,
  toListingPayload,
  validateListing,
  type ListingFormValues,
} from "@/lib/listings";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";

interface ListingFormProps {
  listing?: Listing;
  onLifecycleStatusChange?: (status: ListingLifecycleStatus) => void;
}

export function ListingForm({ listing, onLifecycleStatusChange }: ListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [values, setValues] = useState<ListingFormValues>(
    listing ? listingToForm(listing) : emptyListingForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPhotoPreviews, setSelectedPhotoPreviews] = useState<SelectedPhotoPreview[]>([]);
  const [photoSelectionError, setPhotoSelectionError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const selectedPhotoPreviewsRef = useRef<SelectedPhotoPreview[]>([]);
  const editableListing = listing;
  const imageStorage = useMemo(
    () => (editableListing ? createBrowserListingImageStorage() : null),
    [editableListing],
  );
  useEffect(() => {
    return () => {
      selectedPhotoPreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.objectUrl));
    };
  }, []);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    const capacity = getImageCapacity(selectedPhotoPreviews.length, appSettings);
    if (files.length > capacity.remaining) {
      setPhotoSelectionError(
        `You can add only ${capacity.remaining} more photo(s) to this listing.`,
      );
      return;
    }

    setSelectedPhotoPreviews((current) => {
      const next = [
        ...current,
        ...getSelectedPhotoPreviews(files, URL.createObjectURL, current.length),
      ];
      selectedPhotoPreviewsRef.current = next;
      return next;
    });
    setPhotoSelectionError(null);
  }

  function removeSelectedPhoto(index: number) {
    setSelectedPhotoPreviews((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.objectUrl);
      const next = current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((preview, nextIndex) => ({
          ...preview,
          index: nextIndex,
          ordinal: nextIndex + 1,
          isCover: nextIndex === 0,
        }));
      selectedPhotoPreviewsRef.current = next;
      return next;
    });
    setPhotoSelectionError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const nextErrors = validateListing(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    setSubmitError(null);
    const supabase = getSupabaseBrowserClient();
    const payload = toListingPayload(values, user.id);

    try {
      if (listing) {
        const result = await supabase
          .from("listings")
          .update(getListingFieldUpdate(payload))
          .eq("id", listing.id)
          .eq("seller_id", user.id)
          .select("id")
          .single();
        if (result.error) throw result.error;
        router.push("/my-listings");
        return;
      }

      const outcome = await createListingThroughPublication({
        draftNotice: getImageLifecycleCopy().draftNotice,
        persistDraft: async () => {
          const result = await supabase
            .from("listings")
            .insert(payload)
            .select("id")
            .single();
          if (result.error || !result.data) {
            throw result.error ?? new Error("The draft could not be saved.");
          }
          return { id: result.data.id };
        },
        uploadPhotos: async (listingId) => {
          if (selectedPhotoPreviews.length === 0) return;
          const result = await processListingPhotoSelection({
            files: selectedPhotoPreviews.map((preview) => preview.file),
            images: [],
            listingId,
            sellerId: user.id,
            upload: (input) => createBrowserListingImageStorage().upload(input),
          });
          if (result.selectionError || result.errors.length > 0) {
            throw new Error(
              result.selectionError ?? "One or more selected photos could not be uploaded.",
            );
          }
        },
        publish: async (listingId) => {
          const result = await invokeListingImageLifecycle({
            action: "publish",
            listingId,
          });
          if (result.status === "deleted") {
            throw new Error("The saved draft is no longer available.");
          }
          return { status: result.status };
        },
      });
      router.push(outcome.destination);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The listing could not be saved. Try again.",
      );
      setPending(false);
    }
  }

  return (
    <form className="listing-form" onSubmit={submit} noValidate>
      <fieldset>
        <legend>Vehicle</legend>
        <div className="form-grid">
          <label>
            Vehicle type
            <select
              value={values.vehicle_type}
              onChange={(event) => update("vehicle_type", event.target.value as ListingFormValues["vehicle_type"])}
            >
              <option value="motorcycle">Motorcycle</option>
              <option value="scooter">Scooter</option>
              <option value="electric_two_wheeler">Electric two-wheeler</option>
              <option value="bicycle">Bicycle</option>
            </select>
          </label>
          <label>
            Fuel type
            <select
              value={values.fuel_type}
              onChange={(event) => update("fuel_type", event.target.value as ListingFormValues["fuel_type"])}
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </label>
          <FormInput label="Make" value={values.make} error={errors.make} onChange={(value) => update("make", value)} maxLength={100} />
          <FormInput label="Model" value={values.model} error={errors.model} onChange={(value) => update("model", value)} maxLength={100} />
          <FormInput label="Year" type="number" value={values.year} error={errors.year} onChange={(value) => update("year", value)} min="1900" max={String(new Date().getFullYear() + 1)} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Condition</legend>
        <div className="form-grid">
          <FormInput label="Odometer (km)" type="number" value={values.odometer_km} error={errors.odometer_km} onChange={(value) => update("odometer_km", value)} min="0" />
          <FormInput label="Previous owners" type="number" value={values.previous_owners} error={errors.previous_owners} onChange={(value) => update("previous_owners", value)} min="0" max="20" />
          <label>
            Insurance valid until <span className="optional">Optional</span>
            <input type="date" value={values.insurance_valid_until} onChange={(event) => update("insurance_valid_until", event.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Price and location</legend>
        <div className="form-grid">
          <FormInput label="Price (₹)" type="number" value={values.price_inr} error={errors.price_inr} onChange={(value) => update("price_inr", value)} min="1" />
          <FormInput label="City" value={values.city} error={errors.city} onChange={(value) => update("city", value)} maxLength={100} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Details</legend>
        <label>
          Description <span className="optional">Optional</span>
          <textarea value={values.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} rows={5} />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </label>
      </fieldset>

      {listing && imageStorage ? (
        <ListingImageManager
          listingId={listing.id}
          sellerId={listing.seller_id}
          vehicleLabel={`${listing.make} ${listing.model}`}
          initialStatus={listing.status}
          storage={imageStorage}
          executeLifecycle={invokeListingImageLifecycle}
          onStatusChange={onLifecycleStatusChange}
        />
      ) : (
        <fieldset className="photo-manager photo-manager-setup">
          <legend>Photos</legend>
          <div className="photo-manager-heading">
            <p>
              {selectedPhotoPreviews.length > 0
                ? `${selectedPhotoPreviews.length} photo(s) selected. They will upload when you publish.`
                : getImageLifecycleCopy().emptyState}
            </p>
            <input
              ref={photoInputRef}
              className="visually-hidden"
              type="file"
              multiple
              accept={getImageAcceptValue(appSettings)}
              onChange={selectPhotos}
            />
            <button
              className="button button-small photo-add-button"
              type="button"
              disabled={pending || selectedPhotoPreviews.length >= appSettings.images.maxPerListing}
              onClick={() => photoInputRef.current?.click()}
            >
              Add photos
            </button>
          </div>
          {photoSelectionError && <p className="form-alert error" role="alert">{photoSelectionError}</p>}
          {selectedPhotoPreviews.length > 0 && (
            <div className="photo-grid">
              {selectedPhotoPreviews.map((preview) => (
                <article className="photo-tile" key={preview.id}>
                  <div className="photo-frame">
                    <img
                      src={preview.objectUrl}
                      alt={`${preview.fileName} selected for upload`}
                    />
                    {preview.isCover && <span className="photo-cover-label">Cover</span>}
                  </div>
                  <div className="photo-tile-caption">
                    <span className="photo-file-name">Photo {preview.ordinal}</span>
                    <button
                      className="text-button destructive photo-remove-button"
                      type="button"
                      disabled={pending}
                      onClick={() => removeSelectedPhoto(preview.index)}
                    >
                      Remove photo
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="field-hint">
            Choose up to {appSettings.images.maxPerListing} photos now. They upload after the listing draft is saved.
          </p>
        </fieldset>
      )}

      {submitError && <p className="form-alert error" role="alert">{submitError}</p>}
      <div className="form-actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving…" : listing ? "Save changes" : "Publish listing"}
        </button>
        <button className="button button-secondary" type="button" onClick={() => router.push("/my-listings")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  maxLength?: number;
}

function FormInput({ label, value, error, onChange, type = "text", ...inputProps }: FormInputProps) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
