export type GalleryMode = "placeholder" | "static" | "carousel";

export function getGalleryMode(imageCount: number): GalleryMode {
  if (imageCount <= 0) return "placeholder";
  return imageCount === 1 ? "static" : "carousel";
}

export function getNextGalleryIndex(
  currentIndex: number,
  direction: -1 | 1,
  imageCount: number,
): number {
  if (imageCount <= 1) return 0;
  return (currentIndex + direction + imageCount) % imageCount;
}
