import { z } from "zod";
import { safeLink } from "@/lib/cms/sanitize";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const label = z.string().trim().min(1, "Every item needs a name").max(60, "Names are limited to 60 characters");
const href = z.string().trim().max(300).refine((value) => safeLink(value) !== null, "Start the link with /, #, https://, mailto: or tel: and use a valid address");

const childSchema = z.object({
  ageGroup: z.enum(SUBSCRIPTION_AGE_GROUPS),
  label: label.optional(),
  href: href.refine((value) => value.length > 0, "Every age-group link needs an address").optional(),
});

const itemSchema = z.object({
  kind: z.enum(["link", "topics", "plans"]),
  label,
  href,
  hidden: z.boolean().optional(),
  children: z.array(childSchema).max(SUBSCRIPTION_AGE_GROUPS.length).optional(),
}).superRefine((item, context) => {
  if (item.kind === "link" && !item.href) {
    context.addIssue({ code: "custom", path: ["href"], message: `Add a link for “${item.label}”.` });
  }
  if (item.children && new Set(item.children.map((child) => child.ageGroup)).size !== item.children.length) {
    context.addIssue({ code: "custom", path: ["children"], message: "Each age group can appear only once in a dropdown." });
  }
});

export const menuSchema = z.array(itemSchema).max(20, "Up to 20 items");
