import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRouteClient";

export async function POST(request: Request) {
  try {
    const { supabase, withCookies } = createSupabaseRouteClient(request);
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return withCookies(
        NextResponse.json({ error: error.message }, { status: 400 })
      );
    }

    return withCookies(NextResponse.json({ status: "signed_in" }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error. Check server logs for details.";

    console.error("[api/auth/signin] failed", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
