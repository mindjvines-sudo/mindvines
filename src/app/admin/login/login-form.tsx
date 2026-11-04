"use client";

import { useState, useActionState } from "react";
import { login, type LoginFormState } from "./actions";

const initialState: LoginFormState = undefined;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium text-slate-700">
          Email
        </label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-invalid={state?.errors?.email ? true : undefined}
            aria-describedby={state?.errors?.email ? "email-error" : undefined}
            className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_30_76/0.03)] placeholder:text-slate-400 transition-[border-color,box-shadow] hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus-visible:outline-none aria-invalid:border-red-300"
          />
        </div>
        {state?.errors?.email && (
          <p id="email-error" className="text-xs font-medium text-red-600">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[13px] font-medium text-slate-700">
          Password
        </label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Password"
            aria-invalid={state?.errors?.password ? true : undefined}
            aria-describedby={state?.errors?.password ? "password-error" : undefined}
            className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-11 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_30_76/0.03)] placeholder:text-slate-400 transition-[border-color,box-shadow] hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus-visible:outline-none aria-invalid:border-red-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        {state?.errors?.password && (
          <p id="password-error" className="text-xs font-medium text-red-600">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {state?.message && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-12 w-full rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.7C4 8.3 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.7-1.2M9.9 5.2C10.6 5.06 11.3 5 12 5c6.4 0 10 7 10 7-.5.9-1.4 2.2-2.6 3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
