import { Profile, ProfileData, MarksheetTable } from "@/lib/types/profile";
import { resolveNameComponents } from "./name-normalizer";
import { parseToCanonicalIsoDate } from "./date-normalizer";

export interface ProfileFieldResolution {
  available: boolean;
  value: string;
  source_document?: string;
  verified: boolean;
  confidence?: number;
}

/**
 * Centralized Single-Source-of-Truth Profile Field Resolver.
 * Resolves a canonical profile field using strict priority:
 * 1. User Confirmed (profile_data.confirmed_fields[key])
 * 2. Verified Document Data (academic_results, certificates, structured marksheets)
 * 3. User Edited (profile_data.personal, family, identity, education, address, eligibility)
 * 4. Top-level Profile Database Columns
 * 5. Derived Name Components / Fallbacks
 */
export function getProfileFieldWithSource(
  profile: Profile | null | undefined,
  canonicalField: string
): ProfileFieldResolution {
  if (!profile) {
    return { available: false, value: "", verified: false };
  }

  const pData: ProfileData = profile.profile_data || {};
  const confirmed = pData.confirmed_fields || {};
  const personal = pData.personal || {};
  const addressObj = pData.address || {};
  const family = pData.family || {};
  const identity = pData.identity || {};
  const education = pData.education || {};
  const higherEd = pData.higher_education || {};
  const eligibility = pData.eligibility || {};
  const bank = (pData.bank as Record<string, string>) || {};
  const academicResults: MarksheetTable[] = pData.academic_results || [];

  // Helper to extract from confirmed_fields dictionary
  function fromConfirmed(key: string): { val: string; doc?: string; conf?: number } {
    const entry = (confirmed as Record<string, unknown>)[key];
    if (!entry) return { val: "" };
    if (typeof entry === "string") return { val: entry.trim() };
    if (typeof entry === "object" && entry !== null && "value" in entry) {
      const e = entry as { value?: unknown; source_document?: string; confidence?: number };
      return {
        val: String(e.value || "").trim(),
        doc: e.source_document,
        conf: e.confidence,
      };
    }
    return { val: "" };
  }

  // Academic marksheet table helpers (10th vs 12th vs UG)
  function findMarksheet(examType: "10" | "12" | "ug"): MarksheetTable | undefined {
    if (examType === "10" && pData.secondary_10th) return pData.secondary_10th;
    if (examType === "12" && pData.senior_secondary_12th) return pData.senior_secondary_12th;

    return academicResults.find((tbl) => {
      const name = `${tbl.examination_name || ""} ${tbl.source_document_name || ""}`.toLowerCase();
      if (examType === "10") {
        return name.includes("10th") || name.includes("secondary") || name.includes("ssc") || name.includes("matric") || name.includes("class 10");
      }
      if (examType === "12") {
        return name.includes("12th") || name.includes("higher secondary") || name.includes("hsc") || name.includes("intermediate") || name.includes("class 12");
      }
      if (examType === "ug") {
        return name.includes("bachelor") || name.includes("b.tech") || name.includes("semester") || name.includes("degree") || name.includes("graduation");
      }
      return false;
    });
  }

  const marksheet10 = findMarksheet("10");
  const marksheet12 = findMarksheet("12");
  const marksheetUG = findMarksheet("ug");

  // Raw full name extraction for name splitting
  const rawFullName = (
    profile.full_name ||
    fromConfirmed("full_name").val ||
    fromConfirmed("applicant_name").val ||
    (personal.full_name as string) ||
    ""
  ).trim();

  const manualNameOverrides = personal.name_components;
  const nameComponents = resolveNameComponents(rawFullName, manualNameOverrides);

  let val = "";
  let sourceDoc: string | undefined = undefined;
  let confidence: number | undefined = undefined;

  switch (canonicalField) {
    // ==========================================
    // 1. IDENTITY & NAMES
    // ==========================================
    case "full_name":
    case "applicant_name":
    case "candidate_name":
    case "student_name":
      val = rawFullName;
      sourceDoc = fromConfirmed("full_name").doc || fromConfirmed("applicant_name").doc;
      confidence = fromConfirmed("full_name").conf;
      break;

    case "first_name":
    case "given_name":
      val = fromConfirmed("first_name").val || (personal.first_name as string) || nameComponents.first_name || "";
      sourceDoc = fromConfirmed("first_name").doc;
      break;

    case "middle_name":
      val = fromConfirmed("middle_name").val || (personal.middle_name as string) || nameComponents.middle_name || "";
      break;

    case "last_name":
    case "surname":
    case "family_name":
      val = fromConfirmed("last_name").val || fromConfirmed("surname").val || (personal.last_name as string) || nameComponents.last_name || "";
      break;

    case "previous_name":
      val = fromConfirmed("previous_name").val || (personal.previous_name as string) || "";
      break;

    // ==========================================
    // 2. DEMOGRAPHICS & CONTACT
    // ==========================================
    case "date_of_birth":
    case "dob": {
      const rawDob = profile.date_of_birth || fromConfirmed("date_of_birth").val || (personal.date_of_birth as string) || "";
      val = parseToCanonicalIsoDate(rawDob) || rawDob;
      sourceDoc = fromConfirmed("date_of_birth").doc;
      break;
    }

    case "place_of_birth":
      val = fromConfirmed("place_of_birth").val || (personal.place_of_birth as string) || "";
      break;

    case "gender":
    case "sex":
      val = profile.gender || fromConfirmed("gender").val || (personal.gender as string) || "";
      sourceDoc = fromConfirmed("gender").doc;
      break;

    case "nationality":
    case "citizenship":
      val = fromConfirmed("nationality").val || (personal.nationality as string) || profile.country || "Indian";
      break;

    case "marital_status":
      val = fromConfirmed("marital_status").val || (personal.marital_status as string) || "Unmarried";
      break;

    case "blood_group":
      val = fromConfirmed("blood_group").val || (personal.blood_group as string) || "";
      break;

    case "mother_tongue":
      val = fromConfirmed("mother_tongue").val || (personal.mother_tongue as string) || "";
      break;

    case "phone":
    case "mobile":
    case "mobile_number":
    case "contact_number":
      val = profile.phone || fromConfirmed("phone").val || (personal.phone as string) || "";
      sourceDoc = fromConfirmed("phone").doc;
      break;

    case "alternate_phone":
      val = fromConfirmed("alternate_phone").val || (personal.alternate_phone as string) || (personal.emergency_contact as string) || "";
      break;

    case "email":
    case "email_address":
      val = fromConfirmed("email").val || (personal.email as string) || "";
      break;

    case "alternate_email":
      val = fromConfirmed("alternate_email").val || (personal.alternate_email as string) || "";
      break;

    // ==========================================
    // 3. GOVERNMENT IDENTITY NUMBERS
    // ==========================================
    case "aadhaar_number":
    case "aadhaar":
    case "aadhar":
    case "uidai":
      val = fromConfirmed("aadhaar_number").val || fromConfirmed("aadhaar").val || (identity.aadhaar_number as string) || "";
      sourceDoc = fromConfirmed("aadhaar_number").doc || fromConfirmed("aadhaar").doc;
      break;

    case "pan_number":
    case "pan":
    case "pan_card":
      val = fromConfirmed("pan_number").val || fromConfirmed("pan").val || (identity.pan_number as string) || "";
      sourceDoc = fromConfirmed("pan_number").doc || fromConfirmed("pan").doc;
      break;

    case "passport_number":
    case "passport":
      val = fromConfirmed("passport_number").val || (identity.passport_number as string) || "";
      break;

    case "voter_id":
    case "epic_no":
      val = fromConfirmed("voter_id").val || (identity.voter_id as string) || "";
      break;

    case "driving_license":
    case "dl_number":
      val = fromConfirmed("driving_license").val || (identity.driving_license as string) || "";
      break;

    // ==========================================
    // 4. ADDRESS & DOMICILE
    // ==========================================
    case "address":
    case "full_address":
    case "permanent_address":
      val =
        profile.address ||
        fromConfirmed("address").val ||
        (personal.address_line1 as string) ||
        (personal.address as string) ||
        (addressObj.permanent?.street ? `${addressObj.permanent?.house_number || ""} ${addressObj.permanent?.street}, ${addressObj.permanent?.city || ""}`.trim() : "");
      sourceDoc = fromConfirmed("address").doc;
      break;

    case "city":
    case "town":
      val = profile.city || fromConfirmed("city").val || (personal.city as string) || addressObj.permanent?.city || "";
      break;

    case "district":
      val = fromConfirmed("district").val || (personal.district as string) || addressObj.permanent?.district || profile.city || "";
      break;

    case "state":
    case "domicile_state":
      val = profile.state || fromConfirmed("state").val || (personal.state as string) || addressObj.permanent?.state || (eligibility.domicile as string) || (eligibility.domicile_state as string) || "";
      sourceDoc = fromConfirmed("state").doc || fromConfirmed("domicile").doc;
      break;

    case "country":
      val = profile.country || fromConfirmed("country").val || (personal.country as string) || "India";
      break;

    case "pincode":
    case "pin":
    case "postal_code":
    case "zip":
      val = fromConfirmed("pincode").val || (personal.pincode as string) || addressObj.permanent?.pincode || "";
      break;

    case "domicile":
    case "state_of_domicile":
      val = fromConfirmed("domicile").val || (eligibility.domicile as string) || (eligibility.domicile_state as string) || profile.state || "";
      sourceDoc = fromConfirmed("domicile").doc;
      break;

    // ==========================================
    // 5. FAMILY DETAILS
    // ==========================================
    case "father_name":
    case "fathers_name":
      val = fromConfirmed("father_name").val || (family.father_name as string) || "";
      sourceDoc = fromConfirmed("father_name").doc;
      break;

    case "father_occupation":
      val = fromConfirmed("father_occupation").val || (family.father_occupation as string) || "";
      break;

    case "father_education":
    case "father_qualification":
      val = fromConfirmed("father_education").val || (family.father_education as string) || "";
      break;

    case "father_income":
    case "father_annual_income":
      val = String(fromConfirmed("father_income").val || family.father_income || "");
      break;

    case "father_phone":
      val = fromConfirmed("father_phone").val || (family.father_phone as string) || "";
      break;

    case "mother_name":
    case "mothers_name":
      val = fromConfirmed("mother_name").val || (family.mother_name as string) || "";
      sourceDoc = fromConfirmed("mother_name").doc;
      break;

    case "mother_occupation":
      val = fromConfirmed("mother_occupation").val || (family.mother_occupation as string) || "";
      break;

    case "mother_education":
    case "mother_qualification":
      val = fromConfirmed("mother_education").val || (family.mother_education as string) || "";
      break;

    case "mother_income":
      val = String(fromConfirmed("mother_income").val || family.mother_income || "");
      break;

    case "guardian_name":
      val = fromConfirmed("guardian_name").val || (family.guardian_name as string) || "";
      break;

    case "guardian_relationship":
      val = fromConfirmed("guardian_relationship").val || (family.guardian_relationship as string) || "";
      break;

    // ==========================================
    // 6. CLASS 10 / SECONDARY EDUCATION
    // ==========================================
    case "class_10_percentage":
    case "10th_percentage":
    case "ssc_percentage":
      if (marksheet10?.percentage) {
        val = String(marksheet10.percentage);
        if (!val.endsWith("%")) val = `${val}%`;
        sourceDoc = marksheet10.source_document_name || "Class 10 Marksheet";
      } else {
        val = fromConfirmed("class_10_percentage").val || "";
        sourceDoc = fromConfirmed("class_10_percentage").doc;
      }
      break;

    case "class_10_marks":
    case "10th_marks":
      if (marksheet10?.total_marks) {
        val = String(marksheet10.total_marks);
        sourceDoc = marksheet10.source_document_name || "Class 10 Marksheet";
      } else {
        val = fromConfirmed("class_10_marks").val || "";
      }
      break;

    case "class_10_passing_year":
    case "10th_passing_year":
    case "10th_year":
      val = marksheet10?.year || marksheet10?.passing_year || fromConfirmed("class_10_passing_year").val || "";
      sourceDoc = marksheet10?.source_document_name || fromConfirmed("class_10_passing_year").doc;
      break;

    case "class_10_board":
    case "10th_board":
      val = marksheet10?.board_name || fromConfirmed("class_10_board").val || "";
      sourceDoc = marksheet10?.source_document_name || fromConfirmed("class_10_board").doc;
      break;

    case "class_10_roll_number":
    case "10th_roll_number":
    case "class10_roll_number":
    case "class10.roll_number":
      val = marksheet10?.roll_number || fromConfirmed("class_10_roll_number").val || fromConfirmed("secondary_10th_roll").val || "";
      sourceDoc = marksheet10?.source_document_name;
      break;

    case "class_10_registration_number":
    case "10th_registration_number":
    case "class10_registration_number":
    case "class10.registration_number":
    case "class_10_reg_no":
    case "10th_reg_no":
      val = marksheet10?.registration_number || fromConfirmed("secondary_10th_registration_number").val || fromConfirmed("class_10_registration_number").val || "";
      sourceDoc = marksheet10?.source_document_name;
      break;

    case "class_10_enrollment_number":
    case "10th_enrollment_number":
    case "class10_enrollment_number":
    case "class10.enrollment_number":
      val = marksheet10?.enrollment_number || fromConfirmed("secondary_10th_enrollment_number").val || "";
      break;

    case "class_10_obtained_marks":
    case "10th_obtained_marks":
    case "class10_obtained_marks":
    case "class10.obtained_marks":
      val = String(marksheet10?.obtained_marks || fromConfirmed("secondary_10th_obtained_marks").val || "");
      break;

    case "class_10_total_marks":
    case "10th_total_marks":
    case "class10_total_marks":
    case "class10.total_marks":
      val = String(marksheet10?.total_marks || fromConfirmed("secondary_10th_total_marks").val || "");
      break;

    case "class_10_division":
    case "10th_division":
      val = marksheet10?.division || fromConfirmed("secondary_10th_division").val || "";
      break;

    case "class_10_grade":
    case "10th_grade":
      val = marksheet10?.grade || fromConfirmed("secondary_10th_grade").val || "";
      break;

    case "class_10_school":
    case "10th_school":
    case "class10_school":
    case "class10.school_name":
      val = marksheet10?.school_name || marksheet10?.institution_name || fromConfirmed("class_10_school").val || fromConfirmed("secondary_10th_school").val || "";
      break;

    // ==========================================
    // 7. CLASS 12 / SENIOR SECONDARY EDUCATION
    // ==========================================
    case "class_12_percentage":
    case "12th_percentage":
    case "hsc_percentage":
    case "intermediate_percentage":
    case "class12_percentage":
    case "class12.percentage":
      if (marksheet12?.percentage) {
        val = String(marksheet12.percentage);
        if (!val.endsWith("%")) val = `${val}%`;
        sourceDoc = marksheet12.source_document_name || "Class 12 Marksheet";
      } else {
        val = fromConfirmed("class_12_percentage").val || fromConfirmed("senior_secondary_12th_percentage").val || "";
        sourceDoc = fromConfirmed("class_12_percentage").doc;
      }
      break;

    case "class_12_marks":
    case "12th_marks":
    case "class12_total_marks":
    case "class12.total_marks":
      if (marksheet12?.total_marks) {
        val = String(marksheet12.total_marks);
        sourceDoc = marksheet12.source_document_name || "Class 12 Marksheet";
      } else {
        val = fromConfirmed("class_12_marks").val || fromConfirmed("senior_secondary_12th_total_marks").val || "";
      }
      break;

    case "class_12_obtained_marks":
    case "12th_obtained_marks":
    case "class12_obtained_marks":
    case "class12.obtained_marks":
      val = String(marksheet12?.obtained_marks || fromConfirmed("senior_secondary_12th_obtained_marks").val || "");
      break;

    case "class_12_passing_year":
    case "12th_passing_year":
    case "12th_year":
    case "class12_passing_year":
    case "class12.passing_year":
      val = marksheet12?.year || marksheet12?.passing_year || fromConfirmed("class_12_passing_year").val || fromConfirmed("senior_secondary_12th_year").val || "";
      sourceDoc = marksheet12?.source_document_name || fromConfirmed("class_12_passing_year").doc;
      break;

    case "class_12_board":
    case "12th_board":
    case "class12_board":
    case "class12.board":
      val = marksheet12?.board_name || fromConfirmed("class_12_board").val || fromConfirmed("senior_secondary_12th_board").val || "";
      sourceDoc = marksheet12?.source_document_name || fromConfirmed("class_12_board").doc;
      break;

    case "class_12_stream":
    case "12th_stream":
    case "class12_stream":
    case "class12.stream":
      val = marksheet12?.stream || fromConfirmed("class_12_stream").val || fromConfirmed("senior_secondary_12th_stream").val || "";
      sourceDoc = marksheet12?.source_document_name || fromConfirmed("class_12_stream").doc;
      break;

    case "class_12_roll_number":
    case "12th_roll_number":
    case "class12_roll_number":
    case "class12.roll_number":
      val = marksheet12?.roll_number || fromConfirmed("class_12_roll_number").val || fromConfirmed("senior_secondary_12th_roll").val || "";
      sourceDoc = marksheet12?.source_document_name;
      break;

    case "class_12_registration_number":
    case "12th_registration_number":
    case "class12_registration_number":
    case "class12.registration_number":
    case "class_12_reg_no":
    case "12th_reg_no":
      val = marksheet12?.registration_number || fromConfirmed("senior_secondary_12th_registration_number").val || fromConfirmed("class_12_registration_number").val || "";
      sourceDoc = marksheet12?.source_document_name;
      break;

    case "class_12_enrollment_number":
    case "12th_enrollment_number":
    case "class12_enrollment_number":
    case "class12.enrollment_number":
      val = marksheet12?.enrollment_number || fromConfirmed("senior_secondary_12th_enrollment_number").val || "";
      break;

    case "class_12_division":
    case "12th_division":
      val = marksheet12?.division || fromConfirmed("senior_secondary_12th_division").val || "";
      break;

    case "class_12_grade":
    case "12th_grade":
      val = marksheet12?.grade || fromConfirmed("senior_secondary_12th_grade").val || "";
      break;

    case "class_12_school":
    case "12th_school":
    case "class12_school":
    case "class12.school_name":
      val = marksheet12?.school_name || marksheet12?.institution_name || fromConfirmed("class_12_school").val || fromConfirmed("senior_secondary_12th_school").val || "";
      break;

    // ==========================================
    // 8. HIGHER EDUCATION / GRADUATION
    // ==========================================
    case "institution":
    case "institution_name":
    case "college":
    case "college_name":
      val = fromConfirmed("institution").val || (education.institution_name as string) || (higherEd.institution_name as string) || "";
      sourceDoc = fromConfirmed("institution").doc;
      break;

    case "university":
    case "university_name":
      val = fromConfirmed("university").val || (education.university_name as string) || (higherEd.university_name as string) || "";
      sourceDoc = fromConfirmed("university").doc;
      break;

    case "degree":
    case "degree_name":
      val = fromConfirmed("degree").val || (education.degree as string) || (higherEd.degree as string) || "";
      break;

    case "course":
    case "course_name":
    case "program":
      val = fromConfirmed("course").val || (education.course as string) || (higherEd.course as string) || "";
      break;

    case "branch":
    case "major":
    case "branch_of_study":
    case "specialization":
      val = fromConfirmed("branch").val || (education.branch as string) || (higherEd.branch as string) || (higherEd.major as string) || "";
      break;

    case "current_semester":
    case "semester":
      val = String(fromConfirmed("current_semester").val || education.current_semester || higherEd.current_semester || "");
      break;

    case "graduation_year":
    case "expected_graduation_year":
      val = (education.expected_graduation_year as string) || (education.graduation_year as string) || (higherEd.expected_graduation_year as string) || fromConfirmed("graduation_year").val || "";
      break;

    case "roll_number":
    case "university_roll_number":
      val = fromConfirmed("roll_number").val || (education.roll_number as string) || "";
      break;

    case "enrollment_number":
    case "registration_number":
      val = fromConfirmed("enrollment_number").val || fromConfirmed("registration_number").val || (education.enrollment_number as string) || (education.registration_number as string) || "";
      break;

    case "cgpa":
    case "graduation_cgpa":
      if (marksheetUG?.cgpa) {
        val = String(marksheetUG.cgpa);
        sourceDoc = marksheetUG.source_document_name;
      } else {
        val = fromConfirmed("cgpa").val || (education.cgpa as string) || (higherEd.cgpa as string) || "";
      }
      break;

    case "percentage":
    case "graduation_percentage":
      if (marksheetUG?.percentage) {
        val = String(marksheetUG.percentage);
        if (!val.endsWith("%")) val = `${val}%`;
        sourceDoc = marksheetUG.source_document_name;
      } else {
        val = fromConfirmed("percentage").val || (education.percentage as string) || (higherEd.percentage as string) || "";
      }
      break;

    // ==========================================
    // 9. COMPETITIVE EXAMS
    // ==========================================
    case "jee_percentile":
    case "jee_main_percentile": {
      const jee = pData.competitive_exams?.find((e) => e.exam_name.toLowerCase().includes("jee"));
      val = String(jee?.percentile || fromConfirmed("jee_percentile").val || "");
      break;
    }

    case "jee_rank":
    case "jee_air": {
      const jee = pData.competitive_exams?.find((e) => e.exam_name.toLowerCase().includes("jee"));
      val = String(jee?.rank || fromConfirmed("jee_rank").val || "");
      break;
    }

    case "gate_score":
    case "gate_rank": {
      const gate = pData.competitive_exams?.find((e) => e.exam_name.toLowerCase().includes("gate"));
      val = String(gate?.score || gate?.rank || fromConfirmed("gate_score").val || "");
      break;
    }

    // ==========================================
    // 10. FINANCIAL & ELIGIBILITY
    // ==========================================
    case "annual_income":
    case "family_income":
    case "family_annual_income": {
      const inc = fromConfirmed("annual_income").val || (eligibility.annual_income as string) || (eligibility.family_income as string) || "";
      val = inc ? (inc.startsWith("₹") ? inc : `₹${inc}`) : "";
      sourceDoc = fromConfirmed("annual_income").doc || (eligibility.income_certificate_number ? "Income Certificate" : undefined);
      break;
    }

    case "income_certificate_number":
      val = fromConfirmed("income_certificate_number").val || (eligibility.income_certificate_number as string) || "";
      sourceDoc = "Income Certificate";
      break;

    case "category":
    case "social_category":
    case "caste_category":
      val = fromConfirmed("category").val || (eligibility.category as string) || (eligibility.caste as string) || "General";
      sourceDoc = fromConfirmed("category").doc || (eligibility.caste_certificate_number ? "Category Certificate" : undefined);
      break;

    case "pwd_status":
    case "disability_status":
      val = fromConfirmed("pwd_status").val || (eligibility.pwd_status as string) || "No";
      break;

    // ==========================================
    // 11. BANK ACCOUNT
    // ==========================================
    case "account_holder_name":
      val = fromConfirmed("account_holder_name").val || bank.account_holder_name || rawFullName;
      break;

    case "account_number":
      val = fromConfirmed("account_number").val || bank.account_number || "";
      break;

    case "ifsc":
    case "ifsc_code":
      val = fromConfirmed("ifsc").val || bank.ifsc || "";
      break;

    case "bank_name":
      val = fromConfirmed("bank_name").val || bank.bank_name || "";
      break;

    default: {
      const conf = fromConfirmed(canonicalField);
      if (conf.val) {
        val = conf.val;
        sourceDoc = conf.doc;
        confidence = conf.conf;
      }
      break;
    }
  }

  const cleanVal = val ? val.trim() : "";
  const isAvailable = Boolean(cleanVal && cleanVal.length > 0);

  return {
    available: isAvailable,
    value: cleanVal,
    source_document: sourceDoc,
    verified: Boolean(sourceDoc || isAvailable),
    confidence,
  };
}

/**
 * Convenient shorthand helper that directly returns the resolved string value.
 */
export function getProfileField(
  profile: Profile | null | undefined,
  canonicalField: string
): string {
  return getProfileFieldWithSource(profile, canonicalField).value;
}
