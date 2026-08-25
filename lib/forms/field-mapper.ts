import { FormFieldDescriptor, FieldMappingResult, FieldCategory, FieldStatus } from "./types";
import { Profile, ProfileData } from "@/lib/types/profile";
import { isSensitiveField } from "@/lib/ai/privacy";
import { isSecurityChallengeField, formatSafeDisplayValue } from "./privacy";

interface ProfileValueLookup {
  value: string | null;
  category: FieldCategory;
  profileKey: string;
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function formatDateForField(isoDate: string | null, fieldType?: string, fieldName?: string): string | null {
  if (!isoDate) return null;
  // If ISO YYYY-MM-DD
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;

  const [_, year, month, day] = match;

  // If HTML5 date input, standard is YYYY-MM-DD
  if (fieldType === "date") {
    return isoDate;
  }

  // If label/name hints DD/MM/YYYY or DD-MM-YYYY
  const normalized = (fieldName || "").toLowerCase();
  if (normalized.includes("dmy") || normalized.includes("dd/mm") || normalized.includes("dd-mm")) {
    return `${day}/${month}/${year}`;
  }

  return `${day}/${month}/${year}`; // Standard Indian web form format
}

/**
 * Extracts a map of normalized verified profile terms
 */
export function buildVerifiedLookup(profile: Profile | null): Map<string, ProfileValueLookup> {
  const lookup = new Map<string, ProfileValueLookup>();
  if (!profile) return lookup;

  const pData: ProfileData = profile.profile_data || {};

  function add(aliasKeys: string[], value: string | null | undefined, category: FieldCategory, profileKey: string) {
    if (!value || String(value).trim() === "") return;
    const cleanVal = String(value).trim();
    aliasKeys.forEach((key) => {
      lookup.set(normalizeKey(key), { value: cleanVal, category, profileKey });
    });
  }

  // 1. Personal
  add(["full_name", "candidate_name", "applicant_name", "student_name", "name"], profile.full_name, "personal", "full_name");
  
  if (profile.full_name) {
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length > 0) {
      add(["first_name", "fname", "given_name"], parts[0], "personal", "first_name");
    }
    if (parts.length > 1) {
      add(["last_name", "lname", "surname", "family_name"], parts[parts.length - 1], "personal", "last_name");
    }
    if (parts.length > 2) {
      add(["middle_name", "mname"], parts.slice(1, -1).join(" "), "personal", "middle_name");
    }
  }

  add(["date_of_birth", "dob", "birth_date", "birthdate"], profile.date_of_birth, "personal", "date_of_birth");
  add(["gender", "sex"], profile.gender, "personal", "gender");
  add(["phone", "mobile", "phone_number", "mobile_number", "contact_no", "contact_number"], profile.phone, "personal", "phone");
  add(["nationality", "citizen", "citizenship"], pData.personal?.nationality as string || "Indian", "personal", "nationality");
  add(["blood_group", "blood_grp"], pData.personal?.blood_group as string, "personal", "blood_group");

  // 2. Address
  add(["address", "permanent_address", "residential_address", "address_line_1", "street_address"], profile.address, "address", "address");
  add(["city", "district", "town", "city_town"], profile.city, "address", "city");
  add(["state", "province", "state_ut", "domicile_state"], profile.state, "address", "state");
  add(["country", "nation"], profile.country || "India", "address", "country");
  add(["pincode", "pin_code", "postal_code", "zip_code", "zip"], pData.personal?.pincode as string, "address", "pincode");

  // 3. Family
  add(["father_name", "fathers_name", "father_full_name", "father"], pData.family?.father_name as string, "family", "father_name");
  add(["mother_name", "mothers_name", "mother_full_name", "mother"], pData.family?.mother_name as string, "family", "mother_name");
  add(["guardian_name", "guardians_name", "guardian"], pData.family?.guardian_name as string, "family", "guardian_name");

  // 4. Identity (Verified)
  add(["aadhaar_number", "aadhaar", "aadhar_number", "aadhar", "uidai_number", "uid"], pData.identity?.aadhaar_number as string, "identity", "aadhaar_number");
  add(["pan_number", "pan", "pan_card_number"], pData.identity?.pan_number as string, "identity", "pan_number");
  add(["passport_number", "passport_no", "passport"], pData.identity?.passport_number as string, "identity", "passport_number");
  add(["voter_id", "epic_no", "voter_card"], pData.identity?.voter_id as string, "identity", "voter_id");

  // 5. Education
  add(["institution_name", "school_name", "college_name", "university_name", "institution", "college", "school", "university"], pData.education?.institution_name as string || pData.education?.university_name as string, "education", "institution_name");
  add(["degree", "degree_name", "qualification", "course_level", "program"], pData.education?.degree as string, "education", "degree");
  add(["course", "course_name", "stream", "discipline"], pData.education?.course as string, "education", "course");
  add(["branch", "major", "specialization", "branch_name"], pData.education?.branch as string, "education", "branch");
  add(["roll_number", "roll_no", "student_roll_no", "hall_ticket_no"], pData.education?.roll_number as string, "education", "roll_number");
  add(["enrollment_number", "enrollment_no", "registration_no", "reg_number", "prn_number"], pData.education?.enrollment_number as string || pData.education?.registration_number as string, "education", "enrollment_number");
  add(["percentage", "percent", "marks_percentage", "aggregate_percentage", "tenth_percentage", "twelfth_percentage"], pData.education?.percentage as string, "education", "percentage");
  add(["cgpa", "gpa", "sgpa", "grade_point"], pData.education?.cgpa as string, "education", "cgpa");
  add(["academic_year", "passing_year", "year_of_passing", "completion_year", "batch"], pData.education?.academic_year as string || pData.education?.graduation_year as string, "education", "academic_year");

