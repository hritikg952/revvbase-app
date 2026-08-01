"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const supabase = getSupabaseBrowserClient();

    if (mode === "sign-up") {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() || null } },
      });
      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        setMessage("Account created. You're signed in and ready to list a vehicle.");
        router.push("/");
      } else {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else {
        router.push("/");
      }
    }

    setPending(false);
  }

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-tabs" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === "sign-in" ? "active" : ""}
          onClick={() => chooseMode("sign-in")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "sign-up" ? "active" : ""}
          onClick={() => chooseMode("sign-up")}
        >
          Create account
        </button>
      </div>
      <p className="eyebrow">One account. Buy and sell.</p>
      <h1 id="auth-heading">
        {mode === "sign-in" ? "Welcome back" : "Create your Revvbase account"}
      </h1>
      <p className="muted">
        {mode === "sign-in"
          ? "Sign in to publish and manage your listings."
          : "Start listing in a minute—there are no buyer or seller roles to choose."}
      </p>
      <form onSubmit={submit} className="stack-form">
        {mode === "sign-up" && (
          <label>
            Display name <span className="optional">Optional</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
          {mode === "sign-up" && <span className="field-hint">Use at least 8 characters.</span>}
        </label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        {message && <p className="form-alert success" role="status">{message}</p>}
        <button className="button button-wide" type="submit" disabled={pending}>
          {pending
            ? mode === "sign-in" ? "Signing in…" : "Creating account…"
            : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
    </section>
  );
}
