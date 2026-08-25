import { Scholarship, EligibilityMatch, EligibilityStatus, DocumentRequirementMatch } from "./types";
import { Profile, ProfileData } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function evaluateScholarshipEligibility(
  scholarship: Scholarship,
  profile: Profile | null,
  uploadedDocuments: StudentDocument[] = []
): EligibilityMatch {
  const pData: ProfileData = profile?.profile_data || {};
  
  const matched: string[] = [];
  const missing: string[] = [];
  const failed: string[] = [];

  // Extract Student Verified Profile Attributes
  const studentGender = profile?.gender || null;
  const studentState = profile?.state || (pData.eligibility?.domicile as string) || (profile?.city as string) || null;
  const studentCategory = (pData.eligibility?.category as string) || (pData.eligibility?.caste as string) || null;
  
  // Student Income
  const rawIncome = (pData.eligibility?.annual_income as string) || (pData.eligibility?.family_income as string) || null;
  const studentIncomeNum = parseNumber(rawIncome);

  // Student Academic Percentage / CGPA
  const rawPercentage = (pData.education?.percentage as string) || null;
  const studentPercentage = parseNumber(rawPercentage);
  const rawCgpa = (pData.education?.cgpa as string) || null;
  const studentCgpa = parseNumber(rawCgpa);
  const effectivePercentage = studentPercentage !== null ? studentPercentage : (studentCgpa !== null ? studentCgpa * 9.5 : null);

  // Student Education Level & Branch
  const studentDegree = (pData.education?.degree as string) || "";
  const studentCourse = (pData.education?.course as string) || "";
  const studentBranch = (pData.education?.branch as string) || "";

  // -------------------------------------------------------------
  // 1. Gender Requirement Check
  // -------------------------------------------------------------
  if (scholarship.eligible_gender && scholarship.eligible_gender !== "Any") {
    if (!studentGender) {
      missing.push(`Gender requirement: Scholarship is for ${scholarship.eligible_gender} applicants (Gender not specified in profile).`);
    } else if (studentGender.toLowerCase() === scholarship.eligible_gender.toLowerCase()) {
      matched.push(`Gender requirement satisfied (${studentGender}).`);
    } else {
      failed.push(`Gender requirement: Restricted to ${scholarship.eligible_gender} applicants (Profile states ${studentGender}).`);
    }
  }

  // -------------------------------------------------------------
  // 2. Minimum Percentage / Academic Score Check
  // -------------------------------------------------------------
  if (scholarship.minimum_percentage !== null && scholarship.minimum_percentage !== undefined) {
    if (effectivePercentage === null) {
      missing.push(`Minimum score requirement: Requires at least ${scholarship.minimum_percentage}% (Academic score not found in profile).`);
    } else if (effectivePercentage >= scholarship.minimum_percentage) {
      matched.push(`Academic score requirement satisfied: ${effectivePercentage}% (Minimum required: ${scholarship.minimum_percentage}%).`);
    } else {
      failed.push(`Academic score insufficient: Profile score is ${effectivePercentage}% (Minimum required: ${scholarship.minimum_percentage}%).`);
    }
  }

  // -------------------------------------------------------------
  // 3. Maximum Family Income Check
  // -------------------------------------------------------------
  if (scholarship.maximum_income !== null && scholarship.maximum_income !== undefined) {
    if (studentIncomeNum === null) {
      missing.push(`Income eligibility: Requires annual family income under ₹${scholarship.maximum_income.toLocaleString("en-IN")} (Income not entered in profile).`);
    } else if (studentIncomeNum <= scholarship.maximum_income) {
      matched.push(`Income criteria satisfied: ₹${studentIncomeNum.toLocaleString("en-IN")} (Below max threshold ₹${scholarship.maximum_income.toLocaleString("en-IN")}).`);
    } else {
      failed.push(`Income limit exceeded: Annual family income ₹${studentIncomeNum.toLocaleString("en-IN")} exceeds maximum limit of ₹${scholarship.maximum_income.toLocaleString("en-IN")}.`);
    }
  }

  // -------------------------------------------------------------
  // 4. State / Domicile Check
  // -------------------------------------------------------------
  if (scholarship.eligible_states && scholarship.eligible_states.length > 0 && !scholarship.eligible_states.includes("All India")) {
    if (!studentState) {
      missing.push(`State/Domicile requirement: Open to ${scholarship.eligible_states.join(", ")} (State not entered in profile).`);
    } else {
      const stateMatches = scholarship.eligible_states.some(st => 
        studentState.toLowerCase().includes(st.toLowerCase()) || st.toLowerCase().includes(studentState.toLowerCase())
      );
      if (stateMatches) {
        matched.push(`State / Domicile requirement satisfied (${studentState}).`);
      } else {
        failed.push(`State requirement: Only open to students from ${scholarship.eligible_states.join(", ")} (Profile state: ${studentState}).`);
      }
    }
  } else {
    matched.push("Open to all Indian states and union territories.");
  }

  // -------------------------------------------------------------
  // 5. Category / Caste Reservation Check
  // -------------------------------------------------------------
  if (scholarship.eligible_categories && scholarship.eligible_categories.length > 0 && !scholarship.eligible_categories.includes("All") && !scholarship.eligible_categories.includes("General")) {
    if (!studentCategory) {
      missing.push(`Category reservation: Restricted to ${scholarship.eligible_categories.join(", ")} (Category not specified in profile).`);
    } else {
      const catMatches = scholarship.eligible_categories.some(cat => 
        studentCategory.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(studentCategory.toLowerCase())
      );
      if (catMatches) {
        matched.push(`Category requirement satisfied: ${studentCategory}.`);
      } else {
        failed.push(`Category reservation: Available for ${scholarship.eligible_categories.join(", ")} (Student is ${studentCategory}).`);
      }
    }
  }

  // -------------------------------------------------------------
  // 6. Education Level / Course Match
  // -------------------------------------------------------------
  if (studentDegree || studentCourse || studentBranch) {
    const studentEduText = `${studentDegree} ${studentCourse} ${studentBranch}`.toLowerCase();
    const isLevelMatch = scholarship.education_levels.some(level => 
      studentEduText.includes(level.toLowerCase()) || level.toLowerCase().includes("all") || level.toLowerCase().includes("undergraduate")
    );
    if (isLevelMatch) {
      matched.push(`Education level matches: ${studentDegree || studentCourse || "Undergraduate Studies"}.`);
    }
  }

  // -------------------------------------------------------------
  // 7. Check Required Documents Availability
  // -------------------------------------------------------------
  const documentMatches: DocumentRequirementMatch[] = (scholarship.required_documents || []).map((reqDoc) => {
    const reqLower = reqDoc.toLowerCase();
    const matchedDoc = uploadedDocuments.find((d) => {
      const nameLower = d.file_name.toLowerCase();
      const typeLower = (d.document_type || "").toLowerCase();
      if (reqLower.includes("marksheet") && (typeLower.includes("transcript") || nameLower.includes("marksheet") || nameLower.includes("cbse"))) return true;
      if (reqLower.includes("income") && (typeLower.includes("recommendation") || nameLower.includes("income") || nameLower.includes("aay"))) return true;
      if (reqLower.includes("caste") && (nameLower.includes("caste") || nameLower.includes("category"))) return true;
      if (reqLower.includes("domicile") && (nameLower.includes("domicile") || nameLower.includes("residence"))) return true;
      if (reqLower.includes("aadhaar") && (typeLower.includes("id_card") || nameLower.includes("aadhaar") || nameLower.includes("aadhar"))) return true;
      if (reqLower.includes("id") && (typeLower.includes("id_card") || nameLower.includes("id"))) return true;
      return false;
    });

    return {
      document_name: reqDoc,
      is_available: Boolean(matchedDoc),
      source_document_file: matchedDoc?.file_name,
    };
  });

  // -------------------------------------------------------------
  // 8. Determine Overall Status & Score
  // -------------------------------------------------------------
  let status: EligibilityStatus;
  let reason = "";

  if (failed.length > 0) {
    status = "not_eligible";
    reason = `Does not meet ${failed.length} requirement(s): ${failed[0]}`;
  } else if (missing.length > 0) {
    status = "potentially_eligible";
    reason = `Potentially eligible, but missing verification for ${missing.length} requirement(s).`;
  } else {
    status = "eligible";
    reason = "All academic, income, category, and domicile criteria matched successfully.";
  }

  // Calculate score (0 to 100)
  const totalCriteria = matched.length + missing.length + failed.length;
  const matchScore = totalCriteria > 0 ? Math.round((matched.length / totalCriteria) * 100) : 70;

  return {
    scholarship,
    status,
    match_score: matchScore,
    matched_requirements: matched,
    missing_requirements: missing,
    failed_requirements: failed,
    document_matches: documentMatches,
    reason,
  };
}
