import {
  Opportunity,
  OpportunityEvaluationResult,
  EvaluationCriterionResult,
  EligibilityStatus,
  StructuredRequirementRule,
} from "@/lib/opportunities/types";
import { Profile, ProfileData } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";
import { getProfileFieldWithSource } from "@/lib/profile/get-profile-field";

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const clean = String(val).replace(/[^0-9.]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/**
 * Deterministic Multi-Factor Eligibility & Match Evaluator
 */
export function evaluateOpportunity(
  opportunity: Opportunity,
  profile: Profile | null,
  uploadedDocuments: StudentDocument[] = []
): OpportunityEvaluationResult {
  const pData: ProfileData = profile?.profile_data || {};
  const criteriaResults: EvaluationCriterionResult[] = [];
  const recommendedActions: string[] = [];

  let mandatoryPassCount = 0;
  let mandatoryFailCount = 0;
  let mandatoryMissingCount = 0;
  let totalMandatory = 0;

  // 1. Evaluate Explicit Structured Requirements
  const rules = opportunity.requirements || [];

  for (const rule of rules) {
    const fieldResolution = getProfileFieldWithSource(profile, rule.field);
    const studentVal = fieldResolution.value;
    const isMandatory = rule.required !== false;
    if (isMandatory) totalMandatory++;

    let passed = false;
    let isMissing = false;
    let reason = "";

    const reqValDisplay = rule.description || `${rule.operator} ${Array.isArray(rule.value) ? rule.value.join(", ") : rule.value}`;
    const studentValDisplay = studentVal || "Not provided in profile";
    const sourceDisplay = fieldResolution.source_document
      ? `✓ Verified ${fieldResolution.source_document}`
      : studentVal
      ? "✓ Verified Profile"
      : "⚠ Profile value missing";

    // Value Missing Check
    if (!fieldResolution.available || !studentVal) {
      isMissing = true;
      mandatoryMissingCount++;
      reason = `${rule.label || rule.field} is missing from student profile or verified documents.`;
      recommendedActions.push(`Update profile / upload document for ${rule.label || rule.field}`);

      criteriaResults.push({
        requirement_label: rule.label || rule.field,
        required_value_display: reqValDisplay,
        student_value_display: studentValDisplay,
        result: "INSUFFICIENT_INFO",
        source_display: sourceDisplay,
        reason,
        is_mandatory: isMandatory,
      });
      continue;
    }

    // Numerical Operators (>=, <=)
    if (rule.operator === ">=" || rule.operator === "<=") {
      const studentNum = parseNum(studentVal);
      const ruleNum = parseNum(rule.value);

      if (studentNum === null || ruleNum === null) {
        isMissing = true;
        mandatoryMissingCount++;
        reason = `Could not parse numeric score from profile value "${studentVal}".`;
      } else if (rule.operator === ">=") {
        passed = studentNum >= ruleNum;
        reason = passed
          ? `Score ${studentNum}% satisfies minimum requirement (${ruleNum}%).`
          : `Score ${studentNum}% is below the required ${ruleNum}%.`;
      } else {
        passed = studentNum <= ruleNum;
        reason = passed
          ? `Value ₹${studentNum.toLocaleString("en-IN")} is within the limit (₹${ruleNum.toLocaleString("en-IN")}).`
          : `Value ₹${studentNum.toLocaleString("en-IN")} exceeds the maximum limit of ₹${ruleNum.toLocaleString("en-IN")}.`;
      }
    }
    // Equality / In Operators (==, !=, in, contains)
    else if (rule.operator === "==" || rule.operator === "!=") {
      const normStudent = String(studentVal).toLowerCase().trim();
      const normRule = String(rule.value).toLowerCase().trim();
      passed = rule.operator === "==" ? normStudent === normRule : normStudent !== normRule;
      reason = passed
        ? `${rule.label || rule.field} matches criteria (${studentVal}).`
        : `Requires ${rule.value}, but profile has ${studentVal}.`;
    } else if (rule.operator === "in" || rule.operator === "contains") {
      const normStudent = String(studentVal).toLowerCase().trim();
      const allowed = Array.isArray(rule.value) ? rule.value.map((v) => String(v).toLowerCase().trim()) : [String(rule.value).toLowerCase().trim()];
      passed = allowed.some((target) => normStudent.includes(target) || target.includes(normStudent));
      reason = passed
        ? `Value "${studentVal}" matches allowed options.`
        : `Requires one of [${allowed.join(", ")}], but profile has "${studentVal}".`;
    }

    if (passed) {
      mandatoryPassCount++;
    } else if (!isMissing) {
      mandatoryFailCount++;
    }

    criteriaResults.push({
      requirement_label: rule.label || rule.field,
      required_value_display: reqValDisplay,
      student_value_display: studentValDisplay,
      result: isMissing ? "INSUFFICIENT_INFO" : passed ? "PASS" : "FAIL",
      source_display: sourceDisplay,
      reason,
      is_mandatory: isMandatory,
    });
  }

  // 2. Technical Skill Matching (For Internships / Tech Opportunities)
  const reqSkills = opportunity.required_skills || [];
  const prefSkills = opportunity.preferred_skills || [];

  // Extract skills from education, confirmed fields, and profile data
  const studentSkillsRaw: string[] = [];
  const confirmedSkills = (pData.confirmed_fields?.skills?.value as string) || "";
  const educationBranch = (pData.education?.branch as string) || "";
  const extraSkills = ((pData.personal as Record<string, unknown>)?.skills as string[]) || [];

  if (confirmedSkills) studentSkillsRaw.push(...confirmedSkills.split(/[,;\n]/));
  if (extraSkills.length) studentSkillsRaw.push(...extraSkills);
  if (educationBranch) studentSkillsRaw.push(educationBranch);

  // Common defaults inferred from computer science education
  if (educationBranch.toLowerCase().includes("computer") || educationBranch.toLowerCase().includes("it")) {
    studentSkillsRaw.push("Python", "Java", "C++", "HTML/CSS", "JavaScript", "SQL", "Git", "Data Structures", "Algorithms");
  }

  const studentSkillsNorm = studentSkillsRaw.map((s) => s.toLowerCase().trim()).filter(Boolean);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const preferredSkillsMatched: string[] = [];

  for (const skill of reqSkills) {
    const sNorm = skill.toLowerCase().trim();
    const isMatched = studentSkillsNorm.some((ss) => ss.includes(sNorm) || sNorm.includes(ss));
    if (isMatched) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
      recommendedActions.push(`Add or certify skill: ${skill}`);
    }
  }

  for (const pSkill of prefSkills) {
    const psNorm = pSkill.toLowerCase().trim();
    const isMatched = studentSkillsNorm.some((ss) => ss.includes(psNorm) || psNorm.includes(ss));
    if (isMatched) {
      preferredSkillsMatched.push(pSkill);
    }
  }

  let skillMatchScore = 100;
  if (reqSkills.length > 0) {
    skillMatchScore = Math.round((matchedSkills.length / reqSkills.length) * 100);
    // Add criteria result for skills
    criteriaResults.push({
      requirement_label: "Required Technical Skills",
      required_value_display: reqSkills.join(", "),
      student_value_display: matchedSkills.length > 0 ? matchedSkills.join(", ") : "None matched",
      result: matchedSkills.length === reqSkills.length ? "PASS" : matchedSkills.length > 0 ? "INSUFFICIENT_INFO" : "FAIL",
      source_display: "✓ Profile & Academic Specialization",
      reason: `${matchedSkills.length} of ${reqSkills.length} required skills verified (${skillMatchScore}% match).`,
      is_mandatory: true,
    });
  }

  // 3. Document Availability Check
  const requiredDocs = opportunity.required_documents || [];
  const missingDocs: string[] = [];

  for (const docName of requiredDocs) {
    const dLower = docName.toLowerCase();
    const hasDoc = uploadedDocuments.some((doc) => {
      const title = String(doc.extracted_data?.document_title || doc.extracted_data?.source_document_name || "");
      const name = `${doc.document_type} ${doc.file_name} ${title}`.toLowerCase();
      return name.includes(dLower) || dLower.includes(doc.document_type.toLowerCase());
    });

    if (!hasDoc) {
      missingDocs.push(docName);
      recommendedActions.push(`Upload missing document: ${docName}`);
    }
  }

  // 4. Determine Final Eligibility Status
  let status: EligibilityStatus = "ELIGIBLE";
  if (mandatoryFailCount > 0) {
    status = "INELIGIBLE";
  } else if (mandatoryMissingCount > 0 || missingSkills.length > 0) {
    status = mandatoryPassCount > 0 ? "PARTIALLY_ELIGIBLE" : "INSUFFICIENT_INFORMATION";
  } else {
    status = "ELIGIBLE";
  }

  // 5. Calculate Transparent Match Scores
  let eligibilityScore = 100;
  if (totalMandatory > 0) {
    eligibilityScore = Math.round((mandatoryPassCount / totalMandatory) * 100);
  }

  let overallMatchScore = eligibilityScore;
  if (reqSkills.length > 0) {
    overallMatchScore = Math.round(eligibilityScore * 0.7 + skillMatchScore * 0.3);
  }

  // Bonus for preferred skills (up to 5% boost, capped at 100%)
  if (prefSkills.length > 0 && preferredSkillsMatched.length > 0) {
    const prefBonus = Math.min(5, Math.round((preferredSkillsMatched.length / prefSkills.length) * 5));
    overallMatchScore = Math.min(100, overallMatchScore + prefBonus);
  }

  // If ineligible, cap score at 45% for clear visual separation
  if (status === "INELIGIBLE") {
    overallMatchScore = Math.min(45, overallMatchScore);
  }

  // 6. Application Readiness
  const profileComplete = Boolean(profile?.full_name && pData.education && pData.eligibility);
  const applicationReadiness = {
    profile_complete: profileComplete,
    required_documents_available: missingDocs.length === 0,
    is_eligible: status === "ELIGIBLE",
    total_required_documents: requiredDocs.length,
    available_documents_count: requiredDocs.length - missingDocs.length,
    missing_documents: missingDocs,
    captcha_manual: true,
    otp_manual: true,
    can_apply: status !== "INELIGIBLE",
  };

  return {
    opportunity,
    status,
    overall_match_score: overallMatchScore,
    eligibility_match_score: eligibilityScore,
    skill_match_score: skillMatchScore,
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    preferred_skills_matched: preferredSkillsMatched,
    criteria_results: criteriaResults,
    missing_documents: missingDocs,
    recommended_actions: Array.from(new Set(recommendedActions)),
    application_readiness: applicationReadiness,
    evaluated_at: new Date().toISOString(),
  };
}
