import "server-only";
import { parseIndiaPostResponse, type PincodeInfo } from "./pincode";

/**
 * Where postal data comes from. The location service only knows this
 * interface, so a different provider (a bundled dataset, a paid API) is one
 * new class and one line in `getPincodeProvider`.
 */
export interface PincodeProvider {
  readonly name: string;
  /** The pincode's geography, or null when it doesn't exist. Throws ProviderUnavailableError when the provider can't answer. */
  lookup(pincode: string): Promise<PincodeInfo | null>;
}

export class ProviderUnavailableError extends Error {
  constructor(message = "The postal lookup service is not responding.") {
    super(message);
  }
}

/** India Post data through the free api.postalpincode.in service. */
export class IndiaPostProvider implements PincodeProvider {
  readonly name = "india-post";
  constructor(private readonly baseUrl = process.env.PINCODE_API_URL ?? "https://api.postalpincode.in/pincode", private readonly timeoutMs = 6000) {}

  async lookup(pincode: string): Promise<PincodeInfo | null> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${encodeURIComponent(pincode)}`, { signal: AbortSignal.timeout(this.timeoutMs), cache: "no-store" });
    } catch {
      throw new ProviderUnavailableError();
    }
    if (!response.ok) throw new ProviderUnavailableError();
    const body: unknown = await response.json().catch(() => {
      throw new ProviderUnavailableError();
    });
    return parseIndiaPostResponse(pincode, body);
  }
}

let provider: PincodeProvider | undefined;
export function getPincodeProvider(): PincodeProvider {
  return (provider ??= new IndiaPostProvider());
}
