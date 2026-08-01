"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { Listing } from "@/lib/database.types";
import {
  emptyListingForm,
  listingToForm,
  toListingPayload,
  validateListing,
  type ListingFormValues,
} from "@/lib/listings";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface ListingFormProps {
  listing?: Listing;
}

export function ListingForm({ listing }: ListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [values, setValues] = useState<ListingFormValues>(
    listing ? listingToForm(listing) : emptyListingForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
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

    const result = listing
      ? await supabase
          .from("listings")
          .update({ ...payload, status: listing.status })
          .eq("id", listing.id)
          .eq("seller_id", user.id)
          .select("id")
          .single()
      : await supabase.from("listings").insert(payload).select("id").single();

    if (result.error) {
      setSubmitError(result.error.message);
      setPending(false);
      return;
    }

    router.push("/my-listings");
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
        <label>
          Image URL <span className="optional">Optional</span>
          <input type="url" value={values.image_url} onChange={(event) => update("image_url", event.target.value)} placeholder="https://…" maxLength={2048} />
          <span className="field-hint">Leave blank to use the Revvbase stock placeholder.</span>
          {errors.image_url && <span className="field-error">{errors.image_url}</span>}
        </label>
      </fieldset>

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
