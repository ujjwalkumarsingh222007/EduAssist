import { ApplicationFormSchema, ApplicationFormData, ApplicationFormFieldValue, InternalFormField } from "./schema";
import { Profile, ProfileData } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

/**
 * Normalizes string keys for flexible mapping
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Pre-fills an ApplicationFormSchema using ONLY verified student profile data and documents
 */
export function prefillFormFromProfile(
  schema: ApplicationFormSchema,
  profile: Profile | null,
  uploadedDocuments: StudentDocument[] = []
): ApplicationFormData {
  const formData: ApplicationFormData = {};
  if (!profile) return formData;

  const pData: ProfileData = profile.profile_data || {};

  // Build Verified Value Dictionary
  const verifiedMap = new Map<string, { val: string; isSensitive?: boolean }>();

  function set(keys: string[], val: string | null | undefined, isSensitive = false) {
    if (!val || String(val).trim() === "") return;
    const clean = String(val).trim();
    keys.forEach((k) => verifiedMap.set(normalizeKey(k), { val: clean, isSensitive }));
  }

  // Personal
  set(["full_name", "candidate_name", "student_name", "name", "applicant_name"], profile.full_name);
  set(["date_of_birth", "dob", "birth_date"], profile.date_of_birth);
  set(["gender", "sex"], profile.gender);
  set(["phone", "mobile", "mobile_number", "contact_no"], profile.phone);
  set(["nationality", "citizenship"], pData.personal?.nationality || "Indian");

  // Address
  set(["address", "permanent_address", "residential_address"], profile.address);
  set(["city", "district", "town"], profile.city);
  set(["state", "domicile_state", "province"], profile.state || pData.eligibility?.domicile);
  set(["pincode", "pin_code", "postal_code", "zip"], pData.personal?.pincode);

  // Family
  set(["father_name", "fathers_name", "father"], pData.family?.father_name);
  set(["mother_name", "mothers_name", "mother"], pData.family?.mother_name);
  set(["guardian_name", "guardian"], pData.family?.guardian_name);

  // Identity
  set(["aadhaar", "aadhaar_number", "aadhar", "uidai"], pData.identity?.aadhaar_number, true);
  set(["pan", "pan_number", "pan_card"], pData.identity?.pan_number, true);

  // Education
  set(["institution", "institution_name", "college", "college_name", "university", "school_name"], pData.education?.institution_name || pData.education?.university_name);
  set(["degree", "qualification", "course_level", "program"], pData.education?.degree);
  set(["major", "branch", "specialization", "course", "stream"], pData.education?.branch || pData.education?.course);
  set(["roll_number", "roll_no", "registration_no", "reg_number"], pData.education?.roll_number);
  set(["percentage", "percent", "marks", "previous_marks"], pData.education?.percentage);
  set(["cgpa", "gpa"], pData.education?.cgpa);

  // Financial & Eligibility
  set(["annual_income", "family_income", "total_income", "income"], pData.eligibility?.annual_income || pData.eligibility?.family_income);
  set(["category", "caste", "social_category"], pData.eligibility?.category || pData.eligibility?.caste);
  set(["domicile", "resident_state"], pData.eligibility?.domicile || profile.state);

  // Iterate schema sections and match fields
  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      // 1. Check Document Upload Field Match
      if (field.type === "file" || field.is_document_upload) {
        const fieldNameLower = (field.name + " " + field.label).toLowerCase();
        const matchedDoc = uploadedDocuments.find((d) => {
          const docName = (d.file_name || "").toLowerCase();
          const docType = (d.document_type || "").toLowerCase();
          if (fieldNameLower.includes("marksheet") && (docType.includes("transcript") || docName.includes("marksheet"))) return true;
          if (fieldNameLower.includes("income") && (docType.includes("recommendation") || docName.includes("income") || docName.includes("aay"))) return true;
          if (fieldNameLower.includes("caste") && (docName.includes("caste") || docName.includes("category"))) return true;
          if ((fieldNameLower.includes("id") || fieldNameLower.includes("aadhaar") || fieldNameLower.includes("identity")) && (docType.includes("id_card") || docName.includes("aadhaar") || docName.includes("id"))) return true;
          return false;
        });

        if (matchedDoc) {
          formData[field.id] = {
            value: matchedDoc.file_name,
            is_from_profile: true,
            linked_document_id: matchedDoc.id,
            linked_document_name: matchedDoc.file_name,
          };
          return;
        }
      }

      // 2. Candidate keys to match
      const candidateKeys = [
        field.profile_field || "",
        field.name,
        field.id,
        field.label,
      ].map(normalizeKey);

      let foundEntry: { val: string; isSensitive?: boolean } | null = null;

      for (const k of candidateKeys) {
        if (!k) continue;
        if (verifiedMap.has(k)) {
          foundEntry = verifiedMap.get(k)!;
          break;
        }
      }

      // 3. Populate or leave empty
      if (foundEntry && foundEntry.val) {
        formData[field.id] = {
          value: foundEntry.val,
          is_from_profile: true,
          is_sensitive: field.is_sensitive || foundEntry.isSensitive || false,
        };
      } else {
        // Leave completely blank (no guessing)
        formData[field.id] = {
          value: field.type === "checkbox" ? [] : null,
          is_from_profile: false,
          is_sensitive: field.is_sensitive || false,
        };
      }
    });
  });

  return formData;
}
