import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function verifyCronSecret(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const providedSecret = header.slice("Bearer ".length);

  const expectedHash = createHash("sha256").update(configuredSecret).digest();
  const providedHash = createHash("sha256").update(providedSecret).digest();

  return timingSafeEqual(expectedHash, providedHash);
}
