import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generatePairingCode, storePairingCode } from "@/lib/extension/pairing";
import { Profile } from "@/lib/types/profile";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    let userId: string | null = null;
    let userToken: string | undefined = undefined;
    let fetchedProfile: Profile | undefined = undefined;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (authHeader && authHeader.startsWith("Bearer ") && supabaseUrl && anonKey) {
      const token = authHeader.split(" ")[1];
      userToken = token;
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          fetchedProfile = profile as Profile;
        } else {
          fetchedProfile = {
            user_id: user.id,
            full_name: (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || "",
          };
        }
      }
    }

    // If not in Authorization header, check body user_id if valid
    if (!userId) {
      try {
        const body = await request.json();
        if (body.user_id) userId = body.user_id;
        if (body.full_name && !fetchedProfile) {
          fetchedProfile = {
            user_id: body.user_id,
            full_name: body.full_name,
          };
        }
      } catch {
        // No body
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to generate pairing code" },
        { status: 401 }
      );
    }

    // Generate random 9-character code: ABC-123-XYZ
    const { formattedCode, codeHash } = generatePairingCode();

    // Store hashed code with 5-minute expiration
    const { expiresAt } = await storePairingCode(userId, codeHash, userToken, fetchedProfile);

    return NextResponse.json({
      code: formattedCode,
      expires_in_seconds: 300,
      expires_at: expiresAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