  // 6. Financial & Eligibility
  add(["annual_income", "family_income", "annual_family_income", "total_income", "income", "parents_income"], pData.eligibility?.annual_income as string || pData.eligibility?.family_income as string, "financial", "annual_income");
  add(["category", "caste_category", "social_category", "reservation_category", "caste"], pData.eligibility?.category as string || pData.eligibility?.caste as string, "financial", "category");
  add(["domicile", "domicile_state", "resident_state"], pData.eligibility?.domicile as string || profile.state, "financial", "domicile");

  return lookup;
}

/**
 * Maps a single external form field descriptor to a verified profile value
 */
export function mapFormField(
  field: FormFieldDescriptor,
  verifiedLookup: Map<string, ProfileValueLookup>,
  profile: Profile | null
): FieldMappingResult {
  const isSecurity = isSecurityChallengeField(field.id) ||
                     isSecurityChallengeField(field.name) ||
                     isSecurityChallengeField(field.label) ||
                     field.type === "captcha";

  if (isSecurity) {
    return {
      field_id: field.id,
      field_label: field.label || field.name || "Security Verification",
      field_name: field.name,
      field_type: field.type,
      category: "security_challenge",
      status: "manual_security_challenge",
      filled_value: null,
      display_value: null,
      is_sensitive: true,
      notes: "CAPTCHA, OTP, and biometric challenges must be completed manually by the student for security.",
    };
  }

  // Strategy 1: Match by autocomplete attribute
  if (field.autocomplete) {
    const autoMatch = verifiedLookup.get(normalizeKey(field.autocomplete));
    if (autoMatch && autoMatch.value) {
      let finalVal = autoMatch.value;
      if (autoMatch.profileKey === "date_of_birth") {
        finalVal = formatDateForField(autoMatch.value, field.type, field.name) || autoMatch.value;
      }

      return {
        field_id: field.id,
        field_label: field.label || field.name,
        field_name: field.name,
        field_type: field.type,
        category: autoMatch.category,
        status: "filled",
        mapped_profile_key: autoMatch.profileKey,
        filled_value: finalVal,
        display_value: formatSafeDisplayValue(autoMatch.profileKey, finalVal),
        is_sensitive: isSensitiveField(autoMatch.profileKey),
        notes: `Mapped via standard autocomplete identifier (${field.autocomplete})`,
      };
    }
  }

  // Strategy 2: Match by name, id, label, or placeholder
  const candidateKeys = [
    field.name,
    field.id,
    field.label,
    field.placeholder || "",
  ].map(normalizeKey);

  for (const candidate of candidateKeys) {
    if (!candidate) continue;
    const directMatch = verifiedLookup.get(candidate);
    if (directMatch && directMatch.value) {
      let finalVal = directMatch.value;
      if (directMatch.profileKey === "date_of_birth") {
        finalVal = formatDateForField(directMatch.value, field.type, field.name) || directMatch.value;
      }

      return {
        field_id: field.id,
        field_label: field.label || field.name,
        field_name: field.name,
        field_type: field.type,
        category: directMatch.category,
        status: "filled",
        mapped_profile_key: directMatch.profileKey,
        filled_value: finalVal,
        display_value: formatSafeDisplayValue(directMatch.profileKey, finalVal),
        is_sensitive: isSensitiveField(directMatch.profileKey),
        notes: `Mapped from verified ${directMatch.profileKey.replace(/_/g, " ")}`,
      };
    }

    // Fuzzy substring match for composite names (e.g. "student_full_name", "txt_father_name", "ddl_gender")
    for (const [lookupKey, lookupEntry] of Array.from(verifiedLookup.entries())) {
      if (lookupKey.length >= 4 && (candidate.includes(lookupKey) || lookupKey.includes(candidate))) {
        let finalVal = lookupEntry.value;
        if (lookupEntry.profileKey === "date_of_birth") {
          finalVal = formatDateForField(lookupEntry.value, field.type, field.name) || lookupEntry.value;
        }

        return {
          field_id: field.id,
          field_label: field.label || field.name,
          field_name: field.name,
          field_type: field.type,
          category: lookupEntry.category,
          status: "filled",
          mapped_profile_key: lookupEntry.profileKey,
          filled_value: finalVal,
          display_value: formatSafeDisplayValue(lookupEntry.profileKey, finalVal),
          is_sensitive: isSensitiveField(lookupEntry.profileKey),
          notes: `Matched verified ${lookupEntry.profileKey.replace(/_/g, " ")}`,
        };
      }
    }
  }

  // Field cannot be confidently mapped from verified profile
  return {
    field_id: field.id,
    field_label: field.label || field.name || "Application Field",
    field_name: field.name,
    field_type: field.type,
    category: "unknown",
    status: "needs_user_input",
    filled_value: null,
    display_value: null,
    is_sensitive: false,
    notes: "Requires manual entry by applicant (no matching verified profile data).",
  };
}
