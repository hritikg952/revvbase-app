import { describe, expect, it } from "vitest";
import {
  vehicleCatalog,
  getVehicleBrandById,
  getVehicleModelById,
  resolveVehicleSelection,
} from "./vehicles";

describe("vehicle catalog", () => {
  it("contains a curated set of active Indian two-wheeler brands with core models", () => {
    expect(vehicleCatalog).toHaveLength(18);
    expect(new Set(vehicleCatalog.map((brand) => brand.id)).size).toBe(vehicleCatalog.length);
    expect(vehicleCatalog.every((brand) => brand.models.length > 0)).toBe(true);
    expect(
      vehicleCatalog.every(
        (brand) => new Set(brand.models.map((model) => model.id)).size === brand.models.length,
      ),
    ).toBe(true);
  });

  it("resolves a model through stable brand and model IDs", () => {
    expect(getVehicleBrandById("honda")?.name).toBe("Honda");
    expect(getVehicleModelById("honda", "activa-6g")).toMatchObject({
      id: "activa-6g",
      name: "Activa 6G",
      fuelType: "petrol",
    });
    expect(getVehicleModelById("honda", "ather-450x")).toBeUndefined();
  });

  it("retains non-catalogued legacy make and model values for an edit form", () => {
    expect(resolveVehicleSelection("Legacy Motors", "Roadster 200")).toMatchObject({
      retainedMake: "Legacy Motors",
      retainedModel: "Roadster 200",
      models: [],
    });

    expect(resolveVehicleSelection("Honda", "Retired Hero")).toMatchObject({
      brand: { id: "honda", name: "Honda" },
      retainedModel: "Retired Hero",
    });
  });
});
