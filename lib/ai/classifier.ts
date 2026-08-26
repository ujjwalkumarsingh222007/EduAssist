import { GoogleGenAI } from "@google/genai";

export type DocumentTypeCategory =
  | "CLASS_10_MARKSHEET"
  | "CLASS_12_MARKSHEET"
  | "DIPLOMA_MARKSHEET"
  | "UG_MARKSHEET"
  | "PG_MARKSHEET"
  | "TRANSCRIPT"
  | "INTERNSHIP_CERTIFICATE"
  | "INCOME_CERTIFICATE"
  | "IDENTITY_DOCUMENT"
  | "DOMICILE_CERTIFICATE"
  | "CATEGORY_CERTIFICATE"
  | "OTHER";

export type EducationLevel =
  | "CLASS_10"
  | "CLASS_12"
  | "DIPLOMA"
  | "UNDERGRADUATE"
  | "POSTGRADUATE"
  | "NONE";

export interface ClassificationResult {
  document_type: DocumentTypeCategory;
  education_level: EducationLevel;
  confidence: number;
  document_title: string;
  issuing_body_or_board?: string;
  reasoning?: string;
}

const CLASSIFICATION_SYSTEM_PROMPT = `
You are an expert Document Classification AI specializing in Indian and international academic, identity, and financial documents.

Your objective:
Accurately CLASSIFY the document into one of the supported document types and determine the academic education level.

CRITICAL CLASSIFICATION BOUNDARIES:
1. "CLASS_10_MARKSHEET" (education_level: "CLASS_10"):
   - Secondary School Examination, High School, Matriculation, Class X, SSC, 10th Standard.
   - Do NOT classify as Class 12 or College.

2. "CLASS_12_MARKSHEET" (education_level: "CLASS_12"):
   - Senior School Certificate Examination, Higher Secondary, Intermediate, Class XII, HSC, 10+2, Pre-University (PUC).
   - Contains streams like Science (PCM/PCB), Commerce, Arts/Humanities.
   - Do NOT classify as Class 10 or College.

3. "DIPLOMA_MARKSHEET" (education_level: "DIPLOMA"):
   - Polytechnic or State Board of Technical Education Diploma certificates.

4. "UG_MARKSHEET" (education_level: "UNDERGRADUATE"):
   - College/University semester grade sheets, bachelor degrees (B.Tech, B.E., B.Sc, B.Com, B.A., BCA, BBA, MBBS, etc.).
   - Contains terms like Semester, CGPA, SGPA, University, Department, Branch, Enrollment No.
   - Do NOT confuse school marksheets with College marksheets just because a school has "College" or "Public School" in its name.

5. "PG_MARKSHEET" (education_level: "POSTGRADUATE"):
   - Master degrees (M.Tech, M.S., MBA, M.Sc, MCA, M.A., etc.).

6. "INTERNSHIP_CERTIFICATE" (education_level: "NONE"):
   - Certificate of Internship, Industrial Training, Work Experience, Trainee Certificate, Letter of Completion of Internship.

7. "INCOME_CERTIFICATE" (education_level: "NONE"):
   - Government Revenue Department Income Certificate, Tahsildar / SDO / Magistrate certificate, Family Income Declaration.

8. "IDENTITY_DOCUMENT" (education_level: "NONE"):
   - Aadhaar Card, PAN Card, Passport, Voter ID (EPIC), Driving License.

9. "DOMICILE_CERTIFICATE" (education_level: "NONE"):
   - Residence / Domicile / Nativity / PRTC Certificate.

10. "CATEGORY_CERTIFICATE" (education_level: "NONE"):
    - Caste / Category Certificate (SC, ST, OBC, EWS certificate).

11. "TRANSCRIPT" (education_level: "UNDERGRADUATE" or "POSTGRADUATE" or "CLASS_12"):
    - Consolidated academic transcript or cumulative grade record.

12. "OTHER" (education_level: "NONE"):
    - Any other document.

You must return valid JSON with this exact schema:
{
  "document_type": "CLASS_10_MARKSHEET | CLASS_12_MARKSHEET | DIPLOMA_MARKSHEET | UG_MARKSHEET | PG_MARKSHEET | TRANSCRIPT | INTERNSHIP_CERTIFICATE | INCOME_CERTIFICATE | IDENTITY_DOCUMENT | DOMICILE_CERTIFICATE | CATEGORY_CERTIFICATE | OTHER",
  "education_level": "CLASS_10 | CLASS_12 | DIPLOMA | UNDERGRADUATE | POSTGRADUATE | NONE",
  "confidence": number (0.0 to 1.0),
  "document_title": "string (e.g. Class 10 Secondary School Examination Marksheet)",
  "issuing_body_or_board": "string (e.g. Central Board of Secondary Education)",
  "reasoning": "brief 1-sentence classification justification"
}
`;

export async function classifyDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = fileBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: CLASSIFICATION_SYSTEM_PROMPT },
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
      temperature: 0.0, // Zero temperature for deterministic classification
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI classification model.");
  }

  try {
    const result = JSON.parse(text) as ClassificationResult;
    return {
      document_type: result.document_type || "OTHER",
      education_level: result.education_level || "NONE",
      confidence: typeof result.confidence === "number" ? result.confidence : 0.85,
      document_title: result.document_title || "Document",
      issuing_body_or_board: result.issuing_body_or_board,
      reasoning: result.reasoning,
    };
  } catch {
    return {
      document_type: "OTHER",
      education_level: "NONE",
      confidence: 0.5,
      document_title: "Document",
    };
  }
}
