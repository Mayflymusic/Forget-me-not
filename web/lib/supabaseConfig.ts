type SupabaseCredentials = {
  url: string;
  anonKey: string;
};

export const missingSupabaseEnvMessage =
  "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (then redeploy) in your Vercel project settings.";

export function getSupabaseCredentials(): SupabaseCredentials {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    throw new Error(missingSupabaseEnvMessage);
  }

  return { url, anonKey };
}
