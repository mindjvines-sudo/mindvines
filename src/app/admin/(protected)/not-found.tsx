import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/feedback";
import { ButtonLink } from "@/components/admin/ui/button";
import { SearchIcon } from "@/components/admin/icons";

/**
 * The admin's 404, inside the sidebar: an unknown admin address (see
 * ./[...missing]) or a record that no longer exists, such as a deleted
 * enquiry or subscriber.
 */
export default function AdminNotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchIcon}
        title="Page not found"
        description="This page doesn’t exist, or the item it showed has been deleted."
        action={<ButtonLink href="/admin/dashboard">Go to dashboard</ButtonLink>}
        className="py-20"
      />
    </Card>
  );
}
