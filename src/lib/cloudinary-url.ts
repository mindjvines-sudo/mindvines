/**
 * Inserts an f_auto,q_auto,w_<width> transformation into a Cloudinary
 * delivery URL so admin thumbnails (media grid, picker) don't ship the full
 * original asset just to render a small square preview. Public pages don't
 * need this — next/image already resizes/optimizes those server-side.
 */
export function cloudinaryThumbnail(secureUrl: string, width = 300): string {
  const marker = "/upload/";
  const index = secureUrl.indexOf(marker);
  if (index === -1) return secureUrl;

  const insertAt = index + marker.length;
  return `${secureUrl.slice(0, insertAt)}f_auto,q_auto,w_${width}/${secureUrl.slice(insertAt)}`;
}
