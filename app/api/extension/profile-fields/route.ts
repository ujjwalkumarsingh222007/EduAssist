import { NextRequest } from "next/server";
import { validateExtensionConnection, getSupabaseClient } from "@/lib/extension/pairing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/api/cors";
import { CANONICAL_FIELD_DICTIONARY } from "@/lib/profile/field-schema";
import { getProfileFieldWithSource, getProfileField } from "@/lib/profile/get-profile-field";
import { Profile } from "@/lib/types/profile";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  return jsonWithCors(request, {
    success: true,
    endpoint: "/api/extension/profile-fields",
    status: "ready",
  });
}

const SENSITIVE_FIELD_KEYS = new Set([
  "aadhaar_number",
  "pan_number",
  "passport_number",
  "account_number",
  "ifsc",
]);

function maskSensitiveValue(val: string): string {
  if (!val) return "••••••••••••";
  const clean = val.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••" + clean;
  return "••••••••" + clean.slice(-4);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonWithCors(
        request,
        {
          success: false,
          error: "AUTHENTICATION_FAILED",
          message: "Profile API authentication failed.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { valid, userId, authToken, userProfile } = await validateExtensionConnection(token);
    if (!valid || !userId) {
      return jsonWithCors(
        request,
        {
          success: false,
          error: "CONNECTION_EXPIRED",
          message: "Extension connection expired.",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedFields: string[] = Array.isArray(body.fields) ? body.fields : [];
    const confirmedSensitive: string[] = Array.isArray(body.confirmed_sensitive)
      ? body.confirmed_sensitive
      : [];

    if (requestedFields.length === 0) {
      return jsonWithCors(
        request,
        {
          success: false,
          error: "NO_FIELDS_REQUESTED",
          message: "Requested profile fields are unavailable.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch Student Profile from Supabase using user auth token if available
    let profileRow: Profile | null = null;
    const supabase = getSupabaseClient(authToken);

    if (supabase) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        profileRow = data as Profile;
      }
    }

    // Fallback to cached profile from connection context if database row is empty
    if (!profileRow && userProfile) {
      profileRow = userProfile;
    }

    // 2. Extract ONLY Requested Fields using Central Profile Resolver (lib/profile/get-profile-field.ts)
    const fieldsResult: Record<
      string,
      {
        available: boolean;
        value?: string | null;
        masked_value?: string;
        sensitive?: boolean;
        requires_explicit_confirmation?: boolean;
        verified?: boolean;
        source_document?: string;
        canonical_label?: string;
      }
    > = {};

    let availableCount = 0;
    let unavailableCount = 0;

    for (const fieldKey of requestedFields) {
      const def = CANONICAL_FIELD_DICTIONARY[fieldKey];
      const canonicalLabel = def ? def.label : fieldKey;

      const resolution = getProfileFieldWithSource(profileRow, fieldKey);
      const rawVal = resolution.value;
      const isSensitive = SENSITIVE_FIELD_KEYS.has(fieldKey) || Boolean(def?.isSensitive);
      const hasValue = Boolean(rawVal && rawVal.trim() !== "");

      // Safe logs (Strictly no personal values logged)
      console.log(`[SEA] canonical field: ${fieldKey}`);
      console.log(`[SEA] profile found: ${Boolean(profileRow)}`);
      console.log(`[SEA] profile_data found: ${Boolean(profileRow?.profile_data)}`);
      console.log(`[SEA] ${fieldKey} available: ${hasValue}`);

      if (isSensitive) {
        if (hasValue) availableCount++;
        else unavailableCount++;

        if (confirmedSensitive.includes(fieldKey)) {
          // User explicitly confirmed sensitive value retrieval
          fieldsResult[fieldKey] = {
            available: hasValue,
            value: rawVal || null,
            masked_value: maskSensitiveValue(rawVal),
            sensitive: true,
            requires_explicit_confirmation: false,
            verified: hasValue,
            source_document: resolution.source_document,
            canonical_label: canonicalLabel,
          };
        } else {
          // Sensitive field masked by default
          fieldsResult[fieldKey] = {
            available: hasValue,
            value: null,
            masked_value: maskSensitiveValue(rawVal),
            sensitive: true,
            requires_explicit_confirmation: true,
            verified: hasValue,
            source_document: resolution.source_document,
            canonical_label: canonicalLabel,
          };
        }
      } else {
        if (hasValue) availableCount++;
        else unavailableCount++;

        fieldsResult[fieldKey] = {
          available: hasValue,
          value: rawVal || null,
          sensitive: false,
          requires_explicit_confirmation: false,
          verified: hasValue,
          source_document: resolution.source_document,
          canonical_label: canonicalLabel,
        };
      }
    }

    console.log(`[SEA] Profile fields served: ${availableCount} available, ${unavailableCount} unavailable`);

    return jsonWithCors(request, {
      success: true,
      fields: fieldsResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Profile lookup failed";
    console.error("[SEA] profile-fields error:", msg);
    return jsonWithCors(
      request,
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Profile value resolution error",
      },
      { status: 500 }
    );
  }
}
