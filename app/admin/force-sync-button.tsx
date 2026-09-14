"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { forceSyncAction, type ForceSyncState } from "./actions";

const INITIAL_STATE: ForceSyncState = { message: null, error: null };

export function ForceSyncButton() {
  const [state, formAction, pending] = useActionState(forceSyncAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Sincronizando..." : "Forçar sincronização"}
      </Button>

      {state.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
