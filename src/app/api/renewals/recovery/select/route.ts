import { clientIp } from "@/lib/client-ip";
import { checkRecoveryRateLimit, selectRecoveredRegistration } from "@/services/registration-recovery.service";
import { recoverySelectSchema } from "@/validations/registration-recovery.schema";
import { recoveryFailure, recoveryJson } from "../response";

export async function POST(request: Request) {
  const parsed = recoverySelectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return recoveryJson({ error: "Please verify your email again." }, 400);
  try {
    await checkRecoveryRateLimit(`recovery-select:ip:${clientIp(request.headers)}`, 30, 15 * 60 * 1000);
    return recoveryJson(await selectRecoveredRegistration(parsed.data));
  } catch (error) {
    return recoveryFailure(error);
  }
}
