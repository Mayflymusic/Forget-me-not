import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function createSupabaseServerClient(
  requestCookies: any,
  response: NextResponse
) {
  return createServerClient<Database, "public">(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return requestCookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions = {}) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions = {}) {
        response.cookies.set({
          name,
          value: "",
          ...options,
          maxAge: 0,
        });
      },
    },
  });
}

export async function POST(request: Request) {
  const requestCookies = cookies();
  const baseResponse = NextResponse.next();
  const supabase = createSupabaseServerClient(requestCookies, baseResponse);
  const { event, session } = await request.json();

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
    const headers = new Headers(baseResponse.headers);
    headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify({ status: "signed_out" }), {
      status: 200,
      headers,
    });
  }

  if (session) {
    await supabase.auth.setSession(session);
    const headers = new Headers(baseResponse.headers);
    headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify({ status: "updated" }), {
      status: 200,
      headers,
    });
  }

  const headers = new Headers(baseResponse.headers);
  headers.set("content-type", "application/json");
  return new NextResponse(JSON.stringify({ status: "noop" }), {
    status: 200,
    headers,
  });
}
