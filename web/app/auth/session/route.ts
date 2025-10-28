import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRouteClient";

export async function POST(request: Request) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);
  const { event, session } = await request.json();

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
    return withCookies(NextResponse.json({ status: "signed_out" }));
  }

  if (session) {
    await supabase.auth.setSession(session);
    return withCookies(NextResponse.json({ status: "updated" }));
  }

  return withCookies(NextResponse.json({ status: "noop" }));
}
