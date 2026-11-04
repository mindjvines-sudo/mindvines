"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/utils";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { Modal } from "@/components/admin/ui/modal";
import { Button } from "@/components/admin/ui/button";
import { Field, Input } from "@/components/admin/ui/form";
import { Alert, Skeleton } from "@/components/admin/ui/feedback";
import { CheckIcon, TrashIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";
import type { MediaUsage } from "@/services/media.service";

const USAGE_LABELS: Record<MediaUsage["type"], string> = {
  blog: "Blog",
  testimonial: "Testimonial",
  doctor: "Doctor",
  service: "Service",
  location: "Location",
};

export function MediaDetailModal({
  media,
  onClose,
  onDeleted,
}: {
  media: MediaItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [altText, setAltText] = useState(media.altText ?? "");
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/media/${media._id}`)
      .then((res) => res.json())
      .then((data: { usage: MediaUsage[] }) => setUsage(data.usage ?? []))
      .catch(() => setUsage([]));
  }, [media._id]);

  async function saveAltText() {
    setIsSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch(`/api/media/${media._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ altText }),
    }).catch(() => null);
    setIsSaving(false);
    if (res?.ok) setSaved(true);
    else setError("Couldn’t save the alt text. Please try again.");
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    const res = await fetch(`/api/media/${media._id}`, { method: "DELETE" });

    if (res.status === 409) {
      const body = await res.json();
      setError(body.error);
      setUsage(body.usage ?? []);
      setIsDeleting(false);
      setConfirmDelete(false);
      return;
    }

    if (!res.ok) {
      setError("Failed to delete media.");
      setIsDeleting(false);
      return;
    }

    onDeleted(media._id);
  }

  const isReferenced = (usage?.length ?? 0) > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Image details"
      description={media.filename}
      size="lg"
      footer={
        confirmDelete ? (
          <>
            <p className="text-sm text-slate-600 sm:mr-auto sm:self-center">Delete this image permanently?</p>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete image"}
            </Button>
          </>
        ) : (
          <Button
            variant="danger-soft"
            onClick={() => setConfirmDelete(true)}
            disabled={isReferenced || usage === null}
            title={isReferenced ? "This image is currently being used and cannot be deleted." : undefined}
          >
            <TrashIcon />
            Delete image
          </Button>
        )
      }
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview */}
        <img
          src={cloudinaryThumbnail(media.secureUrl, 800)}
          alt={media.altText ?? ""}
          className="w-full rounded-xl border border-line bg-slate-50 object-contain"
        />

        <div className="flex min-w-0 flex-col gap-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Dimensions</dt>
            <dd className="tabular-nums text-navy-900">
              {media.width}×{media.height}
            </dd>
            <dt className="text-slate-500">Size</dt>
            <dd className="text-navy-900">{formatBytes(media.bytes)}</dd>
            <dt className="text-slate-500">Uploaded</dt>
            <dd className="text-navy-900">{new Date(media.createdAt).toLocaleDateString()}</dd>
          </dl>

          <Field label="Alt text" htmlFor="altText" hint="Describe the image for screen readers and search engines.">
            <div className="flex gap-2">
              <Input
                id="altText"
                value={altText}
                onChange={(event) => {
                  setAltText(event.target.value);
                  setSaved(false);
                }}
                placeholder="Describe this image"
              />
              <Button variant="secondary" onClick={saveAltText} disabled={isSaving}>
                {saved ? <CheckIcon /> : null}
                {isSaving ? "Saving…" : saved ? "Saved" : "Save"}
              </Button>
            </div>
          </Field>

          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">Used in</p>
            {usage === null && <Skeleton className="h-9 w-full" />}
            {usage?.length === 0 && <p className="text-sm text-slate-500">Not used anywhere.</p>}
            {usage && usage.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {usage.map((entry) => (
                  <li
                    key={`${entry.type}-${entry.id}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 shadow-card">
                      {USAGE_LABELS[entry.type]}
                    </span>
                    <span className="truncate">{entry.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </div>
    </Modal>
  );
}
