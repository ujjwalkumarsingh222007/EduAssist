import { Profile, ProfileData } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";
import { CanonicalProfile, CanonicalNameComponents } from "./field-schema";
import { resolveNameComponents } from "./name-normalizer";
import { parseToCanonicalIsoDate } from "./date-normalizer";

/**
 * Normalizes existing Profile + dynamic JSONB profile_data into the CanonicalProfile data model.
 * Guarantees zero data loss and preserves all original verified values.
 */
export function toCanonicalProfile(
  profile: Profile | null,
  documents: StudentDocument[] = []
): CanonicalProfile {
  if (!profile) {
    return createEmptyCanonicalProfile();
  }

  const pData: ProfileData = profile.profile_data || {};
  const personal = pData.personal || {};
  const family = pData.family || {};
  const identity = pData.identity || {};
  const education = pData.education || {};
  const eligibility = pData.eligibility || {};
  const bank = (pData as Record<string, unknown>).bank as Record<string, string> || {};

  // 1. Resolve Name & Components
  const rawFullName = profile.full_name || (personal.full_name as string) || "";
  const manualNameOverrides = personal.name_components as Partial<CanonicalNameComponents> | undefined;
  const nameComponents = resolveNameComponents(rawFullName, manualNameOverrides);

  // 2. Resolve Date of Birth
  const rawDob = profile.date_of_birth || (personal.date_of_birth as string) || "";
  const isoDob = parseToCanonicalIsoDate(rawDob) || rawDob;

  // 3. Resolve Address Components
  const fullAddr = profile.address || (personal.address as string) || "";
  const city = profile.city || (personal.city as string) || "";
  const state = profile.state || (personal.state as string) || (eligibility.domicile as string) || "";
  const country = profile.country || (personal.country as string) || "India";
  const pincode = (personal.pincode as string) || "";

  // 4. Map Verified Documents
  const verifiedDocs = documents.map((doc) => {
    let canonicalType = "document";
    const typeStr = (doc.document_type || "").toLowerCase();
    const nameStr = (doc.file_name || "").toLowerCase();

    if (typeStr.includes("transcript") || nameStr.includes("marksheet") || nameStr.includes("10th") || nameStr.includes("12th")) {
      canonicalType = nameStr.includes("10th") ? "doc_10th_marksheet" : "doc_12th_marksheet";
    } else if (nameStr.includes("degree") || typeStr.includes("degree")) {
      canonicalType = "doc_degree_certificate";
    } else if (nameStr.includes("income") || nameStr.includes("aay") || typeStr.includes("recommendation")) {
      canonicalType = "doc_income_certificate";
    } else if (nameStr.includes("caste") || nameStr.includes("category")) {
      canonicalType = "doc_caste_certificate";
    } else if (nameStr.includes("domicile") || nameStr.includes("niwas") || nameStr.includes("residence")) {
      canonicalType = "doc_domicile_certificate";
    } else if (nameStr.includes("aadhaar") || typeStr.includes("id_card")) {
      canonicalType = "doc_aadhaar";
    } else if (nameStr.includes("pan")) {
      canonicalType = "doc_pan";
    } else if (nameStr.includes("college") || nameStr.includes("student_id")) {
      canonicalType = "doc_college_id";
    }

    return {
      id: doc.id,
      canonical_type: canonicalType,
      file_name: doc.file_name,
      file_path: doc.file_path,
    };
  });

  return {
    full_name: rawFullName,
    name_components: nameComponents,
    date_of_birth: isoDob,
    gender: profile.gender || (personal.gender as string) || "",
    nationality: (personal.nationality as string) || "Indian",

    father_name: (family.father_name as string) || "",
    mother_name: (family.mother_name as string) || "",
    guardian_name: (family.guardian_name as string) || "",

    phone: profile.phone || (personal.phone as string) || "",
    email: (personal.email as string) || "",
    address: {
      full_address: fullAddr,
      address_line1: (personal.address_line1 as string) || fullAddr,
      address_line2: (personal.address_line2 as string) || "",
      city,
      state,
      country,
      pincode,
    },

    education: {
      institution: (education.institution_name as string) || "",
      university: (education.university_name as string) || (education.institution_name as string) || "",
      college: (education.institution_name as string) || "",
      degree: (education.degree as string) || "",
      course: (education.course as string) || (education.degree as string) || "",
      major: (education.branch as string) || (education.major as string) || "",
      branch: (education.branch as string) || "",
      specialization: (education.specialization as string) || "",
      roll_number: (education.roll_number as string) || "",
      registration_number: (education.registration_number as string) || "",
      enrollment_number: (education.enrollment_number as string) || "",
      graduation_year: (education.graduation_year as string) || "",
      percentage: (education.percentage as string) || "",
      cgpa: (education.cgpa as string) || "",
    },

    class10: (pData.secondary_10th as Record<string, unknown>) || {},
    class12: (pData.senior_secondary_12th as Record<string, unknown>) || {},

    annual_income: (eligibility.annual_income as string) || (eligibility.family_income as string) || "",
    family_income: (eligibility.family_income as string) || (eligibility.annual_income as string) || "",
    income_certificate_number: (eligibility.income_certificate_number as string) || "",

    aadhaar_number: (identity.aadhaar_number as string) || "",
    pan_number: (identity.pan_number as string) || "",
    passport_number: (identity.passport_number as string) || "",
    voter_id: (identity.voter_id as string) || "",

    category: (eligibility.category as string) || "",
    caste: (eligibility.caste as string) || "",
    domicile: (eligibility.domicile as string) || state,

    bank: {
      account_holder_name: (bank.account_holder_name as string) || rawFullName,
      account_number: (bank.account_number as string) || "",
      ifsc: (bank.ifsc as string) || "",
      bank_name: (bank.bank_name as string) || "",
      branch_name: (bank.branch_name as string) || "",
    },

    verified_documents: verifiedDocs,
    raw_profile_data: pData as Record<string, unknown>,
  };
}

export function createEmptyCanonicalProfile(): CanonicalProfile {
  return {
    full_name: "",
    name_components: { first_name: "", middle_name: "", last_name: "", is_manually_edited: false },
    date_of_birth: "",
    gender: "",
    nationality: "Indian",

    father_name: "",
    mother_name: "",
    guardian_name: "",

    phone: "",
    email: "",
    address: {
      full_address: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
    },

    education: {
      institution: "",
      university: "",
      college: "",
      degree: "",
      course: "",
      major: "",
      branch: "",
      specialization: "",
      roll_number: "",
      registration_number: "",
      enrollment_number: "",
      graduation_year: "",
      percentage: "",
      cgpa: "",
    },

    annual_income: "",
    family_income: "",
    income_certificate_number: "",

    aadhaar_number: "",
    pan_number: "",
    passport_number: "",
    voter_id: "",

    category: "",
    caste: "",
    domicile: "",

    bank: {
      account_holder_name: "",
      account_number: "",
      ifsc: "",
      bank_name: "",
      branch_name: "",
    },

    verified_documents: [],
  };
}
