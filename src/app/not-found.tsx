import Link from "next/link";

/**
 * Last-resort 404. Unknown addresses are caught by (public)/[...missing],
 * admin/(protected)/[...missing] and api/[...missing], which render their own
 * area's 404. This one only shows if a 404 happens outside those, where
 * neither side's stylesheet is loaded, so it styles itself.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "#fcf5e5",
        color: "#4d3f32",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 72, fontWeight: 700, color: "#f0a500", margin: 0, lineHeight: 1 }}>404</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Page not found</h1>
      <p style={{ margin: 0, maxWidth: 420 }}>The page you’re looking for doesn’t exist or has moved.</p>
      <Link
        href="/"
        style={{ marginTop: 8, padding: "12px 28px", borderRadius: 999, background: "#f0a500", color: "#4d3f32", fontWeight: 700, textDecoration: "none" }}
      >
        Back to home
      </Link>
    </div>
  );
}
