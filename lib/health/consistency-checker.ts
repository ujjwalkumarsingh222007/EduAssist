import {
  normalizeText,
  normalizeName,
  compareNames,
  compareDates,
  compareNumerics,
  compareIdentifiers,
} from "./normalizer";

export type FieldCategory =
  | "IDENTITY_STABLE"
  | "ADDRESS_VARIABLE"
  | "ACADEMIC_DOCUMENT_SPECIFIC"
  | "CATEGORY_ELIGIBILITY"
  | "CERTIFICATE_SPECIFIC";

export type HealthSeverity = "consistent" | "possible_difference" | "important_mismatch";

export interface DocumentValueEntry {
  document_id: string;
  document_name: string;
  document_type: string;
  value: string;
}

export interface MultiDocumentConflict {
  id: string;
  field_key: string;
  field_label: string;
  category: FieldCategory;
  severity: HealthSeverity;
  documents_affected: number;
  document_values: DocumentValueEntry[];
  explanation: string;
  recommendation: string;
  is_resolved?: boolean;
}

export interface MatrixCell {
  status: "match" | "possible_variation" | "mismatch" | "not_present";
  value: string;
  document_id: string;
  document_name: string;
}

export interface MatrixRow {
  field_key: string;
  field_label: string;
  category: FieldCategory;
  cells: Record<string, MatrixCell>; // document_id -> MatrixCell
  consensus_status: HealthSeverity;
}

export interface MultiDocumentAuditResult {
  overall_status: "all_consistent" | "needs_attention" | "has_critical_mismatches";
  identity_consistency: {
    total_fields: number;
    consistent_fields: number;
    status: "consistent" | "has_issues";
  };
  academic_consistency: {
    total_fields: number;
    consistent_fields: number;
    status: "consistent" | "has_issues";
  };
  matrix: {
    columns: { document_id: string; document_name: string; document_type: string }[];
    rows: MatrixRow[];
  };
  conflicts: MultiDocumentConflict[];
  total_documents_compared: number;
  audited_at: string;
}

export interface DocumentComparisonInput {
  id: string;
  file_name: string;
  document_type: string;
  extracted_data?: Record<string, unknown> | null;
}

/**
 * Returns field categorization to prevent false alarms on expected differences.
 */
export function getFieldCategory(fieldKey: string): FieldCategory {
  switch (fieldKey) {
    case "full_name":
    case "first_name":
    case "middle_name":
    case "last_name":
    case "date_of_birth":
    case "dob":
    case "place_of_birth":
    case "gender":
    case "nationality":
    case "father_name":
    case "fathers_name":
    case "mother_name":
    case "mothers_name":
    case "guardian_name":
    case "aadhaar_number":
    case "pan_number":
      return "IDENTITY_STABLE";

    case "address":
    case "village":
    case "city":
    case "district":
    case "state":
    case "country":
    case "pincode":
    case "pin_code":
      return "ADDRESS_VARIABLE";

    case "school_name":
    case "college_name":
    case "university":
    case "university_name":
    case "board":
    case "board_name":
    case "roll_number":
    case "roll_no":
    case "registration_number":
    case "reg_no":
    case "enrollment_number":
    case "stream":
    case "course":
    case "branch":
    case "passing_year":
    case "examination_year":
    case "total_marks":
    case "obtained_marks":
    case "percentage":
    case "cgpa":
    case "grade":
    case "result":
      return "ACADEMIC_DOCUMENT_SPECIFIC";

    case "category":
    case "caste":
    case "domicile":
    case "annual_income":
    case "annual_family_income":
    case "monthly_income":
      return "CATEGORY_ELIGIBILITY";

    case "certificate_number":
    case "issuing_authority":
    case "issue_date":
    case "expiry_date":
    case "valid_upto":
    default:
      return "CERTIFICATE_SPECIFIC";
  }
}

