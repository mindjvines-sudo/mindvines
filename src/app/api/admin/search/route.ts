import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listPagesAdmin } from "@/services/page.service";
import { listBlogPostsAdmin } from "@/services/blog.service";
import { listTestimonialsAdmin } from "@/services/testimonial.service";
import { listAgeGroupsAdmin } from "@/services/age-group.service";
import { listEnquiriesAdmin } from "@/services/enquiry.service";

export type SearchResult = { type: string; label: string; sublabel?: string; href: string };

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searches: Promise<SearchResult[]>[] = [];

  if (can(user.role, "read", "pages")) {
    searches.push(
      listPagesAdmin({ search: query, limit: 5 }).then((res) =>
        res.items.map((item) => ({
          type: "Page",
          label: item.title,
          sublabel: item.status,
          href: `/admin/pages/${item.id}/edit`,
        }))
      )
    );
  }

  if (can(user.role, "read", "blog")) {
    searches.push(
      listBlogPostsAdmin({ search: query, limit: 5 }).then((res) =>
        res.items.map((item) => ({
          type: "Blog",
          label: item.title,
          sublabel: item.status,
          href: `/admin/blog/${item._id}/edit`,
        }))
      )
    );
  }

  if (can(user.role, "read", "testimonials")) {
    searches.push(
      listTestimonialsAdmin({ search: query, limit: 5 }).then((res) =>
        res.items.map((item) => ({
          type: "Testimonial",
          label: item.authorName,
          sublabel: item.status === "PUBLISHED" ? "ACTIVE" : "INACTIVE",
          href: `/admin/testimonials/${item._id}/edit`,
        }))
      )
    );
  }

  if (can(user.role, "read", "ageGroups")) {
    searches.push(
      listAgeGroupsAdmin({ search: query }).then((items) =>
        items.slice(0, 5).map((item) => ({
          type: "Age group",
          label: item.title,
          sublabel: item.status,
          href: `/admin/age-groups/${item._id}/edit`,
        }))
      )
    );
  }

  if (can(user.role, "read", "enquiries")) {
    searches.push(
      listEnquiriesAdmin({ search: query, limit: 5 }).then((res) =>
        res.items.map((item) => ({
          type: "Enquiry",
          label: item.name,
          sublabel: item.subject || item.status,
          href: `/admin/enquiries/${item._id}`,
        }))
      )
    );
  }

  const results = (await Promise.all(searches)).flat();

  return NextResponse.json({ results });
}
