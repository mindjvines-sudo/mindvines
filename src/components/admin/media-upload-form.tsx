"use client";

import { useRef, useState } from "react";
import { uploadFileWithProgress } from "@/lib/upload-with-progress";
import type { MediaItem } from "@/types/media";
import { Alert } from "@/components/admin/ui/feedback";
import { UploadIcon } from "@/components/admin/icons";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function MediaUploadForm({
  folder = "general",
  onUploaded,
}: {
  folder?: string;
  onUploaded: (media: MediaItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must not exceed 2 MB.");
      return;
    }

    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const result = await uploadFileWithProgress<MediaItem>("/api/media", formData, setProgress);
    setProgress(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onUploaded(result.data);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        aria-label="Upload an image: drag and drop, or press Enter to browse"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? "border-primary-500 bg-primary-50" : "border-line bg-slate-50/60 hover:border-primary-300 hover:bg-primary-50/40"
        }`}
      >
        <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-card">
          <UploadIcon className="size-5" />
        </span>
        <p className="text-sm font-medium text-slate-700">
          Drag and drop an image, or <span className="text-primary-700 underline underline-offset-2">browse</span>
        </p>
        <p className="text-xs text-slate-500">JPG, PNG, WEBP or AVIF, up to 2 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {progress !== null && (
        <div className="flex flex-col gap-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs tabular-nums text-slate-500">Uploading… {progress}%</p>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
