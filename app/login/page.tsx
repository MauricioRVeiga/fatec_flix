import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Fatec Flix</h1>
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
