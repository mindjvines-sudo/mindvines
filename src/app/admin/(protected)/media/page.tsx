import type { Metadata } from "next";
import { listMediaAdmin } from "@/services/media.service";
import { MediaLibrary } from "@/components/admin/media-library";
import type { MediaItem } from "@/types/media";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  const result = await listMediaAdmin({});

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Media library" description="Images used in blog posts, services, testimonials and doctor profiles. Images in use can’t be deleted." />
      <MediaLibrary
        initial={{
          items: JSON.parse(JSON.stringify(result.items)) as MediaItem[],
          page: result.page,
          pages: result.pages,
          total: result.total,
        }}
      />
    </div>
  );
}
