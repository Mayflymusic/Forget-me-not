"use client";

import { Session, SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabaseBrowser";

type Props = {
  initialSession: Session | null;
  children: React.ReactNode;
};

export function SupabaseProvider({ initialSession, children }: Props) {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={initialSession ?? undefined}
    >
      {children}
    </SessionContextProvider>
  );
}
