import { after } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { requestRegistrationRecovery } from "@/services/registration-recovery.service";
import { recoveryRequestSchema } from "@/validations/registration-recovery.schema";
import { recoveryFailure, recoveryJson } from "../response";

export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = recoveryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return recoveryJson({ error: "Enter a valid email address." }, 400);
  try {
    const { challengeId, message, resendAfter, deliver } = await requestRegistrationRecovery(parsed.data.email, clientIp(request.headers));
    after(deliver);
    return recoveryJson({ challengeId, message, resendAfter });
  } catch (error) {
    return recoveryFailure(error);
  }
}
