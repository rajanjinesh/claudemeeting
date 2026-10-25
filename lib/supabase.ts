import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the secret key, so never import this from a client component.
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
