import { NextResponse } from "next/server";

/** Unknown API addresses answer in JSON, like every other API route, not with the website's 404 page. */
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
