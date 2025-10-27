/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

function createClient(readonlyMode: boolean) {
  return createServerClient<Database, "public">(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        const cookieStore = cookies() as any;
        return cookieStore.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions = {}) {
        if (readonlyMode) {
          return;
        }

        const cookieStore = cookies() as any;
        cookieStore.set?.({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions = {}) {
        if (readonlyMode) {
          return;
        }

        const cookieStore = cookies() as any;
        cookieStore.delete?.({
          name,
          ...options,
        });
      },
    },
  });
}

export function createSupabaseServerComponentClient() {
  return createClient(true);
}

export function createSupabaseServerActionClient() {
  return createClient(false);
}
