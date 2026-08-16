"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { FuelType, VehicleType } from "@/lib/database.types";
import { vehicleCatalog } from "@/lib/data/vehicles";
import {
  DEFAULT_DISCOVERY_QUERY,
  normalizeListingDiscoveryQuery,
  POPULAR_DISCOVERY_FILTERS,
  type ListingDiscoveryQuery,
} from "@/lib/listing-discovery";

const vehicleTypeOptions: Array<[VehicleType, string]> = [
  ["motorcycle", "Motorcycle"],
  ["scooter", "Scooter"],
  ["electric_two_wheeler", "Electric two-wheeler"],
  ["bicycle", "Bicycle"],
];
const fuelOptions: Array<[FuelType, string]> = [
  ["petrol", "Petrol"],
  ["electric", "Electric"],
  ["diesel", "Diesel"],
  ["hybrid", "Hybrid"],
  ["not_applicable", "Not applicable"],
];

interface ListingFiltersProps {
  appliedQuery: ListingDiscoveryQuery;
  availableCities: string[];
  availableMakes: string[];
  onApply: (query: ListingDiscoveryQuery) => void;
  onClear: () => void;
  onPopularApply: (query: ListingDiscoveryQuery) => void;
}

function toggleValue<T extends string | number>(values: T[] | undefined, value: T): T[] | undefined {
  const next = new Set(values ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next.size ? [...next] : undefined;
}

function activeFilterCount(query: ListingDiscoveryQuery): number {
  return [
    query.vehicleTypes?.length,
    query.fuelTypes?.length,
    query.makes?.length,
    query.models?.length,
    query.cities?.length,
    query.minPriceInr !== undefined || query.maxPriceInr !== undefined ? 1 : 0,
    query.minYear !== undefined || query.maxYear !== undefined ? 1 : 0,
    query.minOdometerKm !== undefined || query.maxOdometerKm !== undefined ? 1 : 0,
  ].filter(Boolean).length;
}

function FilterCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="filter-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export function ListingFilters({
  appliedQuery,
  availableCities,
  availableMakes,
  onApply,
  onClear,
  onPopularApply,
}: ListingFiltersProps) {
  const [draft, setDraft] = useState<ListingDiscoveryQuery>(appliedQuery);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setDraft(appliedQuery), [appliedQuery]);

  const makes = useMemo(
    () => [...new Set([...vehicleCatalog.map((brand) => brand.name), ...availableMakes])].sort(),
    [availableMakes],
  );
  const models = useMemo(() => {
    const selectedMakes = draft.makes?.length ? draft.makes : makes;
    return [...new Set(
      vehicleCatalog
        .filter((brand) => selectedMakes.includes(brand.name))
        .flatMap((brand) => brand.models.map((model) => model.name)),
    )].sort();
  }, [draft.makes, makes]);

  const updateDraft = (patch: Partial<ListingDiscoveryQuery>) => {
    setDraft((current) => normalizeListingDiscoveryQuery({ ...current, ...patch, page: 1 }));
  };

  const updatePopular = (filterId: string) => {
    const filter = POPULAR_DISCOVERY_FILTERS.find((candidate) => candidate.id === filterId);
    if (!filter) return;
    const vehicleValue = filter.query.vehicleTypes?.[0];
    const fuelValue = filter.query.fuelTypes?.[0];
    const next = normalizeListingDiscoveryQuery(vehicleValue
      ? { ...appliedQuery, vehicleTypes: toggleValue(appliedQuery.vehicleTypes, vehicleValue), page: 1 }
      : { ...appliedQuery, fuelTypes: toggleValue(appliedQuery.fuelTypes, fuelValue!), page: 1 });
    onPopularApply(next);
  };

  const form = (
    <div className="filter-panel-content">
      <section className="filter-section">
        <h3>Vehicle type</h3>
        {vehicleTypeOptions.map(([value, label]) => (
          <FilterCheckbox key={value} checked={draft.vehicleTypes?.includes(value) ?? false} label={label} onChange={() => updateDraft({ vehicleTypes: toggleValue(draft.vehicleTypes, value) })} />
        ))}
      </section>
      <section className="filter-section">
        <h3>Fuel</h3>
        {fuelOptions.map(([value, label]) => (
          <FilterCheckbox key={value} checked={draft.fuelTypes?.includes(value) ?? false} label={label} onChange={() => updateDraft({ fuelTypes: toggleValue(draft.fuelTypes, value) })} />
        ))}
      </section>
      <section className="filter-section">
        <h3>Make</h3>
        <div className="filter-options-scroll">
          {makes.map((value) => <FilterCheckbox key={value} checked={draft.makes?.includes(value) ?? false} label={value} onChange={() => updateDraft({ makes: toggleValue(draft.makes, value) })} />)}
        </div>
      </section>
      <section className="filter-section">
        <h3>Model</h3>
        <div className="filter-options-scroll">
          {models.map((value) => <FilterCheckbox key={value} checked={draft.models?.includes(value) ?? false} label={value} onChange={() => updateDraft({ models: toggleValue(draft.models, value) })} />)}
        </div>
      </section>
      <section className="filter-section">
        <h3>City</h3>
        <div className="filter-options-scroll">
          {availableCities.map((value) => <FilterCheckbox key={value} checked={draft.cities?.includes(value) ?? false} label={value} onChange={() => updateDraft({ cities: toggleValue(draft.cities, value) })} />)}
        </div>
      </section>
      <RangeSlider label="Price" minimum={0} maximum={500000} step={5000} valueMin={draft.minPriceInr} valueMax={draft.maxPriceInr} format={(value) => `₹${value.toLocaleString("en-IN")}`} onChange={(min, max) => updateDraft({ minPriceInr: min, maxPriceInr: max })} />
      <RangeSlider label="Model year" minimum={2000} maximum={2026} step={1} valueMin={draft.minYear} valueMax={draft.maxYear} format={String} onChange={(min, max) => updateDraft({ minYear: min, maxYear: max })} />
      <RangeSlider label="Kilometres" minimum={0} maximum={200000} step={5000} valueMin={draft.minOdometerKm} valueMax={draft.maxOdometerKm} format={(value) => `${value.toLocaleString("en-IN")} km`} onChange={(min, max) => updateDraft({ minOdometerKm: min, maxOdometerKm: max })} />
    </div>
  );

  return (
    <>
      <div className="popular-filter-row" aria-label="Popular filters">
        <button type="button" className="button button-small filter-master-button" onClick={() => setMobileOpen(true)}>
          Filters{activeFilterCount(appliedQuery) ? ` (${activeFilterCount(appliedQuery)})` : ""}
        </button>
        <div className="popular-filter-scroll">
          {POPULAR_DISCOVERY_FILTERS.map((filter) => {
            const value = filter.query.vehicleTypes?.[0] ?? filter.query.fuelTypes?.[0];
            const selected = filter.query.vehicleTypes ? appliedQuery.vehicleTypes?.includes(value as VehicleType) : appliedQuery.fuelTypes?.includes(value as FuelType);
            return <button key={filter.id} type="button" className={`filter-pill ${selected ? "selected" : ""}`} onClick={() => updatePopular(filter.id)}>{filter.label}</button>;
          })}
        </div>
      </div>
      <aside className="desktop-filter-panel" aria-label="Listing filters">
        <div className="filter-panel-heading"><h2>Filters</h2><span className="muted">{activeFilterCount(appliedQuery) ? `${activeFilterCount(appliedQuery)} active` : "All listings"}</span></div>
        {form}
        <div className="filter-panel-footer"><button type="button" className="button button-secondary" onClick={() => { onClear(); setDraft(DEFAULT_DISCOVERY_QUERY); }}>Clear</button><button type="button" className="button" onClick={() => onApply(draft)}>Apply filters</button></div>
      </aside>
      {mobileOpen && <div className="filter-sheet-backdrop" role="presentation" onClick={() => setMobileOpen(false)}><section className="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label="Listing filters" onClick={(event) => event.stopPropagation()}><div className="filter-sheet-heading"><h2>Filters</h2><button className="text-button" type="button" onClick={() => setMobileOpen(false)}>Close</button></div>{form}<div className="filter-panel-footer"><button type="button" className="button button-secondary" onClick={() => { onClear(); setDraft(DEFAULT_DISCOVERY_QUERY); setMobileOpen(false); }}>Clear</button><button type="button" className="button" onClick={() => { onApply(draft); setMobileOpen(false); }}>Apply filters</button></div></section></div>}
    </>
  );
}

