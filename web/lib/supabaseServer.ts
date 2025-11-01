/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseCredentials } from "./supabaseConfig";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } =
  getSupabaseCredentials();

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
