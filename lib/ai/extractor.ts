import { GoogleGenAI } from "@google/genai";
import { classifyDocument, DocumentTypeCategory, EducationLevel, ClassificationResult } from "./classifier";
import { isSensitiveField } from "./privacy";
import { validateMarksheetData, ValidationSummary, normalizeDateToISO } from "./validator";
import { SubjectEntry, FieldScore } from "./schemas";

export interface UnifiedExtractedField {
  value: string | number | boolean | null;
  confidence: number;
  is_sensitive?: boolean;
  raw_label?: string;
  is_custom?: boolean;
}

export interface UnifiedExtractionResult {
  document_type: DocumentTypeCategory;
  education_level: EducationLevel;
  confidence: number;
  document_title: string;
  fields: Record<string, UnifiedExtractedField>;
  custom_fields?: Record<string, UnifiedExtractedField>;
  subjects?: SubjectEntry[];
  validation?: ValidationSummary;
  classification_meta?: ClassificationResult;
  notes?: string;
}

// ==========================================
// TARGETED UNIVERSAL PROMPTS
// ==========================================

const CLASS_10_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in Class 10 (Secondary School Examination / Matriculation / SSC / High School) Marksheets and Certificates.

Your objective is ZERO DATA LOSS: Extract EVERY meaningful piece of structured information.

