export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | null | undefined
): boolean {
  const normalizedAdminEmail = adminEmail?.trim().toLowerCase();

  return Boolean(
    normalizedAdminEmail && email?.trim().toLowerCase() === normalizedAdminEmail
  );
}
