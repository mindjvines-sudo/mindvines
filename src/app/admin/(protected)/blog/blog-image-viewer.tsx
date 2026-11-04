"use client";

import { useRef } from "react";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import type { PopulatedMedia } from "@/types/media";

export function BlogImageViewer({ image, title, large = false }: {
  image: PopulatedMedia | null;
  title: string;
  large?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  if (!image) {
    return large ? null : (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-400">
        No image
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`View image for ${title}`}
        className={`shrink-0 overflow-hidden border border-line bg-slate-50 transition-opacity hover:opacity-90 ${large ? "w-full cursor-zoom-in rounded-xl" : "h-12 w-16 cursor-zoom-in rounded-lg"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin media preview */}
        <img src={cloudinaryThumbnail(image.secureUrl, large ? 1200 : 160)} alt={image.altText || title} loading="lazy" className={large ? "max-h-[32rem] w-full object-contain" : "h-full w-full object-cover"} />
      </button>
      <dialog
        ref={dialog}
        aria-label={`Image for ${title}`}
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-pop sm:p-5"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="truncate font-medium text-navy-900">{title}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="h-9 shrink-0 rounded-xl border border-line px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- display original image in viewer */}
        <img src={image.secureUrl} alt={image.altText || title} loading="lazy" className="max-h-[70vh] w-full object-contain" />
      </dialog>
    </>
  );
}
