import { CanonicalProfile, CANONICAL_FIELD_DICTIONARY } from "./field-schema";
import { resolveCanonicalFieldKey } from "./field-aliases";
import { formatCanonicalDate } from "./date-normalizer";
import { formatFirstAndLast, combineFullName } from "./name-normalizer";

export interface TransformFieldOptions {
  targetFormat?: string;
  selectOptions?: string[];
  fieldType?: string;
  placeholder?: string;
}

export interface TransformedFieldResult {
  canonicalKey: string | null;
  targetLabel: string;
  value: string | null;
  confidence: number; // 0.0 to 1.0
  source: "user_confirmed" | "profile" | "document" | "derived" | "unverified";
  isSensitive: boolean;
  notes?: string;
}

/**
 * Matches canonical gender value against external website select/radio options
 */
export function matchGenderOption(canonicalGender: string, options: string[] = []): string | null {
  if (!canonicalGender) return null;
  const clean = canonicalGender.trim().toLowerCase();

  if (options.length === 0) {
    return canonicalGender;
  }

  // Male mappings
  if (clean === "male" || clean === "m" || clean === "man") {
    const found = options.find((opt) => {
      const o = opt.toLowerCase();
      return o === "male" || o === "m" || o === "man" || o === "1" || o.includes("male");
    });
    return found || "Male";
  }

  // Female mappings
  if (clean === "female" || clean === "f" || clean === "woman") {
    const found = options.find((opt) => {
      const o = opt.toLowerCase();
      return o === "female" || o === "f" || o === "woman" || o === "2" || o.includes("female");
    });
    return found || "Female";
  }

  // Other mappings
  if (clean === "other" || clean === "o" || clean === "third gender" || clean === "non-binary") {
    const found = options.find((opt) => {
      const o = opt.toLowerCase();
      return o === "other" || o === "o" || o.includes("third") || o.includes("other");
    });
    return found || "Other";
  }

  return null;
}

/**
 * Main Field Transformation Engine
 * Accepts canonical profile + website field descriptor/alias and produces the transformed value
 * with confidence score and provenance source.
 */
