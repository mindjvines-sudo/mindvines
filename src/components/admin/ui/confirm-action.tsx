"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertIcon } from "@/components/admin/icons";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { Modal } from "./modal";

/**
 * A button that asks before running a destructive server action. The
 * action itself is unchanged: confirming submits the same bound action the
 * page used to post directly.
 */
export function ConfirmAction({
  action,
  title,
  description,
  confirmLabel = "Delete",
  trigger,
  triggerLabel,
  variant = "danger-soft",
  size = "sm",
}: {
  action: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Visible content of the trigger button. */
  trigger: React.ReactNode;
  /** Accessible name when the trigger is icon-only. */
  triggerLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={triggerLabel}
        className={buttonClasses({ variant, size })}
      >
        {trigger}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <div className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertIcon className="size-5" />
          </span>
          <p className="pt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <form action={action} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setOpen(false)} className={buttonClasses({ variant: "secondary" })}>
            Cancel
          </button>
          <ConfirmSubmit label={confirmLabel} />
        </form>
      </Modal>
    </>
  );
}

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses({ variant: "danger" })} autoFocus>
      {pending ? "Working…" : label}
    </button>
  );
}

/** Submit button for small inline action forms; shows progress while pending. */
export function ActionButton({
  children,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  label,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={buttonClasses({ variant, size, className })}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
