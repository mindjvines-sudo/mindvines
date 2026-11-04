export type UploadResult<T> = { ok: true; data: T } | { ok: false; error: string };

// fetch() has no reliable cross-browser upload progress event, so the
// upload UI (progress bar, per spec) needs XHR under the hood.
export function uploadFileWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<UploadResult<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: body as T });
      } else {
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Upload failed.";
        resolve({ ok: false, error: message });
      }
    };

    xhr.onerror = () => resolve({ ok: false, error: "Upload failed. Check your connection." });

    xhr.send(formData);
  });
}
