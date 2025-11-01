import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseCredentials } from "./supabaseConfig";

type CookieJarValue = {
  value: string;
  options?: CookieOptions;
};

function readCookie(header: string, name: string): string | null {
  const parts = header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export function createSupabaseRouteClient(request: Request) {
  const { url, anonKey } = getSupabaseCredentials();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieJar = new Map<string, CookieJarValue>();

  const supabase = createServerClient<Database, "public">(url, anonKey, {
    cookies: {
      get(name: string) {
        return readCookie(cookieHeader, name);
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieJar.set(name, { value, options });
      },
      remove(name: string, options?: CookieOptions) {
        cookieJar.set(name, { value: "", options: { ...options, maxAge: 0 } });
      },
    },
  });

  const withCookies = (response: NextResponse) => {
    for (const [name, { value, options }] of cookieJar.entries()) {
      response.cookies.set({
        name,
        value,
        ...options,
      });
    }

    return response;
  };

  return { supabase, withCookies };
}
