import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Profile } from "@/lib/types/profile";

export interface PairingCodeRecord {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: string;
  used: boolean;
  auth_token?: string;
  user_profile?: Profile;
  created_at: string;
}

export interface ExtensionConnectionRecord {
  id: string;
  user_id: string;
  connection_id: string;
  auth_token?: string;
  user_profile?: Profile;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

// Global persistent stores attached to globalThis to survive Next.js module hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __smart_assistant_pairing_codes: Map<string, PairingCodeRecord> | undefined;
  // eslint-disable-next-line no-var
  var __smart_assistant_connections: Map<string, ExtensionConnectionRecord> | undefined;
}

const memoryPairingCodes: Map<string, PairingCodeRecord> =
  globalThis.__smart_assistant_pairing_codes || new Map<string, PairingCodeRecord>();
globalThis.__smart_assistant_pairing_codes = memoryPairingCodes;

const memoryConnections: Map<string, ExtensionConnectionRecord> =
  globalThis.__smart_assistant_connections || new Map<string, ExtensionConnectionRecord>();
globalThis.__smart_assistant_connections = memoryConnections;

/**
 * Normalizes user-entered connection code (removes whitespace and hyphens, converts to uppercase)
 */
export function normalizeCode(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Computes SHA-256 hash of normalized pairing code
 */
export function hashPairingCode(rawCode: string): string {
  const clean = normalizeCode(rawCode);
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Generates a clean, readable one-time connection code (e.g. ABC-123-XYZ)
 */
export function generatePairingCode(): { formattedCode: string; cleanCode: string; codeHash: string } {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed ambiguous characters (0, 1, I, O)
  let cleanCode = "";
  const randomBytes = crypto.randomBytes(9);

  for (let i = 0; i < 9; i++) {
    cleanCode += chars[randomBytes[i] % chars.length];
  }

  const formattedCode = `${cleanCode.slice(0, 3)}-${cleanCode.slice(3, 6)}-${cleanCode.slice(6, 9)}`;
  const codeHash = hashPairingCode(cleanCode);

  return { formattedCode, cleanCode, codeHash };
}

export function getSupabaseClient(authToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const keyToUse = serviceRoleKey || anonKey;
  if (!supabaseUrl || !keyToUse) return null;

  return createClient(supabaseUrl, keyToUse, {
    global: authToken
      ? { headers: { Authorization: `Bearer ${authToken}` } }
      : undefined,
    auth: { persistSession: false },
  });
}

/**
 * Stores a newly generated pairing code (5-minute expiration, unused)
 */
export async function storePairingCode(
  userId: string,
  codeHash: string,
  authToken?: string,
  userProfile?: Profile
): Promise<{ success: boolean; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
  const record: PairingCodeRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
    used: false,
    auth_token: authToken,
    user_profile: userProfile,
    created_at: new Date().toISOString(),
  };

  // 1. Store in memory singleton
  memoryPairingCodes.set(codeHash, record);

  // 2. Persist to Supabase if available
  const supabase = getSupabaseClient(authToken);
  if (supabase) {
    try {
      await supabase.from("extension_pairing_codes").insert({
        id: record.id,
        user_id: userId,
        code_hash: codeHash,
        expires_at: expiresAt,
        used: false,
      });
    } catch {
      // Memory store is authoritative fallback
    }
  }

  return { success: true, expiresAt };
}

export type VerifyCodeResult =
  | { success: true; userId: string; connectionId: string }
  | {
      success: false;
      error:
        | "Invalid connection code"
        | "Connection code expired"
        | "Connection code already used"
        | "Connection failed";
    };

/**
 * Verifies and consumes a one-time pairing code from the extension
 */
export async function verifyAndConsumePairingCode(rawCode: string): Promise<VerifyCodeResult> {
  const clean = normalizeCode(rawCode);
  if (!clean || clean.length < 6) {
    return { success: false, error: "Invalid connection code" };
  }

  const codeHash = hashPairingCode(clean);
  let record: PairingCodeRecord | null = null;

  // 1. Check in memory singleton first for instant lookup
  if (memoryPairingCodes.has(codeHash)) {
    record = memoryPairingCodes.get(codeHash)!;
  }

  // 2. Check Supabase if not found in memory
  if (!record) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from("extension_pairing_codes")
          .select("*")
          .eq("code_hash", codeHash)
          .maybeSingle();

        if (data) {
          record = data as PairingCodeRecord;
        }
      } catch {
        // Fallback
      }
    }
  }

  if (!record) {
    return { success: false, error: "Invalid connection code" };
  }

  if (record.used) {
    return { success: false, error: "Connection code already used" };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { success: false, error: "Connection code expired" };
  }

  // Mark as used immediately to prevent replay
  record.used = true;
  memoryPairingCodes.set(codeHash, record);

  const supabase = getSupabaseClient(record.auth_token);
  if (supabase) {
    try {
      await supabase
        .from("extension_pairing_codes")
        .update({ used: true })
        .eq("id", record.id);
    } catch {
      // Memory state is already marked
    }
  }

  // Generate cryptographically random connection ID
  const connectionId = `ext_conn_${crypto.randomBytes(24).toString("hex")}`;
  const connectionRecord: ExtensionConnectionRecord = {
    id: crypto.randomUUID(),
    user_id: record.user_id,
    connection_id: connectionId,
    auth_token: record.auth_token,
    user_profile: record.user_profile,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
  };

  memoryConnections.set(connectionId, connectionRecord);

  if (supabase) {
    try {
      await supabase.from("extension_connections").insert({
        id: connectionRecord.id,
        user_id: record.user_id,
        connection_id: connectionId,
        created_at: connectionRecord.created_at,
        last_seen_at: connectionRecord.last_seen_at,
      });
    } catch {
      // Memory state preserved
    }
  }

  return {
    success: true,
    userId: record.user_id,
    connectionId,
  };
}

/**
 * Validates an active extension connection by its connection_id
 */
export async function validateExtensionConnection(
  connectionId: string
): Promise<{
  valid: boolean;
  userId: string | null;
  authToken?: string;
  userProfile?: Profile;
}> {
  if (!connectionId || !connectionId.startsWith("ext_conn_")) {
    return { valid: false, userId: null };
  }

  let conn = memoryConnections.get(connectionId) || null;

  if (!conn) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from("extension_connections")
          .select("*")
          .eq("connection_id", connectionId)
          .is("revoked_at", null)
          .maybeSingle();

        if (data) {
          conn = data as ExtensionConnectionRecord;
        }
      } catch {
        // Fallback
      }
    }
  }

  if (!conn || conn.revoked_at) {
    return { valid: false, userId: null };
  }

  conn.last_seen_at = new Date().toISOString();
  memoryConnections.set(connectionId, conn);

  return {
    valid: true,
    userId: conn.user_id,
    authToken: conn.auth_token,
    userProfile: conn.user_profile,
  };
}

/**
 * Revokes an extension connection
 */
export async function revokeExtensionConnection(connectionId: string): Promise<boolean> {
  if (!connectionId) return false;

  const conn = memoryConnections.get(connectionId);
  if (conn) {
    conn.revoked_at = new Date().toISOString();
    memoryConnections.set(connectionId, conn);
  }

  const supabase = getSupabaseClient(conn?.auth_token);
  if (supabase) {
    try {
      await supabase
        .from("extension_connections")
        .update({ revoked_at: new Date().toISOString() })
        .eq("connection_id", connectionId);
    } catch {
      // Fallback
    }
  }

  return true;
}