export function transformProfileField(
  profile: CanonicalProfile,
  targetFieldOrAlias: string,
  options: TransformFieldOptions = {}
): TransformedFieldResult {
  const canonicalKey = resolveCanonicalFieldKey(targetFieldOrAlias);
  const def = canonicalKey ? CANONICAL_FIELD_DICTIONARY[canonicalKey] : null;
  const isSensitive = def?.isSensitive ?? false;

  if (!canonicalKey) {
    return {
      canonicalKey: null,
      targetLabel: targetFieldOrAlias,
      value: null,
      confidence: 0.0,
      source: "unverified",
      isSensitive: false,
      notes: "No canonical field mapping found.",
    };
  }

  // 1. IDENTITY & NAME TRANSFORMATIONS
  if (canonicalKey === "full_name") {
    let nameVal = profile.full_name;
    if (!nameVal && (profile.name_components.first_name || profile.name_components.last_name)) {
      nameVal = combineFullName(profile.name_components);
    }
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: nameVal || null,
      confidence: nameVal ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "first_name") {
    const isManual = profile.name_components.is_manually_edited;
    const val = profile.name_components.first_name;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? (isManual ? 1.0 : 0.85) : 0.0,
      source: isManual ? "user_confirmed" : "derived",
      isSensitive,
    };
  }

  if (canonicalKey === "middle_name") {
    const isManual = profile.name_components.is_manually_edited;
    const val = profile.name_components.middle_name;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? (isManual ? 1.0 : 0.85) : 0.0,
      source: isManual ? "user_confirmed" : "derived",
      isSensitive,
    };
  }

  if (canonicalKey === "last_name") {
    const isManual = profile.name_components.is_manually_edited;
    const val = profile.name_components.last_name;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? (isManual ? 1.0 : 0.85) : 0.0,
      source: isManual ? "user_confirmed" : "derived",
      isSensitive,
    };
  }

  // 2. DATE OF BIRTH TRANSFORMATION
  if (canonicalKey === "date_of_birth") {
    if (!profile.date_of_birth) {
      return {
        canonicalKey,
        targetLabel: targetFieldOrAlias,
        value: null,
        confidence: 0.0,
        source: "unverified",
        isSensitive,
      };
    }

    const targetFormat =
      options.targetFormat ||
      (options.placeholder?.includes("DD/MM") ? "DD/MM/YYYY" : options.fieldType === "date" ? "YYYY-MM-DD" : "DD/MM/YYYY");

    const formattedDate = formatCanonicalDate(profile.date_of_birth, targetFormat);
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: formattedDate,
      confidence: 1.0,
      source: "profile",
      isSensitive,
    };
  }

  // 3. GENDER TRANSFORMATION
  if (canonicalKey === "gender") {
    const matchedGender = matchGenderOption(profile.gender, options.selectOptions);
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: matchedGender,
      confidence: matchedGender ? 0.95 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 4. NATIONALITY
  if (canonicalKey === "nationality") {
    const nat = profile.nationality || "Indian";
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: nat,
      confidence: 1.0,
      source: "profile",
      isSensitive,
    };
  }

  // 5. FAMILY TRANSFORMATIONS
  if (canonicalKey === "father_name") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.father_name || null,
      confidence: profile.father_name ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "mother_name") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.mother_name || null,
      confidence: profile.mother_name ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "guardian_name") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.guardian_name || null,
      confidence: profile.guardian_name ? 0.9 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 6. CONTACT & ADDRESS TRANSFORMATIONS
  if (canonicalKey === "phone") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.phone || null,
      confidence: profile.phone ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "email") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.email || null,
      confidence: profile.email ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "address") {
    const fullAddr = profile.address.full_address;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: fullAddr || null,
      confidence: fullAddr ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "address_line1") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.address_line1 || profile.address.full_address || null,
      confidence: profile.address.address_line1 ? 1.0 : 0.8,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "address_line2") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.address_line2 || null,
      confidence: profile.address.address_line2 ? 0.9 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "city") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.city || null,
      confidence: profile.address.city ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "state") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.state || profile.domicile || null,
      confidence: (profile.address.state || profile.domicile) ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "country") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.country || "India",
      confidence: 1.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "pincode") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.address.pincode || null,
      confidence: profile.address.pincode ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 7. EDUCATION TRANSFORMATIONS
  if (canonicalKey === "institution" || canonicalKey === "college") {
    const val = profile.education.institution || profile.education.college || profile.education.university;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "university") {
    const val = profile.education.university || profile.education.institution;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "degree") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.degree || null,
      confidence: profile.education.degree ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "course") {
    const val = profile.education.course || profile.education.degree;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "major" || canonicalKey === "branch" || canonicalKey === "specialization") {
    const val = profile.education.major || profile.education.branch || profile.education.specialization;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "roll_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.roll_number || null,
      confidence: profile.education.roll_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "registration_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.registration_number || null,
      confidence: profile.education.registration_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "enrollment_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.enrollment_number || null,
      confidence: profile.education.enrollment_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "graduation_year") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.graduation_year || null,
      confidence: profile.education.graduation_year ? 0.95 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "percentage") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.percentage || null,
      confidence: profile.education.percentage ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "cgpa") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.education.cgpa || null,
      confidence: profile.education.cgpa ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 8. FINANCIAL TRANSFORMATIONS
  if (canonicalKey === "annual_income" || canonicalKey === "family_income") {
    const val = profile.annual_income || profile.family_income;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "income_certificate_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.income_certificate_number || null,
      confidence: profile.income_certificate_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 9. IDENTITY DOCUMENTS (SENSITIVE)
  if (canonicalKey === "aadhaar_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.aadhaar_number || null,
      confidence: profile.aadhaar_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive: true,
    };
  }

  if (canonicalKey === "pan_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.pan_number || null,
      confidence: profile.pan_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive: true,
    };
  }

  if (canonicalKey === "passport_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.passport_number || null,
      confidence: profile.passport_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive: true,
    };
  }

  if (canonicalKey === "voter_id") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.voter_id || null,
      confidence: profile.voter_id ? 1.0 : 0.0,
      source: "profile",
      isSensitive: false,
    };
  }

  // 10. CATEGORY & DOMICILE
  if (canonicalKey === "category") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.category || null,
      confidence: profile.category ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "caste") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.caste || null,
      confidence: profile.caste ? 0.95 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  if (canonicalKey === "domicile") {
    const dom = profile.domicile || profile.address.state;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: dom || null,
      confidence: dom ? 1.0 : 0.0,
      source: "profile",
      isSensitive,
    };
  }

  // 11. BANK DETAILS (SENSITIVE)
  if (canonicalKey === "account_holder_name") {
    const val = profile.bank.account_holder_name || profile.full_name;
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: val || null,
      confidence: val ? 1.0 : 0.0,
      source: "profile",
      isSensitive: false,
    };
  }

  if (canonicalKey === "account_number") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.bank.account_number || null,
      confidence: profile.bank.account_number ? 1.0 : 0.0,
      source: "profile",
      isSensitive: true,
    };
  }

  if (canonicalKey === "ifsc") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.bank.ifsc || null,
      confidence: profile.bank.ifsc ? 1.0 : 0.0,
      source: "profile",
      isSensitive: true,
    };
  }

  if (canonicalKey === "bank_name") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.bank.bank_name || null,
      confidence: profile.bank.bank_name ? 1.0 : 0.0,
      source: "profile",
      isSensitive: false,
    };
  }

  if (canonicalKey === "branch_name") {
    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: profile.bank.branch_name || null,
      confidence: profile.bank.branch_name ? 0.9 : 0.0,
      source: "profile",
      isSensitive: false,
    };
  }

  // 12. DOCUMENT ATTACHMENTS
  if (canonicalKey.startsWith("doc_")) {
    const docType = canonicalKey.replace("doc_", "");
    const matchedDoc = profile.verified_documents.find((d) => {
      const ct = d.canonical_type.toLowerCase();
      const fn = d.file_name.toLowerCase();
      return ct.includes(docType) || fn.includes(docType);
    });

    return {
      canonicalKey,
      targetLabel: targetFieldOrAlias,
      value: matchedDoc?.file_name || null,
      confidence: matchedDoc ? 1.0 : 0.0,
      source: "document",
      isSensitive: false,
      notes: matchedDoc ? `Attached verified file: ${matchedDoc.file_name}` : "Document not found in repository.",
    };
  }

  return {
    canonicalKey,
    targetLabel: targetFieldOrAlias,
    value: null,
    confidence: 0.0,
    source: "unverified",
    isSensitive: false,
    notes: "Field not populated in profile.",
  };
}
