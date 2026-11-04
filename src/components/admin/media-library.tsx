"use client";

import { useEffect, useRef, useState } from "react";
import { formatBytes } from "@/lib/utils";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { Card } from "@/components/admin/ui/card";
import { Modal } from "@/components/admin/ui/modal";
import { Button } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { Alert, EmptyState, Skeleton } from "@/components/admin/ui/feedback";
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, SearchIcon, UploadIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";

type ListResponse = { items: MediaItem[]; page: number; pages: number; total: number };

export function MediaLibrary({ initial }: { initial: ListResponse }) {
  const [data, setData] = useState<ListResponse>(initial);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // The server already rendered page 1 with no search.
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setLoadError(false);
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (search) params.set("search", search);

      fetch(`/api/media?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then(setData)
        .catch((error: unknown) => {
          if ((error as Error).name !== "AbortError") setLoadError(true);
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, page]);

  function handleUploaded(media: MediaItem) {
    setIsUploadOpen(false);
    setData((prev) => ({ ...prev, items: [media, ...prev.items], total: prev.total + 1 }));
  }

  function handleDeleted(id: string) {
    setSelected(null);
    setData((prev) => ({ ...prev, items: prev.items.filter((item) => item._id !== id), total: prev.total - 1 }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by filename or alt text"
            aria-label="Search media"
            className={inputClasses(false, "h-10 pl-9")}
          />
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <UploadIcon />
          Upload image
        </Button>
      </div>

      <div className="border-t border-line p-4 sm:p-5">
        {loadError && (
          <Alert tone="error" className="mb-4">
            Couldn’t load media. Check your connection and try again.
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-4/5 rounded-xl" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={search ? "No images match your search" : "No media yet"}
            description={search ? "Try a different filename or alt text." : "Upload images to use in blog posts, testimonials and doctor profiles."}
            action={
              !search && (
                <Button onClick={() => setIsUploadOpen(true)}>
                  <UploadIcon />
                  Upload image
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {data.items.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  aria-label={`Open details for ${item.filename}`}
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-line bg-white text-left transition-[box-shadow,border-color] hover:border-primary-300 hover:shadow-pop"
                >
                  <span className="block overflow-hidden bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-only grid */}
                    <img
                      src={cloudinaryThumbnail(item.secureUrl, 300)}
                      alt={item.altText ?? ""}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="flex flex-col gap-0.5 px-3 py-2.5">
                    <span className="truncate text-xs font-medium text-navy-900">{item.filename}</span>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {item.width}×{item.height} · {formatBytes(item.bytes)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-slate-500 sm:flex-row">
        <p>
          <span className="font-medium tabular-nums text-slate-700">{data.total}</span> {data.total === 1 ? "image" : "images"}
        </p>
        {data.pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeftIcon />
              Previous
            </Button>
            <span className="tabular-nums">
              {data.page} / {data.pages}
            </span>
            <Button variant="secondary" size="sm" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload image"
        description="Add an image to the media library."
      >
        <MediaUploadForm onUploaded={handleUploaded} />
      </Modal>

      {selected && (
        <MediaDetailModal media={selected} onClose={() => setSelected(null)} onDeleted={handleDeleted} />
      )}
    </Card>
  );
}