Extract:
1. Candidate:
- full_name (Complete candidate name)
- first_name (Given name)
- middle_name (Middle name)
- last_name (Surname)
- father_name (Father's name)
- mother_name (Mother's name)
- date_of_birth (Format: YYYY-MM-DD or DD/MM/YYYY)
- gender (Male/Female/Other)

2. Academic:
- board (e.g. CBSE, ICSE, State Board)
- school_name (Full name of school - DO NOT label as college)
- school_code (School affiliation/center code if visible)
- center_number (Examination center number)
- roll_number (Roll No / Seat No / Index No)
- registration_number (Registration / Enrolment No / Candidate ID)
- enrollment_number (Enrollment No)
- certificate_number (Certificate serial/number)
- passing_year (Year of passing e.g. 2022)
- examination_year (Year/Month of examination e.g. March 2022)
- result (PASS / QUALIFIED / COMPARTMENT / PROMOTED)
- division (First / Second / Distinction)
- grade (Overall grade e.g. A1)
- percentage (Numerical percentage without %, e.g. 91.4)
- cgpa (CGPA e.g. 9.2)
- total_marks (Maximum possible total marks e.g. 500)
- obtained_marks (Total marks obtained e.g. 457)

3. Subjects Array:
[
  {
    "code": "041",
    "name": "Mathematics",
    "marks_obtained": 95,
    "max_marks": 100,
    "grade": "A1",
    "status": "PASS"
  }
]

4. Custom Fields:
Any other visible structured information not captured above (e.g. Admit Card ID, Mother Tongue, Medium of Instruction, Remarks).

Return JSON schema:
{
  "fields": {
    "full_name": { "value": string|null, "confidence": number },
    "first_name": { "value": string|null, "confidence": number },
    "middle_name": { "value": string|null, "confidence": number },
    "last_name": { "value": string|null, "confidence": number },
    "father_name": { "value": string|null, "confidence": number },
    "mother_name": { "value": string|null, "confidence": number },
    "date_of_birth": { "value": string|null, "confidence": number },
    "gender": { "value": string|null, "confidence": number },
    "board": { "value": string|null, "confidence": number },
    "school_name": { "value": string|null, "confidence": number },
    "school_code": { "value": string|null, "confidence": number },
    "center_number": { "value": string|null, "confidence": number },
    "roll_number": { "value": string|null, "confidence": number },
    "registration_number": { "value": string|null, "confidence": number },
    "enrollment_number": { "value": string|null, "confidence": number },
    "certificate_number": { "value": string|null, "confidence": number },
    "passing_year": { "value": string|null, "confidence": number },
    "examination_year": { "value": string|null, "confidence": number },
    "result": { "value": string|null, "confidence": number },
    "division": { "value": string|null, "confidence": number },
    "grade": { "value": string|null, "confidence": number },
    "percentage": { "value": number|null, "confidence": number },
    "cgpa": { "value": number|null, "confidence": number },
    "total_marks": { "value": number|null, "confidence": number },
    "obtained_marks": { "value": number|null, "confidence": number }
  },
  "subjects": [
    { "code": "string|null", "name": "string", "marks_obtained": number|string|null, "max_marks": number|string|null, "grade": "string|null", "status": "string|null" }
  ],
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const CLASS_12_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in Class 12 (Senior School Certificate Examination / Higher Secondary / Intermediate / 10+2 / HSC / PUC) Marksheets.

Your objective is ZERO DATA LOSS: Extract EVERY meaningful piece of structured information.

Extract:
1. Candidate:
- full_name (Complete candidate name)
- first_name (Given name)
- middle_name (Middle name)
- last_name (Surname)
- father_name (Father's name)
- mother_name (Mother's name)
- date_of_birth (Format: YYYY-MM-DD or DD/MM/YYYY)
- gender (Male/Female/Other)

2. Academic:
- board (e.g. CBSE, CISCE/ISC, State Board)
- school_name (Full name of school/junior college - DO NOT label as university)
- school_code (School affiliation/center code if visible)
- center_number (Examination center number)
- stream (Science / Commerce / Arts / Humanities / Vocational)
- roll_number (Roll No / Seat No / Index No)
- registration_number (Registration / Enrolment No / Candidate ID)
- enrollment_number (Enrollment No)
- certificate_number (Certificate serial/number)
- passing_year (Year of passing e.g. 2024)
- examination_year (Year/Month of examination e.g. May 2024)
- result (PASS / QUALIFIED / COMPARTMENT)
- division (First / Second / Distinction)
- grade (Overall grade)
- percentage (Numerical percentage without %, e.g. 94.6)
- cgpa (CGPA e.g. 9.4)
- total_marks (Maximum possible total marks e.g. 500)
- obtained_marks (Total marks obtained e.g. 473)

3. Subjects Array:
[
  {
    "code": "042",
    "name": "Physics",
    "marks_obtained": 95,
    "max_marks": 100,
    "grade": "A1",
    "status": "PASS"
  }
]

4. Custom Fields:
Any other visible structured information not captured above.

Return JSON schema:
{
  "fields": {
    "full_name": { "value": string|null, "confidence": number },
    "first_name": { "value": string|null, "confidence": number },
    "middle_name": { "value": string|null, "confidence": number },
    "last_name": { "value": string|null, "confidence": number },
    "father_name": { "value": string|null, "confidence": number },
    "mother_name": { "value": string|null, "confidence": number },
    "date_of_birth": { "value": string|null, "confidence": number },
    "gender": { "value": string|null, "confidence": number },
    "board": { "value": string|null, "confidence": number },
    "school_name": { "value": string|null, "confidence": number },
    "school_code": { "value": string|null, "confidence": number },
    "center_number": { "value": string|null, "confidence": number },
    "stream": { "value": string|null, "confidence": number },
    "roll_number": { "value": string|null, "confidence": number },
    "registration_number": { "value": string|null, "confidence": number },
    "enrollment_number": { "value": string|null, "confidence": number },
    "certificate_number": { "value": string|null, "confidence": number },
    "passing_year": { "value": string|null, "confidence": number },
    "examination_year": { "value": string|null, "confidence": number },
    "result": { "value": string|null, "confidence": number },
    "division": { "value": string|null, "confidence": number },
    "grade": { "value": string|null, "confidence": number },
    "percentage": { "value": number|null, "confidence": number },
    "cgpa": { "value": number|null, "confidence": number },
    "total_marks": { "value": number|null, "confidence": number },
    "obtained_marks": { "value": number|null, "confidence": number }
  },
  "subjects": [
    { "code": "string|null", "name": "string", "marks_obtained": number|string|null, "max_marks": number|string|null, "grade": "string|null", "status": "string|null" }
  ],
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const COLLEGE_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in College / University Undergraduate / Postgraduate / Diploma Grade Sheets and Transcripts.

Your objective is ZERO DATA LOSS: Extract EVERY visible piece of structured information.

Extract:
- student.full_name (Student's complete name)
- student.enrollment_number (University Enrollment Number / Registration Number)
- student.roll_number (College Roll Number / Exam Roll Number)
- student.registration_number (Registration No)

- college.university_name (Name of Affiliating University)
- college.college_name (Name of College / Institution / Department)
- college.degree (e.g. Bachelor of Technology, BCA, B.Sc, MBA)
- college.branch_or_major (e.g. Computer Science and Engineering)
- college.specialization (Specialization / Elective focus)
- college.semester (e.g. Semester 5 / Year 3)
- college.academic_year (e.g. 2024-2025)
- college.sgpa (SGPA e.g. 8.9)
- college.cgpa (CGPA e.g. 8.6)
- college.percentage (Percentage if provided)
- college.total_credits (Credits completed)
- college.backlogs (Number of active/cleared backlogs)
- college.result (PASS / PROMOTED / COMPLETED)

- subjects array: [{"code": "CS301", "name": "Operating Systems", "marks_obtained": 88, "max_marks": 100, "grade": "A", "credits": 4}]

- custom_fields: Any additional college attributes.

Return JSON schema:
{
  "fields": {
    "full_name": { "value": string|null, "confidence": number },
    "enrollment_number": { "value": string|null, "confidence": number },
    "roll_number": { "value": string|null, "confidence": number },
    "registration_number": { "value": string|null, "confidence": number },
    "university_name": { "value": string|null, "confidence": number },
    "college_name": { "value": string|null, "confidence": number },
    "degree": { "value": string|null, "confidence": number },
    "branch_or_major": { "value": string|null, "confidence": number },
    "specialization": { "value": string|null, "confidence": number },
    "semester": { "value": string|null, "confidence": number },
    "academic_year": { "value": string|null, "confidence": number },
    "sgpa": { "value": number|null, "confidence": number },
    "cgpa": { "value": number|null, "confidence": number },
    "percentage": { "value": number|null, "confidence": number },
    "total_credits": { "value": number|null, "confidence": number },
    "backlogs": { "value": string|number|null, "confidence": number },
    "result": { "value": string|null, "confidence": number }
  },
  "subjects": [
    { "code": "string|null", "name": "string", "marks_obtained": number|string|null, "max_marks": number|string|null, "grade": "string|null", "credits": number|string|null }
  ],
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const INTERNSHIP_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in Internship Certificates, Work Experience Letters, and Industrial Training Completion Certificates.

Your objective is ZERO DATA LOSS: Extract EVERY visible piece of structured information.

Extract:
- intern_name (Name of candidate)
- organization_name (Company / Institute offering internship)
- role_title (e.g. Software Engineering Intern, ML Research Intern)
- department_domain (e.g. Frontend Engineering, Data Science)
- supervisor_name (Name and designation of mentor/supervisor)
- project_name (Title of project worked on)
- start_date (Format: YYYY-MM-DD or readable date)
- end_date (Format: YYYY-MM-DD or readable date)
- duration (e.g. 3 Months, 8 Weeks)
- location (City / Remote)
- certificate_id (Certificate ID / Verification Serial Number)
- issue_date (Date of certificate issue)
- stipend (Stipend amount if stated)
- technologies (List of tools/technologies mentioned)
- description (Summary of responsibilities and achievements)

- custom_fields: Any additional certificate attributes.

Return JSON schema:
{
  "fields": {
    "full_name": { "value": string|null, "confidence": number },
    "organization_name": { "value": string|null, "confidence": number },
    "role_title": { "value": string|null, "confidence": number },
    "department_domain": { "value": string|null, "confidence": number },
    "supervisor_name": { "value": string|null, "confidence": number },
    "project_name": { "value": string|null, "confidence": number },
    "start_date": { "value": string|null, "confidence": number },
    "end_date": { "value": string|null, "confidence": number },
    "duration": { "value": string|null, "confidence": number },
    "location": { "value": string|null, "confidence": number },
    "certificate_id": { "value": string|null, "confidence": number },
    "issue_date": { "value": string|null, "confidence": number },
    "stipend": { "value": string|null, "confidence": number },
    "technologies": { "value": string|null, "confidence": number },
    "description": { "value": string|null, "confidence": number }
  },
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const INCOME_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in Income Certificates and Revenue Declarations.

Your objective is ZERO DATA LOSS: Extract EVERY visible piece of structured information.

Extract:
- applicant_name (Name of student or applicant)
- father_name (Father / Parent / Family Head name)
- annual_family_income (Numerical annual family income in INR e.g. 250000)
- monthly_income (Monthly income if stated)
- income_in_words (Annual income in words)
- financial_year (e.g. 2024-2025)
- certificate_number (Certificate Number / Application Number)
- issue_date (Date of issue: YYYY-MM-DD)
- valid_upto (Validity date if stated)
- issuing_authority (e.g. Tahsildar, Sub-Divisional Magistrate, Revenue Officer)
- district (District)
- state (State)

- custom_fields: Any additional revenue attributes (e.g. Land revenue, Agricultural income).

Return JSON schema:
{
  "fields": {
    "applicant_name": { "value": string|null, "confidence": number },
    "father_name": { "value": string|null, "confidence": number },
    "annual_family_income": { "value": number|null, "confidence": number },
    "monthly_income": { "value": number|null, "confidence": number },
    "income_in_words": { "value": string|null, "confidence": number },
    "financial_year": { "value": string|null, "confidence": number },
    "certificate_number": { "value": string|null, "confidence": number },
    "issue_date": { "value": string|null, "confidence": number },
    "valid_upto": { "value": string|null, "confidence": number },
    "issuing_authority": { "value": string|null, "confidence": number },
    "district": { "value": string|null, "confidence": number },
    "state": { "value": string|null, "confidence": number }
  },
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const IDENTITY_PROMPT = `
You are an expert Document Intelligence and OCR AI specialized in Identity Documents (Aadhaar Card, PAN Card, Passport, Voter ID, Driving License).

Your objective is ZERO DATA LOSS: Extract EVERY visible piece of structured information.

Extract:
- identity_type (Aadhaar Card / PAN Card / Passport / Voter ID / Driving License)
- full_name (Full name of cardholder)
- date_of_birth (Format: YYYY-MM-DD)
- gender (Male / Female / Other)
- father_name (Father's name if given on PAN/Aadhaar)
- id_number (12-digit Aadhaar / 10-char PAN / Passport No / Voter ID No)
- address (Complete residential address)
- city (City / District)
- state (State)
- pincode (6-digit PIN code)
- issue_date (Date of card issuance)
- expiry_date (Passport / License expiration date)

- custom_fields: Any additional identity attributes.

Return JSON schema:
{
  "fields": {
    "full_name": { "value": string|null, "confidence": number },
    "date_of_birth": { "value": string|null, "confidence": number },
    "gender": { "value": string|null, "confidence": number },
    "father_name": { "value": string|null, "confidence": number },
    "id_number": { "value": string|null, "confidence": number },
    "address": { "value": string|null, "confidence": number },
    "city": { "value": string|null, "confidence": number },
    "state": { "value": string|null, "confidence": number },
    "pincode": { "value": string|null, "confidence": number },
    "issue_date": { "value": string|null, "confidence": number },
    "expiry_date": { "value": string|null, "confidence": number }
  },
  "custom_fields": {
    "field_key": { "value": string|number|boolean|null, "confidence": number, "raw_label": "string" }
  }
}
`;

const GENERIC_PROMPT = `
You are an expert Document Intelligence and OCR AI.
Your objective is ZERO DATA LOSS: Extract ALL visible structured information and tables present in this document.

Return JSON schema:
{
  "fields": {
    "field_name": { "value": "string | number | boolean | null", "confidence": number, "raw_label": "string" }
  },
  "subjects": [],
  "custom_fields": {
    "field_key": { "value": "string | number | boolean | null", "confidence": number, "raw_label": "string" }
  }
}
`;

function selectPromptForCategory(category: DocumentTypeCategory): string {
  switch (category) {
    case "CLASS_10_MARKSHEET":
      return CLASS_10_PROMPT;
    case "CLASS_12_MARKSHEET":
      return CLASS_12_PROMPT;
    case "UG_MARKSHEET":
    case "PG_MARKSHEET":
    case "DIPLOMA_MARKSHEET":
    case "TRANSCRIPT":
      return COLLEGE_PROMPT;
    case "INTERNSHIP_CERTIFICATE":
      return INTERNSHIP_PROMPT;
    case "INCOME_CERTIFICATE":
      return INCOME_PROMPT;
    case "IDENTITY_DOCUMENT":
      return IDENTITY_PROMPT;
    default:
      return GENERIC_PROMPT;
  }
}

/**
 * Executes the complete Multi-Stage AI Document Extraction Pipeline with Zero Data Loss.
 */
export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string
): Promise<UnifiedExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment variables.");
  }

  // ==========================================
  // STAGE 1: DOCUMENT CLASSIFICATION
  // ==========================================
  const classification = await classifyDocument(fileBuffer, mimeType);

  // ==========================================
  // STAGE 2: TARGETED EXTRACTION
  // ==========================================
  const prompt = selectPromptForCategory(classification.document_type);
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = fileBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
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
      temperature: 0.05, // High fidelity deterministic extraction
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("No response returned by AI extraction model.");
  }

  let rawJson: {
    fields?: Record<string, { value: unknown; confidence?: number; raw_label?: string }>;
    subjects?: SubjectEntry[];
    custom_fields?: Record<string, { value: unknown; confidence?: number; raw_label?: string }>;
    notes?: string;
  };

  try {
    rawJson = JSON.parse(responseText);
  } catch {
    throw new Error("AI returned invalid JSON structure.");
  }

  // ==========================================
  // STAGE 3: STRUCTURE & SENSITIVITY ENRICHMENT
  // ==========================================
  const enrichedFields: Record<string, UnifiedExtractedField> = {};
  if (rawJson.fields && typeof rawJson.fields === "object") {
    for (const [k, v] of Object.entries(rawJson.fields)) {
      if (v && typeof v === "object" && "value" in v) {
        const val = v.value;
        const conf = typeof v.confidence === "number" ? v.confidence : 0.88;
        enrichedFields[k] = {
          value: val as string | number | boolean | null,
          confidence: conf,
          is_sensitive: isSensitiveField(k),
          raw_label: v.raw_label,
          is_custom: false,
        };
      } else {
        enrichedFields[k] = {
          value: v as unknown as string | number | boolean | null,
          confidence: 0.8,
          is_sensitive: isSensitiveField(k),
          is_custom: false,
        };
      }
    }
  }

  const enrichedCustomFields: Record<string, UnifiedExtractedField> = {};
  if (rawJson.custom_fields && typeof rawJson.custom_fields === "object") {
    for (const [k, v] of Object.entries(rawJson.custom_fields)) {
      if (v && typeof v === "object" && "value" in v && v.value !== null && v.value !== undefined) {
        const conf = typeof v.confidence === "number" ? v.confidence : 0.85;
        const entry: UnifiedExtractedField = {
          value: v.value as string | number | boolean,
          confidence: conf,
          is_sensitive: isSensitiveField(k),
          raw_label: v.raw_label || k,
          is_custom: true,
        };
        enrichedCustomFields[k] = entry;
        // Also place in main fields map for review modal visibility
        if (!enrichedFields[k]) {
          enrichedFields[k] = entry;
        }
      }
    }
  }

  const subjectsList: SubjectEntry[] = Array.isArray(rawJson.subjects) ? rawJson.subjects : [];

  // ==========================================
  // STAGE 4: DETERMINISTIC MATHEMATICAL VALIDATION
  // ==========================================
  let validation: ValidationSummary | undefined;
  if (
    classification.document_type === "CLASS_10_MARKSHEET" ||
    classification.document_type === "CLASS_12_MARKSHEET" ||
    classification.document_type === "UG_MARKSHEET"
  ) {
    const rawObtained = enrichedFields.obtained_marks?.value;
    const rawTotal = enrichedFields.total_marks?.value;
    const rawPercentage = enrichedFields.percentage?.value;

    const numObtained = typeof rawObtained === "number" ? rawObtained : parseFloat(String(rawObtained || "NaN"));
    const numTotal = typeof rawTotal === "number" ? rawTotal : parseFloat(String(rawTotal || "NaN"));
    const numPercentage = typeof rawPercentage === "number" ? rawPercentage : parseFloat(String(rawPercentage || "NaN"));

    validation = validateMarksheetData(
      isNaN(numObtained) ? null : numObtained,
      isNaN(numTotal) ? null : numTotal,
      isNaN(numPercentage) ? null : numPercentage,
      subjectsList
    );

    // If validation computed a percentage that was missing, backfill it
    if (validation.computed_percentage && (!enrichedFields.percentage || enrichedFields.percentage.value === null)) {
      enrichedFields.percentage = {
        value: validation.computed_percentage,
        confidence: 0.95,
        is_sensitive: false,
        raw_label: "Computed Percentage",
        is_custom: false,
      };
    }
  }

  return {
    document_type: classification.document_type,
    education_level: classification.education_level,
    confidence: classification.confidence,
    document_title: classification.document_title,
    fields: enrichedFields,
    custom_fields: enrichedCustomFields,
    subjects: subjectsList,
    validation,
    classification_meta: classification,
    notes: rawJson.notes,
  };
}
