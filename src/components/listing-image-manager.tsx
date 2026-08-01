"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import type { ListingLifecycleStatus } from "@/lib/listing-image-lifecycle-client";
import {
  getOrderedPhotoTiles,
  processListingPhotoSelection,
  publishPersistedListing,
  removeListingPhoto,
  type PhotoFileState,
} from "@/lib/listing-image-manager";
import {
  appSettings,
  getImageAcceptValue,
  getImageCapacity,
  getImageLifecycleCopy,
  type AppSettings,
} from "@/lib/listing-images";
import type {
  ListingImage,
  ListingImageStorage,
} from "@/lib/storage/listing-image-storage";
import type {
  ListingImageLifecycleAction,
  ListingImageLifecycleResult,
} from "@/lib/listing-image-lifecycle-client";

interface ListingImageManagerProps {
  listingId: string;
  sellerId: string;
  vehicleLabel: string;
  initialStatus: ListingLifecycleStatus;
  storage: ListingImageStorage;
  executeLifecycle: (
    action: ListingImageLifecycleAction,
  ) => Promise<ListingImageLifecycleResult>;
  settings?: AppSettings;
}

export function ListingImageManager({
  listingId,
  sellerId,
  vehicleLabel,
  initialStatus,
  storage,
  executeLifecycle,
  settings = appSettings,
}: ListingImageManagerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<PhotoFileState[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [statusFeedback, setStatusFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    storage
      .list(listingId)
      .then((rows) => {
        if (!cancelled) setImages(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Listing photos could not be loaded. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, storage]);

  const capacity = getImageCapacity(images.length, settings);
  const lifecycleCopy = getImageLifecycleCopy(settings);
  const tiles = getOrderedPhotoTiles(images);
  const pendingStates = fileStates.filter(
    (state) => state.phase === "preparing" || state.phase === "uploading",
  );
  const completedStates = fileStates.filter(
    (state) => state.phase === "success" || state.phase === "error",
  );

  function updateFileState(nextState: PhotoFileState) {
    setFileStates((current) => {
      const withoutCurrent = current.filter((state) => state.id !== nextState.id);
      return [...withoutCurrent, nextState];
    });
    if (nextState.phase === "success" && nextState.image) {
      setImages((current) =>
        current.some((image) => image.id === nextState.image?.id)
          ? current
          : [...current, nextState.image as ListingImage].sort(
              (left, right) => left.position - right.position,
            ),
      );
    }
  }

  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    setSelectionError(null);
    setStatusFeedback(null);
    setFileStates([]);
    const result = await processListingPhotoSelection({
      files,
      images,
      listingId,
      sellerId,
      settings,
      upload: (input) => storage.upload(input),
      onFileState: updateFileState,
    });
    setSelectionError(result.selectionError);
  }

  async function removePhoto(image: ListingImage, ordinal: number) {
    if (!window.confirm("Remove this photo permanently? This cannot be undone.")) {
      return;
    }

    setDeletingIds((current) => [...current, image.id]);
    setStatusFeedback(null);
    const result = await removeListingPhoto({
      image,
      images,
      listingId,
      currentStatus: status,
      execute: executeLifecycle,
    });
    setStatus(result.status);
    if (result.ok) {
      setImages((current) => current.filter((row) => row.id !== image.id));
    }
    setStatusFeedback({
      kind: result.ok ? "success" : "error",
      message: result.message,
    });
    setDeletingIds((current) => current.filter((id) => id !== image.id));

    if (!result.ok) {
      inputRef.current?.focus();
    } else if (ordinal > 1) {
      inputRef.current?.focus();
    }
  }

  async function publish() {
    setPublishing(true);
    setStatusFeedback(null);
    const result = await publishPersistedListing({
      listingId,
      currentStatus: status,
      execute: executeLifecycle,
    });
    setStatus(result.status);
    setStatusFeedback({
      kind: result.ok ? "success" : "error",
      message: result.message,
    });
    setPublishing(false);
  }

  const canPublish =
    status === "draft" &&
    (images.length >= lifecycleCopy.minimumToPublish);

  return (
    <fieldset className="photo-manager">
      <legend>Photos</legend>
      <div className="photo-manager-heading">
        <p>
          {images.length} of {capacity.maximum} photos added. The first photo is used as the cover.
        </p>
        <label className="visually-hidden" htmlFor={inputId}>Choose listing photos</label>
        <input
          ref={inputRef}
          className="visually-hidden"
          id={inputId}
          type="file"
          multiple
          accept={getImageAcceptValue(settings)}
          disabled={capacity.remaining === 0 || loading}
          onChange={(event) => void selectPhotos(event)}
        />
        <button
          className="button button-small photo-add-button"
          type="button"
          disabled={capacity.remaining === 0 || loading}
          onClick={() => inputRef.current?.click()}
        >
          Add photos
        </button>
      </div>

      {loading ? (
        <div className="photo-manager-state" role="status">Loading photos…</div>
      ) : loadError ? (
        <div className="form-alert error" role="alert">{loadError}</div>
      ) : images.length === 0 && pendingStates.length === 0 ? (
        <div className="photo-manager-empty">
          <h3>No photos yet</h3>
          <p>{lifecycleCopy.emptyState}</p>
        </div>
      ) : null}

      {(tiles.length > 0 || pendingStates.length > 0) && (
        <div className="photo-grid">
          {tiles.map((tile) => (
            <article className="photo-tile" key={tile.id}>
              <div className="photo-frame">
                <img
                  src={tile.publicUrl}
                  alt={`${vehicleLabel} — photo ${tile.ordinal}`}
                />
                {tile.isCover && <span className="photo-cover-label">Cover</span>}
              </div>
              <div className="photo-tile-caption">
                <span>Photo {tile.ordinal}</span>
                <button
                  className="text-button destructive photo-remove-button"
                  type="button"
                  aria-label={`Remove photo ${tile.ordinal}`}
                  disabled={deletingIds.includes(tile.id)}
                  onClick={() => void removePhoto(tile, tile.ordinal)}
                >
                  {deletingIds.includes(tile.id) ? "Removing…" : "Remove photo"}
                </button>
              </div>
            </article>
          ))}
          {pendingStates.map((fileState) => (
            <article className="photo-tile photo-tile-pending" key={fileState.id} aria-live="polite">
              <div className="photo-frame photo-progress" aria-hidden="true" />
              <div className="photo-tile-caption">
                <span className="photo-file-name">{fileState.fileName}</span>
                <span>{fileState.message}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectionError && <p className="form-alert error" role="alert">{selectionError}</p>}
      {completedStates.length > 0 && (
        <div className="photo-file-feedback" aria-live="polite">
          {completedStates.map((fileState) => (
            <p
              className={`form-alert ${fileState.phase === "error" ? "error" : "success"}`}
              key={fileState.id}
              role={fileState.phase === "error" ? "alert" : "status"}
            >
              {fileState.message}
            </p>
          ))}
        </div>
      )}
      {statusFeedback && (
        <p
          className={`form-alert ${statusFeedback.kind}`}
          role={statusFeedback.kind === "error" ? "alert" : "status"}
        >
          {statusFeedback.message}
        </p>
      )}

      {status === "draft" && (
        <div className="photo-publish-guidance">
          <p>
            {canPublish
              ? "Your photos are saved. Publish when you are ready."
              : lifecycleCopy.draftNotice}
          </p>
          {canPublish && (
            <button className="button button-secondary" type="button" disabled={publishing} onClick={() => void publish()}>
              {publishing ? "Publishing…" : "Publish listing"}
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
