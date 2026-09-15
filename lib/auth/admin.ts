import "server-only";

import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/auth/email";
import { createAuthServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const supabase = await createAuthServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email, adminEmail)) {
    redirect("/login");
  }

  return user;
}
