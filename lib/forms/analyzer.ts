import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ApplicationFormSchema, InternalFormSection, InternalFormField } from "./schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Standard application schema template used as fallback when analyzing official portals
export function getStandardTemplateSchema(url: string, title?: string): ApplicationFormSchema {
  const appName = title || "Higher Education Scholarship Application";

  return {
    application_name: appName,
    provider: "National Scholarship Portal & Higher Education Board",
    source_url: url,
    instructions: "Please verify all automatically populated details, complete the missing required fields, and link your verified documents.",
    sections: [
      {
        id: "sec_personal",
        name: "1. Personal Information",
        description: "Candidate basic personal and identity information",
        fields: [
          { id: "f_full_name", name: "full_name", label: "Full Name of Applicant", type: "text", required: true, profile_field: "full_name", placeholder: "e.g. Aarav Sharma" },
          { id: "f_dob", name: "date_of_birth", label: "Date of Birth", type: "date", required: true, profile_field: "date_of_birth" },
          { id: "f_gender", name: "gender", label: "Gender", type: "select", required: true, profile_field: "gender", options: ["Male", "Female", "Other"] },
          { id: "f_phone", name: "phone", label: "Mobile Number", type: "tel", required: true, profile_field: "phone", placeholder: "10-digit mobile number" },
          { id: "f_aadhaar", name: "aadhaar_number", label: "Aadhaar Number", type: "text", required: true, profile_field: "aadhaar", is_sensitive: true, placeholder: "12-digit Aadhaar" },
        ],
      },
      {
        id: "sec_family_address",
        name: "2. Family & Domicile Details",
        description: "Parentage, family income, and residential domicile",
        fields: [
          { id: "f_father_name", name: "father_name", label: "Father's Full Name", type: "text", required: true, profile_field: "father_name" },
          { id: "f_mother_name", name: "mother_name", label: "Mother's Full Name", type: "text", required: false, profile_field: "mother_name" },
          { id: "f_address", name: "address", label: "Permanent Residential Address", type: "textarea", required: true, profile_field: "address" },
          { id: "f_city", name: "city", label: "City / District", type: "text", required: true, profile_field: "city" },
          { id: "f_state", name: "state", label: "Domicile State", type: "select", required: true, profile_field: "state", options: ["Uttar Pradesh", "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Bihar", "West Bengal", "Other"] },
          { id: "f_pincode", name: "pincode", label: "Pincode", type: "text", required: true, profile_field: "pincode" },
          { id: "f_annual_income", name: "annual_income", label: "Annual Family Income (INR)", type: "number", required: true, profile_field: "annual_income", placeholder: "e.g. 180000" },
          { id: "f_category", name: "category", label: "Social Category / Caste", type: "select", required: true, profile_field: "category", options: ["General", "OBC", "SC", "ST", "EWS"] },
        ],
      },
      {
        id: "sec_academic",
        name: "3. Academic Information",
        description: "Current course, enrolled institution, and qualifying scores",
        fields: [
          { id: "f_institution", name: "institution_name", label: "School / College / University Name", type: "text", required: true, profile_field: "institution" },
          { id: "f_degree", name: "degree", label: "Degree / Course Level", type: "text", required: true, profile_field: "degree", placeholder: "e.g. B.Tech" },
          { id: "f_major", name: "major", label: "Branch / Specialization", type: "text", required: true, profile_field: "major", placeholder: "e.g. Computer Science" },
          { id: "f_roll_no", name: "roll_number", label: "Roll Number / Registration No.", type: "text", required: true, profile_field: "roll_number" },
          { id: "f_percentage", name: "percentage", label: "Previous Qualifying Marks (%)", type: "text", required: true, profile_field: "percentage", placeholder: "e.g. 92.5%" },
        ],
      },
      {
        id: "sec_financial",
        name: "4. Disbursement Bank Account",
        description: "Bank details for scholarship benefit direct bank transfer (DBT)",
        fields: [
          { id: "f_bank_name", name: "bank_name", label: "Bank Name", type: "text", required: true, placeholder: "e.g. State Bank of India" },
          { id: "f_account_no", name: "bank_account_number", label: "Bank Account Number", type: "text", required: true, placeholder: "Enter account number" },
          { id: "f_ifsc_code", name: "ifsc_code", label: "Bank IFSC Code", type: "text", required: true, placeholder: "11-character IFSC" },
        ],
      },
      {
        id: "sec_documents",
        name: "5. Required Supporting Documents",
        description: "Upload or link verified documents from your repository",
        fields: [
          { id: "f_doc_marksheet", name: "marksheet_doc", label: "Academic Marksheet / Transcript", type: "file", required: true, is_document_upload: true, description: "Official mark statement of qualifying examination" },
          { id: "f_doc_income", name: "income_doc", label: "Income Certificate (Aay Praman Patra)", type: "file", required: true, is_document_upload: true, description: "Issued by competent revenue authority (Tehsildar/SDM)" },
          { id: "f_doc_id", name: "id_proof_doc", label: "Identity Proof (Aadhaar / College ID)", type: "file", required: true, is_document_upload: true, description: "Government issued photo identity proof" },
        ],
      },
    ],
  };
}

