import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "../../../lib/supabaseServer";
import { LoginForm } from "../../../components/login-form";

export default async function LoginPage() {
  const supabase = createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-zinc-950 via-slate-900 to-emerald-900 px-4 py-16">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400/80">
          Forget Me Not
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          Sign in to pair your leaves
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          Manage ESP modules, link sender and receiver leaves, and follow touch
          events in real time through Supabase and Vercel.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
