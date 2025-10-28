"use client";

import { FormEvent, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? "Unable to sign in.");
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          throw signUpError;
        }
        setStatus(
          "Check your inbox to confirm the address before signing in."
        );
        setMode("signin");
        return;
      }

      if (typeof window !== "undefined") {
        window.location.href = "/";
      } else {
        router.replace("/");
      }
    } catch (authError) {
      if (authError instanceof Error) {
        setError(authError.message);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-zinc-100">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-sm text-zinc-400">
          Use the same credentials you configured in Supabase Auth.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-left text-sm font-medium text-zinc-300">
          Email
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
          />
        </label>

        <label className="flex flex-col gap-2 text-left text-sm font-medium text-zinc-300">
          Password
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {status}
        </p>
      ) : null}

      <button
        type="submit"
        className="flex w-full items-center justify-center rounded-lg bg-sky-500 py-2 text-sm font-medium text-zinc-50 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
        disabled={loading}
      >
        {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
      </button>

      <div className="text-center text-sm text-zinc-400">
        {mode === "signin" ? (
          <>
            Need an account?{" "}
            <button
              type="button"
              className="font-medium text-sky-400 hover:text-sky-300"
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already registered?{" "}
            <button
              type="button"
              className="font-medium text-sky-400 hover:text-sky-300"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  );
}