export function humanizeFieldKey(key: string): string {
  switch (key) {
    case "full_name":
    case "name":
    case "student_name":
    case "applicant_name":
    case "intern_name":
      return "Full Name";
    case "date_of_birth":
    case "dob":
      return "Date of Birth";
    case "place_of_birth":
      return "Place of Birth";
    case "father_name":
    case "fathers_name":
      return "Father's Name";
    case "mother_name":
    case "mothers_name":
      return "Mother's Name";
    case "guardian_name":
      return "Guardian's Name";
    case "gender":
      return "Gender";
    case "nationality":
      return "Nationality";
    case "address":
      return "Residential Address";
    case "city":
      return "City / Town";
    case "district":
      return "District";
    case "state":
      return "State";
    case "pincode":
    case "pin_code":
      return "PIN Code";
    case "roll_number":
    case "roll_no":
      return "Roll Number";
    case "registration_number":
    case "reg_no":
      return "Registration Number";
    case "enrollment_number":
      return "Enrollment Number";
    case "school_name":
    case "institution_name":
      return "School / Institution Name";
    case "board":
    case "board_name":
      return "Education Board";
    case "passing_year":
    case "year":
      return "Passing Year";
    case "stream":
      return "Academic Stream";
    case "course":
      return "Course / Degree";
    case "percentage":
      return "Percentage";
    case "cgpa":
      return "CGPA";
    case "total_marks":
      return "Total Marks";
    case "obtained_marks":
      return "Obtained Marks";
    case "grade":
      return "Grade";
    case "result":
      return "Result Status";
    case "annual_income":
    case "annual_family_income":
      return "Annual Family Income";
    case "category":
      return "Category / Reservation";
    case "domicile":
      return "Domicile State";
    case "aadhaar_number":
      return "Aadhaar Number";
    case "pan_number":
      return "PAN Number";
    default:
      return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Extracts and canonicalizes flat fields map from a document's extracted_data.
 */
function extractCanonicalFields(doc: DocumentComparisonInput): Record<string, string> {
  const map: Record<string, string> = {};
  const raw = doc.extracted_data || {};

  const fieldsObj = (raw.fields as Record<string, unknown>) || raw;

  for (const [k, v] of Object.entries(fieldsObj)) {
    if (!v) continue;
    let stringVal = "";
    if (typeof v === "object" && v !== null && "value" in v) {
      stringVal = String((v as { value: unknown }).value || "").trim();
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      stringVal = String(v).trim();
    }

    if (stringVal) {
      const canonicalKey = k.toLowerCase().replace(/[\s\-]/g, "_");
      map[canonicalKey] = stringVal;
    }
  }

  // Nested structures handling
  const subObjects = ["student", "academic", "financial", "person", "identity", "family", "personal"];
  for (const sub of subObjects) {
    if (raw[sub] && typeof raw[sub] === "object") {
      for (const [k, v] of Object.entries(raw[sub] as Record<string, unknown>)) {
        const val = typeof v === "object" && v !== null && "value" in v ? (v as { value: unknown }).value : v;
        if (val) {
          const canonicalKey = k.toLowerCase().replace(/[\s\-]/g, "_");
          map[canonicalKey] = String(val).trim();
        }
      }
    }
  }

  // Canonicalize aliases
  if (map.name && !map.full_name) map.full_name = map.name;
  if (map.student_name && !map.full_name) map.full_name = map.student_name;
  if (map.applicant_name && !map.full_name) map.full_name = map.applicant_name;
  if (map.intern_name && !map.full_name) map.full_name = map.intern_name;
  if (map.dob && !map.date_of_birth) map.date_of_birth = map.dob;
  if (map.fathers_name && !map.father_name) map.father_name = map.fathers_name;
  if (map.mothers_name && !map.mother_name) map.mother_name = map.mothers_name;
  if (map.pin_code && !map.pincode) map.pincode = map.pin_code;
  if (map.roll_no && !map.roll_number) map.roll_number = map.roll_no;
  if (map.reg_no && !map.registration_number) map.registration_number = map.reg_no;
  if (map.board_name && !map.board) map.board = map.board_name;
  if (map.annual_family_income && !map.annual_income) map.annual_income = map.annual_family_income;

  return map;
}

/**
 * Evaluates multi-document consistency across all extracted user records.
 * Supports 2, 3, 4, 5+ documents dynamically.
 */
export function performMultiDocumentConsistencyAudit(
  documents: DocumentComparisonInput[]
): MultiDocumentAuditResult {
  const validDocs = documents.filter((d) => d.extracted_data && Object.keys(d.extracted_data).length > 0);
  const docColumns = validDocs.map((d) => ({
    document_id: d.id,
    document_name: d.file_name,
    document_type: d.document_type,
  }));

  if (validDocs.length < 2) {
    return {
      overall_status: "all_consistent",
      identity_consistency: { total_fields: 0, consistent_fields: 0, status: "consistent" },
      academic_consistency: { total_fields: 0, consistent_fields: 0, status: "consistent" },
      matrix: { columns: docColumns, rows: [] },
      conflicts: [],
      total_documents_compared: validDocs.length,
      audited_at: new Date().toISOString(),
    };
  }

  // 1. Extract all canonical fields per document
  const docFieldsMap: Record<string, Record<string, string>> = {};
  const allFieldKeys = new Set<string>();

  for (const doc of validDocs) {
    const fields = extractCanonicalFields(doc);
    docFieldsMap[doc.id] = fields;
    for (const k of Object.keys(fields)) {
      allFieldKeys.add(k);
    }
  }

  const matrixRows: MatrixRow[] = [];
  const conflicts: MultiDocumentConflict[] = [];

  let identityTotal = 0;
  let identityConsistent = 0;
  let academicTotal = 0;
  let academicConsistent = 0;

  // 2. Iterate through all distinct fields present across the document set
  for (const fieldKey of Array.from(allFieldKeys)) {
    const category = getFieldCategory(fieldKey);
    const fieldLabel = humanizeFieldKey(fieldKey);

    // Collect values from all documents that contain this field
    const docEntries: DocumentValueEntry[] = [];
    for (const doc of validDocs) {
      const val = docFieldsMap[doc.id]?.[fieldKey];
      if (val !== undefined && val !== null && val.trim() !== "") {
        docEntries.push({
          document_id: doc.id,
          document_name: doc.file_name,
          document_type: doc.document_type,
          value: val.trim(),
        });
      }
    }

    // Only audit fields that appear in at least 2 documents
    if (docEntries.length < 2) {
      continue;
    }

    // 3. Category-Specific Multi-Value Comparison Logic
    let rowConsensus: HealthSeverity = "consistent";
    let explanation = "Information is consistent across all documents.";
    let recommendation = "No action required.";

    // ====================================================
    // A. IDENTITY_STABLE (Name, DOB, Parents, Gender)
    // ====================================================
    if (category === "IDENTITY_STABLE") {
      identityTotal++;

      if (fieldKey === "full_name" || fieldKey === "father_name" || fieldKey === "mother_name" || fieldKey === "guardian_name") {
        let hasMismatch = false;
        let hasPossible = false;
        let mismatchDetails = "";

        for (let i = 0; i < docEntries.length; i++) {
          for (let j = i + 1; j < docEntries.length; j++) {
            const comp = compareNames(docEntries[i].value, docEntries[j].value);
            if (comp.status === "mismatch") {
              hasMismatch = true;
              mismatchDetails = `${docEntries[i].document_name} ('${docEntries[i].value}') vs ${docEntries[j].document_name} ('${docEntries[j].value}')`;
              break;
            } else if (comp.status === "possible_match") {
              hasPossible = true;
              mismatchDetails = `${docEntries[i].document_name} ('${docEntries[i].value}') vs ${docEntries[j].document_name} ('${docEntries[j].value}')`;
            }
          }
          if (hasMismatch) break;
        }

        if (hasMismatch) {
          rowConsensus = "important_mismatch";
          explanation = `Significant discrepancy detected: ${mismatchDetails}.`;
          recommendation = `Verify the exact spelling of ${fieldLabel} required by the official application portal.`;
        } else if (hasPossible) {
          rowConsensus = "possible_difference";
          explanation = `Minor variation or abbreviation detected: ${mismatchDetails}.`;
          recommendation = `Ensure you use the full name format matching your official Class 10 certificate.`;
          identityConsistent++;
        } else {
          rowConsensus = "consistent";
          identityConsistent++;
        }
      } else if (fieldKey === "date_of_birth" || fieldKey === "dob") {
        let hasMismatch = false;
        let mismatchDetails = "";

        for (let i = 0; i < docEntries.length; i++) {
          for (let j = i + 1; j < docEntries.length; j++) {
            const comp = compareDates(docEntries[i].value, docEntries[j].value);
            if (comp.status === "mismatch") {
              hasMismatch = true;
              mismatchDetails = `${docEntries[i].document_name} ('${docEntries[i].value}') vs ${docEntries[j].document_name} ('${docEntries[j].value}')`;
              break;
            }
          }
          if (hasMismatch) break;
        }

        if (hasMismatch) {
          rowConsensus = "important_mismatch";
          explanation = `Conflict in Date of Birth: ${mismatchDetails}.`;
          recommendation = "Application portals strictly validate DOB with Government ID. Ensure you use the official DOB on your Class 10 Certificate.";
        } else {
          rowConsensus = "consistent";
          identityConsistent++;
        }
      } else {
        // Gender, Nationality, Aadhaar, PAN
        let hasMismatch = false;
        for (let i = 0; i < docEntries.length; i++) {
          for (let j = i + 1; j < docEntries.length; j++) {
            if (normalizeText(docEntries[i].value) !== normalizeText(docEntries[j].value)) {
              hasMismatch = true;
              break;
            }
          }
          if (hasMismatch) break;
        }

        if (hasMismatch) {
          rowConsensus = "important_mismatch";
          explanation = `Conflicting ${fieldLabel} values across documents.`;
          recommendation = `Ensure the correct ${fieldLabel} is selected before submission.`;
        } else {
          rowConsensus = "consistent";
          identityConsistent++;
        }
      }
    }

    // ====================================================
    // B. ADDRESS_VARIABLE (Address, City, State, Pincode)
    // ====================================================
    else if (category === "ADDRESS_VARIABLE") {
      let hasDifference = false;
      for (let i = 0; i < docEntries.length; i++) {
        for (let j = i + 1; j < docEntries.length; j++) {
          if (normalizeText(docEntries[i].value) !== normalizeText(docEntries[j].value)) {
            hasDifference = true;
            break;
          }
        }
        if (hasDifference) break;
      }

      if (hasDifference) {
        rowConsensus = "possible_difference";
        explanation = `Different address details found across documents (this is normal if residence changed).`;
        recommendation = "Use your current permanent or communication address as required by the application.";
      } else {
        rowConsensus = "consistent";
      }
    }

    // ====================================================
    // C. ACADEMIC_DOCUMENT_SPECIFIC (Roll No, Marks, Board)
    // ====================================================
    else if (category === "ACADEMIC_DOCUMENT_SPECIFIC") {
      academicTotal++;

      // Check if documents are of the SAME level/type (e.g. 10th vs 10th) or DIFFERENT (10th vs 12th)
      const docTypes = new Set(docEntries.map((e) => e.document_type));

      if (docTypes.size > 1 && (fieldKey === "roll_number" || fieldKey === "passing_year" || fieldKey === "percentage" || fieldKey === "total_marks" || fieldKey === "obtained_marks" || fieldKey === "school_name" || fieldKey === "stream" || fieldKey === "course")) {
        // Expected differences across distinct exam levels (e.g. Class 10 vs Class 12) -> GREEN / CONSISTENT
        rowConsensus = "consistent";
        explanation = `Different values are expected across distinct academic levels (e.g. Class 10 vs Class 12).`;
        recommendation = "No action required.";
        academicConsistent++;
      } else {
        // Same document type or Board comparison (e.g. CBSE vs CBSE)
        let hasMismatch = false;
        for (let i = 0; i < docEntries.length; i++) {
          for (let j = i + 1; j < docEntries.length; j++) {
            if (fieldKey === "percentage" || fieldKey === "cgpa" || fieldKey === "total_marks" || fieldKey === "obtained_marks") {
              const numComp = compareNumerics(docEntries[i].value, docEntries[j].value);
              if (numComp.status === "mismatch") {
                hasMismatch = true;
                break;
              }
            } else if (normalizeText(docEntries[i].value) !== normalizeText(docEntries[j].value)) {
              hasMismatch = true;
              break;
            }
          }
          if (hasMismatch) break;
        }

        if (hasMismatch) {
          rowConsensus = "important_mismatch";
          explanation = `Conflicting ${fieldLabel} values found across documents of the same category.`;
          recommendation = `Verify your marks and registration number with your official mark sheet.`;
        } else {
          rowConsensus = "consistent";
          academicConsistent++;
        }
      }
    }

    // ====================================================
    // D. CATEGORY & CERTIFICATE SPECIFIC
    // ====================================================
    else {
      let hasMismatch = false;
      for (let i = 0; i < docEntries.length; i++) {
        for (let j = i + 1; j < docEntries.length; j++) {
          if (normalizeText(docEntries[i].value) !== normalizeText(docEntries[j].value)) {
            hasMismatch = true;
            break;
          }
        }
        if (hasMismatch) break;
      }

      if (hasMismatch) {
        rowConsensus = "possible_difference";
        explanation = `Different ${fieldLabel} values found across certificates.`;
        recommendation = "Ensure you upload the most recent and valid certificate.";
      } else {
        rowConsensus = "consistent";
      }
    }

    // 4. Build Matrix Row Cells for all valid documents
    const cells: Record<string, MatrixCell> = {};
    for (const doc of validDocs) {
      const val = docFieldsMap[doc.id]?.[fieldKey];
      if (val !== undefined && val !== null && val.trim() !== "") {
        let cellStatus: "match" | "possible_variation" | "mismatch" = "match";
        if (rowConsensus === "important_mismatch") cellStatus = "mismatch";
        else if (rowConsensus === "possible_difference") cellStatus = "possible_variation";

        cells[doc.id] = {
          status: cellStatus,
          value: val.trim(),
          document_id: doc.id,
          document_name: doc.file_name,
        };
      } else {
        cells[doc.id] = {
          status: "not_present",
          value: "—",
          document_id: doc.id,
          document_name: doc.file_name,
        };
      }
    }

    matrixRows.push({
      field_key: fieldKey,
      field_label: fieldLabel,
      category,
      cells,
      consensus_status: rowConsensus,
    });

    // Record conflict if not fully consistent
    if (rowConsensus !== "consistent") {
      conflicts.push({
        id: `conflict-${fieldKey}`,
        field_key: fieldKey,
        field_label: fieldLabel,
        category,
        severity: rowConsensus,
        documents_affected: docEntries.length,
        document_values: docEntries,
        explanation,
        recommendation,
        is_resolved: false,
      });
    }
  }

  // 5. Calculate Overall Health State
  const hasCritical = conflicts.some((c) => c.severity === "important_mismatch");
  const hasPossible = conflicts.some((c) => c.severity === "possible_difference");

  let overallStatus: "all_consistent" | "needs_attention" | "has_critical_mismatches" = "all_consistent";
  if (hasCritical) {
    overallStatus = "has_critical_mismatches";
  } else if (hasPossible) {
    overallStatus = "needs_attention";
  }

  return {
    overall_status: overallStatus,
    identity_consistency: {
      total_fields: identityTotal,
      consistent_fields: identityConsistent,
      status: identityConsistent === identityTotal ? "consistent" : "has_issues",
    },
    academic_consistency: {
      total_fields: academicTotal,
      consistent_fields: academicConsistent,
      status: academicConsistent === academicTotal ? "consistent" : "has_issues",
    },
    matrix: {
      columns: docColumns,
      rows: matrixRows,
    },
    conflicts,
    total_documents_compared: validDocs.length,
    audited_at: new Date().toISOString(),
  };
}

// Backward-compatibility aliases
export const performConsistencyAudit = performMultiDocumentConsistencyAudit;
export type ConsistencyCheckSummary = MultiDocumentAuditResult;
export type ConsistencyIssue = MultiDocumentConflict;