function RangeSlider({
  label,
  minimum,
  maximum,
  step,
  valueMin,
  valueMax,
  format,
  onChange,
}: {
  label: string;
  minimum: number;
  maximum: number;
  step: number;
  valueMin?: number;
  valueMax?: number;
  format: (value: number) => string;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) {
  const selectedMin = valueMin ?? minimum;
  const selectedMax = valueMax ?? maximum;
  const range = maximum - minimum;
  const start = ((selectedMin - minimum) / range) * 100;
  const end = 100 - ((selectedMax - minimum) / range) * 100;
  const toOptionalMin = (value: number) => value === minimum ? undefined : value;
  const toOptionalMax = (value: number) => value === maximum ? undefined : value;

  return (
    <section className="filter-section range-filter">
      <div className="range-filter-heading"><h3>{label}</h3><span>{valueMin === undefined && valueMax === undefined ? "Any" : `${format(selectedMin)} – ${format(selectedMax)}`}</span></div>
      <div className="dual-range" style={{ "--range-start": `${start}%`, "--range-end": `${end}%` } as CSSProperties}>
        <input className="range-slider-input range-slider-minimum" aria-label={`${label} minimum`} type="range" min={minimum} max={maximum} step={step} value={selectedMin} onChange={(event) => onChange(toOptionalMin(Math.min(Number(event.target.value), selectedMax - step)), toOptionalMax(selectedMax))} />
        <input className="range-slider-input range-slider-maximum" aria-label={`${label} maximum`} type="range" min={minimum} max={maximum} step={step} value={selectedMax} onChange={(event) => onChange(toOptionalMin(selectedMin), toOptionalMax(Math.max(Number(event.target.value), selectedMin + step)))} />
      </div>
      <div className="range-filter-limits"><span>{format(minimum)}</span><span>{format(maximum)}</span></div>
    </section>
  );
}
