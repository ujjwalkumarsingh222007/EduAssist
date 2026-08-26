import { FieldScore, SubjectEntry } from "./schemas";

export interface ValidationIssue {
  field: string;
  issue_type: "ARITHMETIC_MISMATCH" | "INVALID_DATE" | "LOW_CONFIDENCE" | "RANGE_ERROR" | "MISSING_MANDATORY";
  message: string;
  severity: "WARNING" | "ERROR";
}

export interface ValidationSummary {
  is_valid: boolean;
  issues: ValidationIssue[];
  computed_percentage?: number | null;
  computed_total_marks?: number | null;
  computed_obtained_marks?: number | null;
}

/**
 * Normalizes any recognized date format to standard ISO (YYYY-MM-DD).
 */
export function normalizeDateToISO(val?: string | null): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Fallback Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    if (y >= 1950 && y <= 2035) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Deterministically validates marksheet mathematics and sanity.
 */
export function validateMarksheetData(
  obtainedMarks?: number | null,
  totalMarks?: number | null,
  extractedPercentage?: number | null,
  subjects?: SubjectEntry[]
): ValidationSummary {
  const issues: ValidationIssue[] = [];

  let computedObtained = obtainedMarks ?? null;
  let computedTotal = totalMarks ?? null;

  // 1. Calculate from subjects if individual marks exist
  if (subjects && subjects.length > 0) {
    let sumObtained = 0;
    let sumMax = 0;
    let validSubjectCount = 0;

    for (const sub of subjects) {
      const marks = typeof sub.marks_obtained === "number" ? sub.marks_obtained : parseFloat(String(sub.marks_obtained || "0"));
      const max = typeof sub.max_marks === "number" ? sub.max_marks : parseFloat(String(sub.max_marks || "100"));

      if (!isNaN(marks) && !isNaN(max) && max > 0) {
        sumObtained += marks;
        sumMax += max;
        validSubjectCount++;

        if (marks > max) {
          issues.push({
            field: `subject:${sub.name}`,
            issue_type: "ARITHMETIC_MISMATCH",
            message: `Subject "${sub.name}" marks obtained (${marks}) exceeds maximum marks (${max}).`,
            severity: "ERROR",
          });
        }
      }
    }

    if (validSubjectCount > 0) {
      if (!computedObtained) computedObtained = sumObtained;
      if (!computedTotal) computedTotal = sumMax;
    }
  }

  // 2. Validate obtained <= total
  if (computedObtained !== null && computedTotal !== null) {
    if (computedObtained > computedTotal) {
      issues.push({
        field: "obtained_marks",
        issue_type: "ARITHMETIC_MISMATCH",
        message: `Obtained marks (${computedObtained}) cannot exceed total marks (${computedTotal}).`,
        severity: "ERROR",
      });
    }
  }

  // 3. Validate percentage arithmetic
  let computedPercentage: number | null = null;
  if (computedObtained !== null && computedTotal !== null && computedTotal > 0) {
    computedPercentage = Math.round((computedObtained / computedTotal) * 10000) / 100;

    if (extractedPercentage !== null && extractedPercentage !== undefined) {
      const diff = Math.abs(extractedPercentage - computedPercentage);
      if (diff > 1.0) {
        issues.push({
          field: "percentage",
          issue_type: "ARITHMETIC_MISMATCH",
          message: `Extracted percentage (${extractedPercentage}%) differs from computed percentage (${computedPercentage}%) based on marks (${computedObtained}/${computedTotal}).`,
          severity: "WARNING",
        });
      }
    }
  }

  return {
    is_valid: issues.every((i) => i.severity !== "ERROR"),
    issues,
    computed_percentage: computedPercentage ?? extractedPercentage,
    computed_total_marks: computedTotal,
    computed_obtained_marks: computedObtained,
  };
}

/**
 * Categorizes a confidence score into standard UI tiers.
 */
export function getConfidenceTier(confidence: number): "HIGH" | "MEDIUM" | "LOW" {
  if (confidence >= 0.9) return "HIGH";
  if (confidence >= 0.7) return "MEDIUM";
  return "LOW";
}

/**
 * Standardizes common Indian and international board abbreviations.
 */
export function normalizeBoardName(rawBoard?: string | null): string {
  if (!rawBoard) return "";
  const clean = rawBoard.trim();
  const lower = clean.toLowerCase();

  if (lower.includes("central board") || lower.includes("cbse") || lower.includes("c.b.s.e")) {
    return "Central Board of Secondary Education (CBSE)";
  }
  if (lower.includes("council for the indian school") || lower.includes("cisce") || lower.includes("icse") || lower.includes("isc")) {
    return "Council for the Indian School Certificate Examinations (CISCE / ICSE / ISC)";
  }
  if (lower.includes("maharashtra") || lower.includes("msbshse")) {
    return "Maharashtra State Board (MSBSHSE)";
  }
  if (lower.includes("uttar pradesh") || lower.includes("up board") || lower.includes("upmsp")) {
    return "Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP)";
  }
  if (lower.includes("bihar") || lower.includes("bseb")) {
    return "Bihar School Examination Board (BSEB)";
  }
  if (lower.includes("karnataka") || lower.includes("kseeb")) {
    return "Karnataka Secondary Education Examination Board (KSEEB)";
  }
  if (lower.includes("tamil nadu") || lower.includes("tn board")) {
    return "Tamil Nadu State Board";
  }

  return clean;
}
