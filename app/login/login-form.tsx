"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { loginAction, type LoginState } from "./actions";
import styles from "./login.module.css";

const INITIAL_STATE: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <form action={formAction} className={styles.form} aria-busy={pending}>
      <input type="hidden" name="next" value={next} />

      <div className={styles.field}>
        <label htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="voce@exemplo.com"
          required
          readOnly={pending}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">
          Senha
        </label>
        <div className={styles.passwordField}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
            readOnly={pending}
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-controls="password"
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state.error && (
        <p id="login-error" role="alert" className={styles.error}>
          <CircleAlert size={17} aria-hidden="true" /> <span>{state.error}</span>
        </p>
      )}

      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? <>Entrando... <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" /></> : <>Entrar <ArrowRight size={19} aria-hidden="true" /></>}
      </button>

      <details className={styles.help}>
        <summary>Precisa de ajuda para entrar? <ChevronDown size={14} aria-hidden="true" /></summary>
        <p>Use o e-mail e a senha recebidos no seu convite. Se esqueceu sua senha ou ainda não consegue entrar, fale com o administrador que liberou seu acesso.</p>
      </details>
    </form>
  );
}
