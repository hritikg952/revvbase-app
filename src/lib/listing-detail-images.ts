export interface DetailImageDescriptor {
  src: string;
  position: number;
}

interface PublicImageRecord {
  publicUrl: unknown;
  position: unknown;
}

/**
 * Converts the Phase 6 public image projection into the small display-only
 * contract consumed by the detail gallery. Storage keys never leave this seam.
 */
export function getDetailImageDescriptors(
  records: readonly PublicImageRecord[] | null | undefined,
): DetailImageDescriptor[] {
  if (!records) return [];

  return records
    .filter(
      (record): record is { publicUrl: string; position: number } =>
        typeof record.publicUrl === "string" &&
        record.publicUrl.length > 0 &&
        typeof record.position === "number" &&
        Number.isFinite(record.position),
    )
    .map(({ publicUrl, position }) => ({ src: publicUrl, position }))
    .sort((left, right) => left.position - right.position);
}
