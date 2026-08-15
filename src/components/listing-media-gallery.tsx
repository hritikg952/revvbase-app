"use client";

import { useState } from "react";
import type { DetailImageDescriptor } from "@/lib/listing-detail-images";
import { getGalleryMode, getNextGalleryIndex } from "@/lib/listing-detail-media";

const placeholder = "/vehicle-placeholder.svg";

export function ListingMediaGallery({
  images,
  vehicleName,
}: {
  images: readonly DetailImageDescriptor[];
  vehicleName: string;
}) {
  const mode = getGalleryMode(images.length);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImageIndexes, setFailedImageIndexes] = useState<ReadonlySet<number>>(new Set());
  const activeImage = images[selectedIndex];
  const displaySrc = activeImage && !failedImageIndexes.has(selectedIndex)
    ? activeImage.src
    : placeholder;
  const photoAlt = activeImage && !failedImageIndexes.has(selectedIndex)
    ? `${vehicleName} — photo ${selectedIndex + 1} of ${images.length}`
    : "Stock two-wheeler illustration";

  if (mode === "placeholder") {
    return (
      <div className="listing-detail-media listing-detail-placeholder">
        <img src={placeholder} alt="Stock two-wheeler illustration" />
      </div>
    );
  }

  const selectIndex = (index: number) => setSelectedIndex(index);

  return (
    <section
      className="listing-detail-media"
      aria-label={mode === "carousel" ? `${vehicleName} photo gallery` : undefined}
      aria-roledescription={mode === "carousel" ? "carousel" : undefined}
    >
      <img
        src={displaySrc}
        alt={photoAlt}
        onError={() => setFailedImageIndexes((current) => new Set(current).add(selectedIndex))}
      />
      {mode === "carousel" && (
        <>
          <div className="gallery-arrows">
            <button
              type="button"
              className="gallery-control"
              onClick={() => selectIndex(getNextGalleryIndex(selectedIndex, -1, images.length))}
              aria-label="Show previous photo"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              className="gallery-control"
              onClick={() => selectIndex(getNextGalleryIndex(selectedIndex, 1, images.length))}
              aria-label="Show next photo"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="gallery-indicators" aria-label="Choose a photo">
            {images.map((image, index) => (
              <button
                key={`${image.position}-${image.src}`}
                type="button"
                className={`gallery-indicator${index === selectedIndex ? " selected" : ""}`}
                onClick={() => selectIndex(index)}
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-pressed={index === selectedIndex}
              >
                <span className="visually-hidden">Photo {index + 1}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
