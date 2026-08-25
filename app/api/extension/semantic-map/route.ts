import { NextRequest } from "next/server";
import { validateExtensionConnection } from "@/lib/extension/pairing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/api/cors";
import { CANONICAL_FIELD_DICTIONARY } from "@/lib/profile/field-schema";
import { matchFieldLocally, FieldMetadataInput, SemanticMatchResult } from "@/lib/profile/semantic-matcher";
import { GoogleGenAI } from "@google/genai";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const AI_MAPPING_PROMPT = `
You are an expert Form Field Mapping AI for educational and scholarship portals.
Your task is to analyze an ambiguous form input field from an external portal and map it to the most accurate canonical profile field key.

CANONICAL FIELD DICTIONARY:
${Object.entries(CANONICAL_FIELD_DICTIONARY)
  .map(([k, def]) => `- "${k}": ${def.label} (${def.description})`)
  .join("\n")}

STRICT RULES:
1. Identify ONLY what information the form is asking for.
2. NEVER guess or invent student data.
3. If the field clearly maps to one of the canonical keys listed above, return that key with high confidence (0.80 to 1.0).
4. If the field is a portal-specific custom question, captcha, or unrelated to student profile, return canonical_field: null with low confidence.
5. Return valid JSON only with this schema:
{
  "canonical_field": "string or null",
  "confidence": number,
  "reason": "short explanation"
}
`;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonWithCors(request, { success: false, error: "AUTHENTICATION_FAILED" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { valid } = await validateExtensionConnection(token);
    if (!valid) {
      return jsonWithCors(request, { success: false, error: "CONNECTION_EXPIRED" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const fields: FieldMetadataInput[] = Array.isArray(body.fields) ? body.fields : [];

    if (fields.length === 0) {
      return jsonWithCors(request, { success: false, error: "NO_FIELDS_PROVIDED" }, { status: 400 });
    }

    const results: Record<string, SemanticMatchResult> = {};
    const unmappedForAI: { fieldKey: string; input: FieldMetadataInput }[] = [];

    // Step 1: Run Level 1 and Level 2 Local Matching
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const fieldKey = f.field_id || f.name || f.id || `field_${i}`;
      const localResult = matchFieldLocally(f);

      if (localResult.confidence >= 0.85 || localResult.source === "user_controlled" || localResult.source === "file_upload" || localResult.source === "declaration") {
        results[fieldKey] = localResult;
      } else {
        unmappedForAI.push({ fieldKey, input: f });
      }
    }

    // Step 2: Run Level 3 AI Fallback for remaining unknown fields ONLY
    const apiKey = process.env.GEMINI_API_KEY;
    if (unmappedForAI.length > 0 && apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        for (const item of unmappedForAI) {
          const promptPayload = {
            label: item.input.label || "",
            name: item.input.name || "",
            id: item.input.id || "",
            placeholder: item.input.placeholder || "",
            element_type: item.input.element_type || "",
            input_type: item.input.input_type || "",
            section_context: item.input.section_context || "",
            options: item.input.options || [],
          };

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: AI_MAPPING_PROMPT },
                  { text: `Field to classify:\n${JSON.stringify(promptPayload, null, 2)}` },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const resText = response.text;
          if (resText) {
            const parsed = JSON.parse(resText);
            const canonicalKey = parsed.canonical_field;
            const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

            if (canonicalKey && CANONICAL_FIELD_DICTIONARY[canonicalKey] && confidence >= 0.7) {
              const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
              results[item.fieldKey] = {
                canonical_field: canonicalKey,
                canonical_display_name: def.label,
                confidence,
                source: "ai_fallback",
                needs_confirmation: false,
                reason: parsed.reason || "Matched by AI Form Classifier",
              };
            } else {
              results[item.fieldKey] = {
                canonical_field: null,
                canonical_display_name: "Unmapped Field",
                confidence: 0.4,
                source: "unknown",
                needs_confirmation: true,
                reason: parsed.reason || "Ambiguous field",
              };
            }
          } else {
            results[item.fieldKey] = {
              canonical_field: null,
              canonical_display_name: "Unmapped Field",
              confidence: 0.3,
              source: "unknown",
              needs_confirmation: true,
            };
          }
        }
      } catch (aiErr) {
        console.warn("[SEA] AI semantic mapping fallback encountered error, using local fallback:", aiErr);
        for (const item of unmappedForAI) {
          if (!results[item.fieldKey]) {
            results[item.fieldKey] = {
              canonical_field: null,
              canonical_display_name: "Unmapped Field",
              confidence: 0.3,
              source: "unknown",
              needs_confirmation: true,
            };
          }
        }
      }
    } else {
      // If no AI key configured or no unmapped fields, return default unknown
      for (const item of unmappedForAI) {
        results[item.fieldKey] = {
          canonical_field: null,
          canonical_display_name: "Unmapped Field",
          confidence: 0.3,
          source: "unknown",
          needs_confirmation: true,
        };
      }
    }

    return jsonWithCors(request, {
      success: true,
      mappings: results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Server error";
    return jsonWithCors(request, { success: false, error: "SERVER_ERROR", details: errorMsg }, { status: 500 });
  }
}
