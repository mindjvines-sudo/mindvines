/** Shared by the header's activity menu and the dashboard timeline. */
const ENTITY_LABELS: Record<string, string> = {
  ContactEnquiry: "Enquiry",
  BlogPost: "Blog post",
  SiteSettings: "Site settings",
};

export function describeActivity(item: { action: string; entity: string }): string {
  const entity = ENTITY_LABELS[item.entity] ?? item.entity.replace(/([a-z])([A-Z])/g, "$1 $2");
  const verbs: Record<string, string> = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    PUBLISH: "published",
    UNPUBLISH: "unpublished",
    ARCHIVE: "archived",
    LOGIN: "signed in",
    LOGOUT: "signed out",
    LOGIN_FAILED: "failed to sign in",
    MEDIA_UPLOAD: "uploaded",
    MEDIA_DELETE: "deleted",
    SETTINGS_UPDATE: "updated",
  };
  return `${entity} ${verbs[item.action] ?? item.action.toLowerCase().replace(/_/g, " ")}`;
}

/** Colour of the dot beside an activity entry, by what kind of action it was. */
export function activityTone(action: string) {
  if (action === "DELETE" || action === "MEDIA_DELETE" || action === "LOGIN_FAILED") return "bg-red-500";
  if (action === "CREATE" || action === "PUBLISH" || action === "MEDIA_UPLOAD") return "bg-emerald-500";
  if (action === "LOGIN" || action === "LOGOUT") return "bg-slate-400";
  return "bg-primary-500";
}