/**
 * Analyzes a public application page HTML and generates structured ApplicationFormSchema
 */
export async function analyzeApplicationUrl(targetUrl: string): Promise<ApplicationFormSchema> {
  // Handle local test form
  if (targetUrl.includes("test-scholarship-form")) {
    return getStandardTemplateSchema(targetUrl, "National Higher Education Merit Scholarship Scheme (Test Portal)");
  }

  let htmlSnippet = "";
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const fullText = await res.text();
      // Extract form elements or body snippet up to 20,000 characters
      const formMatches = fullText.match(/<form[\s\S]*?<\/form>/gi);
      if (formMatches && formMatches.length > 0) {
        htmlSnippet = formMatches.join("\n").slice(0, 15000);
      } else {
        htmlSnippet = fullText.slice(0, 15000);
      }
    }
  } catch (err) {
    console.warn("Could not fetch remote HTML snippet directly, will use AI portal understanding:", err);
  }

  // If we have AI Key, prompt Gemini to understand the form schema
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "mock-key") {
    try {
      const prompt = `You are an expert system that analyzes scholarship and academic application pages to generate structured internal form definitions.
Target URL: ${targetUrl}
${htmlSnippet ? `Page HTML excerpt:\n${htmlSnippet}` : ""}

Task: Generate a comprehensive, multi-section application form schema representing all fields on this scholarship/academic application.
Group fields logically into 3-5 sections (e.g., Personal Information, Family & Domicile, Academic Details, Bank / Financial Details, Required Documents).
For each field, identify:
- id: unique string (e.g. "f_candidate_name")
- name: field identifier (e.g. "full_name")
- label: human readable label (e.g. "Full Name of Candidate")
- type: one of ["text", "number", "email", "tel", "date", "select", "radio", "checkbox", "textarea", "file"]
- required: boolean
- options: array of strings for select/radio
- profile_field: if this field maps to standard student profile, set to one of ["full_name", "date_of_birth", "gender", "phone", "email", "father_name", "mother_name", "address", "city", "state", "pincode", "institution", "degree", "major", "cgpa", "percentage", "annual_income", "category", "domicile", "aadhaar", "pan"]. Otherwise omit.
- is_sensitive: boolean (true for Aadhaar, PAN)
- is_document_upload: boolean (true for file uploads like Marksheet, Income Certificate, ID Card)

Output pure JSON matching the ApplicationFormSchema format.`;

      // Call with Promise.race 6s timeout
      const aiPromise = ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      const response = await Promise.race([aiPromise, timeoutPromise]);

      if (response && response.text) {
        const responseText = response.text.trim();
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            return {
              application_name: parsed.application_name || "Online Scholarship Application",
              provider: parsed.provider || "Scholarship Authority",
              source_url: targetUrl,
              instructions: parsed.instructions || "Please complete the required application fields.",
              sections: parsed.sections,
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn("AI form analysis fallback triggered:", aiErr);
    }
  }

  // Graceful fallback to verified template
  return getStandardTemplateSchema(targetUrl);
}
