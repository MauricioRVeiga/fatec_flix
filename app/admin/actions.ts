"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { createAuthServerSupabaseClient } from "@/lib/supabase/server";
import { syncChannels } from "@/services/sync-channels";

export async function signOutAction() {
  const supabase = await createAuthServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export interface ForceSyncState {
  message: string | null;
  error: string | null;
}

export async function forceSyncAction(
  _prevState: ForceSyncState,
  _formData: FormData
): Promise<ForceSyncState> {
  await requireAdminUser();

  const result = await syncChannels();

  logger.info("admin_force_sync", { status: result.status, triggeredBy: "admin_panel" });

  revalidatePath("/admin");

  if (result.status === "failed") {
    return { message: null, error: result.errorMessage ?? "Sincronização falhou." };
  }

  if (result.status === "skipped") {
    return { message: null, error: "Já existe uma sincronização em andamento." };
  }

  return {
    message: `Sincronização concluída (${result.status}): ${result.created} criados, ${result.updated} atualizados.`,
    error: null,
  };
}
