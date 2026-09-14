"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createAuthServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/utils";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(formData.get("next") as string | null);

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const identifier = getClientIdentifier(await headers());
  const rateLimit = checkRateLimit({
    scope: "login",
    limit: 5,
    windowMs: 5 * 60_000,
    identifier,
  });

  if (!rateLimit.allowed) {
    return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const supabase = await createAuthServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  if (!adminEmail || data.user.email !== adminEmail) {
    await supabase.auth.signOut();
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(next);
}
