import { GoogleGenAI } from "@google/genai";
import type { ExtractionResult } from "../types/extraction";
import { isSensitiveField } from "./privacy";

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert Document Intelligence and OCR extraction AI specialized in Indian and international student, identity, and educational documents.

Your objective:
1. Automatically classify the document type from the content.
2. Extract ALL visible, legible information present in the document.
3. DO NOT hallucinate or guess any missing values. If a field is not present or not readable in the document, DO NOT include it.
4. Accurately preserve original values, spelling, capitalization, identifiers, numbers, and dates.

Supported Document Types include (but are not limited to):
- "Aadhaar Card"
- "PAN Card"
- "Marksheet (10th / Secondary)"
- "Marksheet (12th / Higher Secondary)"
- "Marksheet (University / College Semester)"
- "Degree / Diploma Certificate"
- "College / University Student ID"
- "Income Certificate"
- "Caste / Category Certificate (SC/ST/OBC/EWS)"
- "Domicile / Residence Certificate"
- "Birth Certificate"
- "Standardized Test Scorecard (JEE, NEET, CUET, GATE, CAT, etc.)"
- "Scholarship Award / Sanction Letter"
- "Letter of Recommendation"
- "Migration / Transfer Certificate"
- "Character Certificate"
- "Other Document"

Extraction Rules:
- Identify every single piece of information present on the document and place it in the "fields" object.
- Use clean, snake_case keys for fields (e.g. full_name, father_name, mother_name, guardian_name, date_of_birth, gender, phone, email, address, city, state, pincode, aadhaar_number, pan_number, roll_number, enrollment_number, registration_number, institution_name, university_name, degree_name, course_name, branch_stream, semester, academic_year, total_marks_obtained, maximum_marks, percentage, cgpa, grade, division_class, issue_date, expiry_date, issuing_authority, certificate_number, caste_category, annual_family_income, nationality, etc.).
- For each field, provide a "value" (string, number, or boolean) and a "confidence" score (between 0.0 and 1.0).
- If the document contains tabular academic marks (such as a marksheet or grade report), extract the table into the "tables" array with headers, rows, and structured "subjects" array:
  [{"subject_name": "...", "marks_obtained": "...", "maximum_marks": "...", "grade": "...", "credits": "..."}].

You must return valid JSON with this exact schema:
{
  "document_type": "string (e.g. Aadhaar Card, Marksheet (10th / Secondary), Income Certificate)",
  "confidence": number (0.0 to 1.0),
  "fields": {
    "field_name": {
      "value": "string | number | boolean",
      "confidence": number (0.0 to 1.0)
    }
  },
  "tables": [
    {
      "name": "Marks Breakdown",
      "headers": ["Subject", "Max Marks", "Marks Obtained", "Grade"],
      "rows": [["Mathematics", 100, 95, "A+"]],
      "subjects": [
        {
          "subject_name": "Mathematics",
          "marks_obtained": 95,
          "maximum_marks": 100,
          "grade": "A+"
        }
      ]
    }
  ],
  "notes": "Optional short observation if part of the document was low-resolution or partially obscured"
}
`;

/**
 * Extracts structured data from a document buffer (PDF or Image) using Gemini API.
 * The API key is kept strictly server-side.
 */
export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in server environment variables (.env.local)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = fileBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: EXTRACTION_SYSTEM_PROMPT,
          },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1, // Low temperature for high extraction fidelity
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("No response returned by AI extraction model.");
  }

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(responseText) as ExtractionResult;
  } catch {
    throw new Error("AI returned invalid JSON response.");
  }

  // Sanitize and mark sensitive fields
  if (parsed.fields && typeof parsed.fields === "object") {
    for (const [key, fieldObj] of Object.entries(parsed.fields)) {
      if (fieldObj && typeof fieldObj === "object") {
        fieldObj.is_sensitive = isSensitiveField(key);
      }
    }
  }

  return parsed;
}
