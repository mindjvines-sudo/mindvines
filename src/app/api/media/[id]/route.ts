import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { logAction } from "@/services/audit.service";
import * as mediaService from "@/services/media.service";
import { MediaInUseError } from "@/services/media.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [media, usage] = await Promise.all([mediaService.getMediaById(id), mediaService.findMediaUsage(id)]);

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ media, usage });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates = {
    altText: typeof body.altText === "string" ? body.altText : undefined,
    caption: typeof body.caption === "string" ? body.caption : undefined,
  };

  const media = await mediaService.updateMediaMetadata(id, updates);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(media);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await mediaService.deleteMedia(id);
  } catch (error) {
    if (error instanceof MediaInUseError) {
      return NextResponse.json({ error: error.message, usage: error.usage }, { status: 409 });
    }
    throw error;
  }

  await logAction({ userId: user.id, action: "MEDIA_DELETE", entity: "Media", entityId: id });

  return NextResponse.json({ success: true });
}
