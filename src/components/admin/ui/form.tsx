import { cn } from "@/lib/utils";

/** One look for every text input, select and textarea in the admin. */
export const inputClasses = (invalid?: boolean, className?: string) =>
  cn(
    "block w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_30_76/0.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus-visible:outline-none disabled:bg-slate-50 disabled:text-slate-500",
    invalid
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
      : "border-line hover:border-slate-300 focus:border-primary-500 focus:ring-primary-500/15",
    className,
  );

type FieldProps = {
  label: string;
  /** Becomes the control's id and the label's htmlFor. */
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string[] | string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label, control, hint and error, stacked with consistent spacing. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-slate-700">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-red-500">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !message && <p className="text-xs text-slate-500">{hint}</p>}
      {message && (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ invalid, className, id, ...props }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={inputClasses(invalid, cn("h-10", className))}
      {...props}
    />
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ invalid, className, id, ...props }: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={inputClasses(invalid, cn("py-2.5 leading-6", className))}
      {...props}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ invalid, className, ...props }: SelectProps) {
  return <select className={inputClasses(invalid, cn("admin-select h-10", className))} {...props} />;
}

/**
 * A titled group of fields inside a form card. On wide screens the title
 * and description sit in a left column beside the fields.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-x-8 gap-y-5 border-b border-line px-5 py-6 last:border-b-0 sm:px-6 xl:grid-cols-[220px_1fr]",
        className,
      )}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-navy-900">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  );
}

/** Sticky footer bar holding a form's submit button and messages. */
export function FormFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 rounded-b-2xl border-t border-line bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
