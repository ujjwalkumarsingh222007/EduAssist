/**
 * Supabase server client — use in Server Components, Route Handlers,
 * and Server Actions only. Reads cookies for session context.
 *
 * Uses only the publishable key for now.
 * TODO Phase 2: swap to service-role key for privileged operations.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Session refresh is handled by Route Handlers.
          }
        },
      },
    }
  );
}
