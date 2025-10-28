"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

type Props = {
  accessToken?: string;
};

export function SupabaseListener({ accessToken }: Props) {
  const router = useRouter();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetch("/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event: _event, session }),
      }).finally(() => {
        if (session?.access_token !== accessToken) {
          router.refresh();
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [accessToken, router, supabase]);

  return null;
}
