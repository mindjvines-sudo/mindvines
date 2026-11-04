"use client";

import { useEffect, useState } from "react";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/admin/ui/modal";
import { Button } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { EmptyState, Skeleton } from "@/components/admin/ui/feedback";
import { ImageIcon, SearchIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";

export function MediaPicker({
  name,
  label,
  hideLabel = false,
  initial = null,
  folder = "general",
}: {
  name: string;
  label: string;
  /** Keep the label for screen readers only, when a card title already names the field. */
  hideLabel?: boolean;
  initial?: MediaItem | null;
  folder?: string;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(initial);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn("text-[13px] font-medium text-slate-700", hideLabel && "sr-only")}>{label}</span>
      <input type="hidden" name={name} value={selected?._id ?? ""} />

      {selected ? (
        <div className="overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only picker preview, not a public page */}
          <img
            src={cloudinaryThumbnail(selected.secureUrl, 640)}
            alt={selected.altText ?? ""}
            className="aspect-video w-full bg-slate-50 object-cover"
          />
          <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
            <p className="min-w-0 truncate text-xs text-slate-500">{selected.filename}</p>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
                Change
              </Button>
              <Button variant="danger-soft" size="sm" onClick={() => setSelected(null)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-slate-50/60 px-4 py-7 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-card">
            <ImageIcon className="size-5" />
          </span>
          <span className="text-sm font-medium text-slate-700">Select an image</span>
          <span className="text-xs text-slate-500">From the library or upload a new one</span>
        </button>
      )}

      {isOpen && (
        <MediaPickerModal
          folder={folder}
          onClose={() => setIsOpen(false)}
          onSelect={(media) => {
            setSelected(media);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function MediaPickerModal({
  folder,
  onClose,
  onSelect,
}: {
  folder: string;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (tab !== "library") return;
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      setIsLoading(true);
      setLoadError(false);
      const params = new URLSearchParams({ limit: "24" });
      if (search) params.set("search", search);

      fetch(`/api/media?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { items: MediaItem[] }) => setItems(data.items ?? []))
        .catch((error: unknown) => {
          if ((error as Error).name !== "AbortError") setLoadError(true);
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [tab, search]);

  return (
    <Modal open onClose={onClose} title="Media library" description="Choose an image or upload a new one." size="lg">
      <div role="tablist" aria-label="Image source" className="mb-5 inline-flex rounded-xl bg-slate-100/80 p-1">
        <TabButton active={tab === "library"} onClick={() => setTab("library")}>
          Choose from library
        </TabButton>
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload new
        </TabButton>
      </div>

      {tab === "library" ? (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by filename or alt text"
              aria-label="Search media"
              className={inputClasses(false, "h-10 pl-9")}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : loadError ? (
            <EmptyState icon={ImageIcon} title="Couldn’t load the library" description="Check your connection and try again." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title={search ? "No images match your search" : "The library is empty"}
              description={search ? undefined : "Switch to “Upload new” to add the first image."}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-label={`Select ${item.filename}`}
                  className="group overflow-hidden rounded-xl border border-line transition-shadow hover:ring-2 hover:ring-primary-500 hover:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin-only picker grid */}
                  <img
                    src={cloudinaryThumbnail(item.secureUrl, 200)}
                    alt={item.altText ?? ""}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <MediaUploadForm folder={folder} onUploaded={onSelect} />
      )}
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-3 text-[13px] font-medium transition-colors",
        active ? "bg-white text-navy-900 shadow-card" : "text-slate-500 hover:text-slate-800",
      )}
    >
      {children}
    </button>
  );
}
