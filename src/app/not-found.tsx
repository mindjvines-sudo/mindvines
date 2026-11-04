import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-neutral-600">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
        Back to home
      </Link>
    </div>
  );
}
