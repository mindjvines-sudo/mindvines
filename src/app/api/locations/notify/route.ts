import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalisePhone, phoneProblem } from "@/lib/countries";
import { pincodeSchema } from "@/validations/location.schema";
import { saveAreaLead } from "@/services/area-interest.service";

const schema = z.object({
  pincode: pincodeSchema,
  name: z.string().trim().max(80).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(120)]).optional(),
  phone: z.string().trim().max(24).optional(),
});

/** Public: a parent asks to be told when Mindvines reaches their area. Everything but the pincode is optional, but one way to reach them is needed. */
export async function POST(request: Request) {
  if (!checkRateLimit(`area-lead:ip:${clientIp(request.headers)}`, { limit: 8, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  const { pincode, name, email } = parsed.data;
  const phone = parsed.data.phone ? normalisePhone("IN", parsed.data.phone) : "";
  const phoneError = phone ? phoneProblem("IN", phone) : null;
  if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: "Add an email address or mobile number so we can reach you." }, { status: 400 });

  try {
    await saveAreaLead({ pincode, name: name || undefined, email: email || undefined, phone: phone || undefined });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save area lead", error);
    return NextResponse.json({ error: "We couldn't save your details. Please try again." }, { status: 500 });
  }
}
