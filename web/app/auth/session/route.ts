/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function createSupabaseServerClient() {
  return createServerClient<Database, "public">(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        const cookieStore = cookies() as any;
        return cookieStore.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions = {}) {
        const cookieStore = cookies() as any;
        cookieStore.set?.({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions = {}) {
        const cookieStore = cookies() as any;
        cookieStore.delete?.({
          name,
          ...options,
        });
      },
    },
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { event, session } = await request.json();

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
    return NextResponse.json({ status: "signed_out" });
  }

  if (session) {
    await supabase.auth.setSession(session);
    return NextResponse.json({ status: "updated" });
  }

  return NextResponse.json({ status: "noop" });
}
