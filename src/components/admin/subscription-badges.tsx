import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import {
  SUBSCRIPTION_STATE_LABELS,
  type PaymentStatus,
  type SubscriptionState,
} from "@/lib/subscription-status";

const STATE_TONES: Record<SubscriptionState, BadgeTone> = {
  ACTIVE: "green",
  UPCOMING: "blue",
  EXPIRING_SOON: "amber",
  EXPIRING_TODAY: "red",
  EXPIRED: "slate",
  PENDING_PAYMENT: "blue",
  CANCELLED: "slate",
};

export function SubscriptionStateBadge({ state }: { state: SubscriptionState }) {
  return <Badge tone={STATE_TONES[state]}>{SUBSCRIPTION_STATE_LABELS[state]}</Badge>;
}

const PAYMENT: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PAID: { label: "Paid", tone: "green" },
  PENDING: { label: "Confirming", tone: "amber" },
  CREATED: { label: "Not paid", tone: "slate" },
  FAILED: { label: "Failed", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const PAYMENT_STATUS_LABELS = Object.fromEntries(Object.entries(PAYMENT).map(([key, value]) => [key, value.label])) as Record<PaymentStatus, string>;

/** Dates are shown in India's time, whatever the server's. */
export const formatAdminDate = (value?: Date | string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })
    : "—";

export const formatAdminDateTime = (value?: Date | string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
