import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const FEATURES = [
  { title: "Parent enquiries", description: "Reply to messages sent through the website's contact form." },
  { title: "Website content", description: "Manage the site's media and settings in one place." },
  { title: "Role-based access", description: "Give your team exactly the access they need." },
];

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen bg-paper">
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <Image
          src="/images/hero-journal.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/45 to-ink/10" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/55 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="w-fit rounded-lg text-sm font-medium text-white/80 transition-colors hover:text-white">
            ← Back to website
          </Link>

          <div className="flex max-w-md flex-col gap-8 text-white">
            <div className="flex flex-col gap-3">
              <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-butter ring-1 ring-white/20 backdrop-blur">
                Mindvines · Admin
              </span>
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.02em] xl:text-4xl">
                Every journal takes a journey
              </h2>
              <p className="text-white/75">
                Sign in to manage enquiries and your website’s content.
              </p>
            </div>

            <ul className="flex flex-col gap-5">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber/25 text-butter ring-1 ring-amber/60">
                    <CheckIcon className="size-3.5" />
                  </span>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-sm text-white/65">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-field-line bg-white p-6 shadow-[0_14px_30px_-12px_rgb(77_63_50/0.18)] sm:p-10">
            <div className="flex flex-col gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
              <img src="/images/logo.png" alt="Mindvines" width={143} height={48} className="h-12 w-[143px]" />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Welcome back</h1>
                <p className="text-sm text-cocoa">Sign in to the Mindvines admin to continue.</p>
              </div>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-cocoa/70">
            Protected area for Mindvines staff.{" "}
            <Link href="/" className="font-medium text-cocoa hover:text-amber lg:hidden">
              Back to website
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
