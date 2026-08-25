/**
 * Supabase browser client — safe to use in Client Components.
 * Uses NEXT_PUBLIC_ keys only. Never import service-role keys here.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
