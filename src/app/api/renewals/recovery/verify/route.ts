import { clientIp } from "@/lib/client-ip";
import { checkRecoveryRateLimit, verifyRegistrationRecovery } from "@/services/registration-recovery.service";
import { recoveryVerifySchema } from "@/validations/registration-recovery.schema";
import { recoveryFailure, recoveryJson } from "../response";

export async function POST(request: Request) {
  const parsed = recoveryVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return recoveryJson({ error: "Enter the six-digit code from your email." }, 400);
  try {
    await checkRecoveryRateLimit(`recovery-verify:ip:${clientIp(request.headers)}`, 50, 15 * 60 * 1000);
    return recoveryJson(await verifyRegistrationRecovery(parsed.data));
  } catch (error) {
    return recoveryFailure(error);
  }
}
