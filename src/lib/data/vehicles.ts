import type { FuelType } from "@/lib/database.types";

export interface VehicleModel {
  id: string;
  name: string;
  fuelType: FuelType;
}

export interface VehicleBrand {
  id: string;
  name: string;
  models: readonly VehicleModel[];
}

export interface VehicleSelection {
  brand?: VehicleBrand;
  models: readonly VehicleModel[];
  selectedModel?: VehicleModel;
  retainedMake?: string;
  retainedModel?: string;
}

// Review this catalog quarterly to keep active Indian-market brands and models current.
export const vehicleCatalog: readonly VehicleBrand[] = [
  { id: "ather", name: "Ather", models: [
    { id: "ather-450s", name: "450S", fuelType: "electric" },
    { id: "ather-450x", name: "450X", fuelType: "electric" },
  ] },
  { id: "bajaj", name: "Bajaj", models: [
    { id: "bajaj-pulsar-n160", name: "Pulsar N160", fuelType: "petrol" },
    { id: "bajaj-pulsar-ns200", name: "Pulsar NS200", fuelType: "petrol" },
    { id: "bajaj-chetak", name: "Chetak", fuelType: "electric" },
  ] },
  { id: "bmw", name: "BMW", models: [
    { id: "bmw-g-310-r", name: "G 310 R", fuelType: "petrol" },
    { id: "bmw-g-310-gs", name: "G 310 GS", fuelType: "petrol" },
  ] },
  { id: "ducati", name: "Ducati", models: [
    { id: "ducati-monster", name: "Monster", fuelType: "petrol" },
    { id: "ducati-panigale-v4", name: "Panigale V4", fuelType: "petrol" },
  ] },
  { id: "harley-davidson", name: "Harley-Davidson", models: [
    { id: "harley-davidson-x440", name: "X440", fuelType: "petrol" },
    { id: "harley-davidson-nightster", name: "Nightster", fuelType: "petrol" },
  ] },
  { id: "hero", name: "Hero", models: [
    { id: "hero-splendor-plus", name: "Splendor Plus", fuelType: "petrol" },
    { id: "hero-xpulse-200", name: "XPulse 200", fuelType: "petrol" },
  ] },
  { id: "honda", name: "Honda", models: [
    { id: "activa-6g", name: "Activa 6G", fuelType: "petrol" },
    { id: "honda-shine-125", name: "Shine 125", fuelType: "petrol" },
    { id: "honda-cb350", name: "CB350", fuelType: "petrol" },
  ] },
  { id: "jawa", name: "Jawa", models: [
    { id: "jawa-42", name: "42", fuelType: "petrol" },
    { id: "jawa-350", name: "350", fuelType: "petrol" },
  ] },
  { id: "ktm", name: "KTM", models: [
    { id: "ktm-200-duke", name: "200 Duke", fuelType: "petrol" },
    { id: "ktm-390-duke", name: "390 Duke", fuelType: "petrol" },
  ] },
  { id: "ola-electric", name: "Ola Electric", models: [
    { id: "ola-s1-pro", name: "S1 Pro", fuelType: "electric" },
    { id: "ola-s1-x", name: "S1 X", fuelType: "electric" },
  ] },
  { id: "revolt", name: "Revolt", models: [
    { id: "revolt-rv400", name: "RV400", fuelType: "electric" },
    { id: "revolt-rvz", name: "RVZ", fuelType: "electric" },
  ] },
  { id: "royal-enfield", name: "Royal Enfield", models: [
    { id: "royal-enfield-classic-350", name: "Classic 350", fuelType: "petrol" },
    { id: "royal-enfield-himalayan-450", name: "Himalayan 450", fuelType: "petrol" },
  ] },
  { id: "suzuki", name: "Suzuki", models: [
    { id: "suzuki-access-125", name: "Access 125", fuelType: "petrol" },
    { id: "suzuki-gixxer-155", name: "Gixxer 155", fuelType: "petrol" },
  ] },
  { id: "tvs", name: "TVS", models: [
    { id: "tvs-apache-rtr-160", name: "Apache RTR 160", fuelType: "petrol" },
    { id: "tvs-ntorq-125", name: "NTORQ 125", fuelType: "petrol" },
    { id: "tvs-iqube", name: "iQube", fuelType: "electric" },
  ] },
  { id: "triumph", name: "Triumph", models: [
    { id: "triumph-speed-400", name: "Speed 400", fuelType: "petrol" },
    { id: "triumph-scrambler-400-x", name: "Scrambler 400 X", fuelType: "petrol" },
  ] },
  { id: "vespa", name: "Vespa", models: [
    { id: "vespa-vxl-125", name: "VXL 125", fuelType: "petrol" },
    { id: "vespa-sxl-125", name: "SXL 125", fuelType: "petrol" },
  ] },
  { id: "vida", name: "Vida", models: [
    { id: "vida-v2-pro", name: "V2 Pro", fuelType: "electric" },
    { id: "vida-v2-plus", name: "V2 Plus", fuelType: "electric" },
  ] },
  { id: "yamaha", name: "Yamaha", models: [
    { id: "yamaha-r15-v4", name: "R15 V4", fuelType: "petrol" },
    { id: "yamaha-mt-15-v2", name: "MT-15 V2", fuelType: "petrol" },
  ] },
];

export function getVehicleBrandById(brandId: string): VehicleBrand | undefined {
  return vehicleCatalog.find((brand) => brand.id === brandId);
}

export function getVehicleModelById(
  brandId: string,
  modelId: string,
): VehicleModel | undefined {
  return getVehicleBrandById(brandId)?.models.find((model) => model.id === modelId);
}

function hasMatchingName(candidate: string, value: string): boolean {
  return candidate.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase();
}

export function resolveVehicleSelection(make: string, model: string): VehicleSelection {
  const brand = vehicleCatalog.find((candidate) => hasMatchingName(candidate.name, make));
  const selectedModel = brand?.models.find((candidate) => hasMatchingName(candidate.name, model));

  return {
    brand,
    models: brand?.models ?? [],
    selectedModel,
    retainedMake: make && !brand ? make : undefined,
    retainedModel: model && !selectedModel ? model : undefined,
  };
}
