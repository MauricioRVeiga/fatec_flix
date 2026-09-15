import { describe, expect, it } from "vitest";

import { isAdminEmail } from "@/lib/auth/email";

describe("isAdminEmail", () => {
  it("compara a identidade sem diferenciar maiúsculas ou espaços externos", () => {
    expect(isAdminEmail(" ADMIN@example.com ", " Admin@Example.COM ")).toBe(true);
  });

  it.each([undefined, null, "", "   "])(
    "recusa e-mail ou configuração ausente (%s)",
    (value) => {
      expect(isAdminEmail(value, "admin@example.com")).toBe(false);
      expect(isAdminEmail("admin@example.com", value)).toBe(false);
      expect(isAdminEmail(value, value)).toBe(false);
    }
  );

  it("recusa outros endereços, incluindo aliases do administrador", () => {
    expect(isAdminEmail("other@example.com", "admin@example.com")).toBe(false);
    expect(isAdminEmail("admin+other@example.com", "admin@example.com")).toBe(false);
    expect(isAdminEmail("admin@example.com.attacker.com", "admin@example.com")).toBe(false);
  });
});
