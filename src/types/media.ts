// Mongoose types a populated ref field by its declared ObjectId type, not
// the shape it becomes after .populate(), so callers can't rely on TS
// narrowing there. This accepts `unknown` and asserts explicitly instead.
export type PopulatedMedia = { secureUrl: string; altText?: string; width?: number; height?: number };

export function asPopulatedMedia(value: unknown): PopulatedMedia | null {
  if (value && typeof value === "object" && "secureUrl" in value) {
    return value as PopulatedMedia;
  }
  return null;
}

export type MediaItem = {
  _id: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format?: string;
  width?: number;
  height?: number;
  bytes: number;
  filename: string;
  altText?: string;
  caption?: string;
  folder: string;
  createdAt: string;
};
