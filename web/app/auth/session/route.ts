import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(request: Request) {
  const cookiesHeader = request.headers.get("cookie") ?? "";
  const response = NextResponse.json({ status: "ok" });

  const supabase = createServerClient<Database, "public">(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return readCookie(cookiesHeader, name);
      },
      set(name: string, value: string, options?: CookieOptions) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options?: CookieOptions) {
        response.cookies.set({
          name,
          value: "",
          ...options,
          maxAge: 0,
        });
      },
    },
  });

  const { event, session } = await request.json();

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  if (session) {
    await supabase.auth.setSession(session);
  }

  return response;
}

function readCookie(header: string, name: string): string | null {
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}
