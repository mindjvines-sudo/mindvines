import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { validateImageFile } from "@/lib/media-validation";
import { logAction } from "@/services/audit.service";
import * as mediaService from "@/services/media.service";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const result = await mediaService.listMediaAdmin({
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string | null) || "general";
  const altText = (formData.get("altText") as string | null) ?? undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const validation = await validateImageFile(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const media = await mediaService.uploadMedia(
    validation.buffer,
    { filename: file.name, folder, altText },
    user.id
  );

  await logAction({
    userId: user.id,
    action: "MEDIA_UPLOAD",
    entity: "Media",
    entityId: media._id.toString(),
  });

  return NextResponse.json(media, { status: 201 });
}
