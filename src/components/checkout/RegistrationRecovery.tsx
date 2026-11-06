"use client";

import { useEffect, useRef, useState } from "react";
import { SUBSCRIPTION_STATE_LABELS } from "@/lib/subscription-status";
import { recoveryRequestSchema } from "@/validations/registration-recovery.schema";
import type { RecoveredRegistration } from "@/services/registration-recovery.service";
import type { RenewalLookupOptions } from "./RenewalFlow";
import { postJson } from "./useRazorpayCheckout";

const INPUT = "mt-1 h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink";
const HEADING = "font-display text-[30px] font-semibold leading-tight text-ink outline-none lg:text-[38px]";
const PRIMARY = "inline-flex min-h-[48px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-7 py-2 text-[18px] font-bold text-ink hover:bg-[#f5b21c] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY = "text-[16px] font-bold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60";
const dateText = (date: string) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function RegistrationRecovery({ initialEmail, onCancel, onRecovered }: {
  initialEmail: string;
  onCancel: () => void;
  onRecovered: (options: RenewalLookupOptions, email: string) => void;
}) {
  const [step, setStep] = useState<"email" | "code" | "registrations">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [registrations, setRegistrations] = useState<RecoveredRegistration[]>([]);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    else if (step === "code") codeRef.current?.focus();
    else headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const parsed = recoveryRequestSchema.safeParse({ email });
    if (!parsed.success) { setError("Enter a valid email address."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    const response = await postJson("/api/renewals/recovery/request", parsed.data).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError(String(response?.data.error ?? "We couldn't request a code. Check your connection and try again."));
      if (response?.status === 429) setCooldown(60);
      return;
    }
    setEmail(parsed.data.email);
    setChallengeId(String(response.data.challengeId));
    setCode("");
    setAccessToken("");
    setCooldown(Number(response.data.resendAfter) || 60);
    setNotice(String(response.data.message));
    setStep("code");
    codeRef.current?.focus();
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) { setError("Enter the six-digit code from your email."); return; }
    setBusy(true);
    setError("");
    const response = await postJson("/api/renewals/recovery/verify", { challengeId, code }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError(String(response?.data.error ?? "We couldn't verify your code. Check your connection and try again."));
      return;
    }
    setCode("");
    setAccessToken(String(response.data.accessToken));
    setRegistrations(response.data.registrations as RecoveredRegistration[]);
    setNotice("");
    setStep("registrations");
  }

  async function select(registrationId: string) {
    if (busy) return;
    setBusy(true);
    setSelecting(registrationId);
    setError("");
    const response = await postJson("/api/renewals/recovery/select", { challengeId, accessToken, registrationId }).catch(() => null);
    setBusy(false);
    setSelecting("");
    if (!response?.ok) {
      setError(String(response?.data.error ?? "We couldn't open this registration. Please try again."));
      if (response?.data.code === "ACCESS_EXPIRED") {
        setAccessToken("");
        setRegistrations([]);
        setChallengeId("");
        setStep("email");
      }
      return;
    }
    onRecovered(response.data as RenewalLookupOptions, email);
  }

  function changeEmail() {
    setStep("email");
    setChallengeId("");
    setAccessToken("");
    setRegistrations([]);
    setCode("");
    setError("");
    setNotice("");
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className={HEADING}>
        {step === "email" ? "Find your registrations" : step === "code" ? "Check your email" : "Your registrations"}
      </h1>
      {step === "email" && (
        <form onSubmit={requestCode} noValidate>
          <p className="mt-3 text-[17px] leading-relaxed">Forgot your registration number? Enter the parent email used when registering. Verify a code to see your children&apos;s registrations.</p>
          <div className="mt-6">
            <label htmlFor="recovery-email" className="block text-[16px] font-bold">Registered email</label>
            <input ref={emailRef} id="recovery-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className={INPUT} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy || cooldown > 0} className={PRIMARY}>{busy ? "Please wait…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send verification code"}</button>
            <button type="button" onClick={onCancel} disabled={busy} className={SECONDARY}>Back to registration lookup</button>
          </div>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={verify} noValidate>
          <p className="mt-3 text-[17px] leading-relaxed">Enter the six-digit code sent to <strong className="break-all">{email}</strong>. The code expires in 10 minutes.</p>
          {notice && <p role="status" className="mt-3 text-[15px] leading-relaxed text-ink/75">{notice}</p>}
          <div className="mt-6">
            <label htmlFor="recovery-code" className="block text-[16px] font-bold">Verification code</label>
            <input ref={codeRef} id="recovery-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} disabled={busy} className={`${INPUT} max-w-[240px] font-mono text-[24px] tracking-[0.3em]`} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Please wait…" : "Verify and find registrations"}</button>
            <button type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode()} className={SECONDARY}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-4">
            <button type="button" disabled={busy} onClick={changeEmail} className={SECONDARY}>Use another email</button>
            <button type="button" disabled={busy} onClick={onCancel} className={SECONDARY}>Back to registration lookup</button>
          </div>
        </form>
      )}
      {step === "registrations" && (
        <>
          <p className="mt-3 break-words text-[17px] leading-relaxed">Email verified: <strong>{email}</strong>. Choose a registration to renew.</p>
          {registrations.length === 0 ? (
            <p role="status" className="mt-5 text-[17px]">No completed registrations are currently linked to this email.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {registrations.map((registration) => (
                <li key={registration.registrationId} className="rounded-2xl border border-field-line p-5">
                  <h2 className="text-[21px] font-bold">{registration.childName}</h2>
                  <dl className="mt-3 grid gap-2 text-[16px]">
                    <div><dt className="inline text-ink/70">Registration number: </dt><dd className="inline font-bold">{registration.reference}</dd></div>
                    <div><dt className="inline text-ink/70">Programme: </dt><dd className="inline">{registration.programme || registration.planName || "—"}</dd></div>
                    {registration.planName && registration.planName !== registration.programme && <div><dt className="inline text-ink/70">Plan: </dt><dd className="inline">{registration.planName}</dd></div>}
                    <div><dt className="inline text-ink/70">Status: </dt><dd className="inline">{registration.state ? SUBSCRIPTION_STATE_LABELS[registration.state] : "No subscription"}</dd></div>
                    {registration.startDate && <div><dt className="inline text-ink/70">Starts: </dt><dd className="inline">{dateText(registration.startDate)}</dd></div>}
                    {registration.expiryDate && <div><dt className="inline text-ink/70">Valid until: </dt><dd className="inline">{dateText(registration.expiryDate)}</dd></div>}
                  </dl>
                  <button type="button" onClick={() => void select(registration.registrationId)} disabled={busy} className={`${PRIMARY} mt-5`} aria-label={`Renew for ${registration.childName}, registration ${registration.reference}`}>
                    {selecting === registration.registrationId ? "Opening…" : "Renew"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-4">
            <button type="button" disabled={busy} onClick={changeEmail} className={SECONDARY}>Use another email</button>
            <button type="button" disabled={busy} onClick={onCancel} className={SECONDARY}>Back to registration lookup</button>
          </div>
        </>
      )}
      {error && <p role="alert" className="mt-4 text-[16px] font-bold text-red-700">{error}</p>}
    </div>
  );
}
