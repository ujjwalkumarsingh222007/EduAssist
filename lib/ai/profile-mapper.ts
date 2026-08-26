import {
  Profile,
  ProfileData,
  MarksheetTable,
  MarksheetSubject,
  ExperienceRecord,
  VerifiedCertificate,
  CustomFieldEntry,
  CustomSectionEntry,
} from "../types/profile";
import { DocumentTypeCategory, EducationLevel } from "./classifier";
import { normalizeDateToISO, normalizeBoardName } from "./validator";
import { SubjectEntry } from "./schemas";

export interface MapProfileResult {
  updatedProfilePayload: {
    user_id: string;
    full_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    profile_data: ProfileData;
    updated_at: string;
  };
  confirmedFieldsCount: number;
}

function humanizeKey(k: string): string {
  return k
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .replace(/Dob/i, "Date of Birth")
    .replace(/Id/i, "ID")
    .replace(/Pan/i, "PAN")
    .replace(/Cgpa/i, "CGPA")
    .replace(/Sgpa/i, "SGPA")
    .replace(/Cbse/i, "CBSE")
    .replace(/Icse/i, "ICSE");
}

/**
 * Maps confirmed document fields strictly within their semantic boundaries with ZERO data loss.
 */
export function mapDocumentToProfile(
  userId: string,
  existingProfile: Profile | null,
  documentType: DocumentTypeCategory,
  documentId: string,
  documentFileName: string,
  confirmedFields: Record<string, string>,
  subjects: SubjectEntry[] = [],
  customFields: Record<string, { value: unknown; raw_label?: string; confidence?: number; is_sensitive?: boolean }> = {}
): MapProfileResult {
  const existingData: ProfileData = existingProfile?.profile_data || {};
  const mergedData: ProfileData = JSON.parse(JSON.stringify(existingData));

  // Initialize sub-objects if missing
  if (!mergedData.personal) mergedData.personal = {};
  if (!mergedData.identity) mergedData.identity = {};
  if (!mergedData.address) mergedData.address = { permanent: {}, current: {} };
  if (!mergedData.family) mergedData.family = {};
  if (!mergedData.eligibility) mergedData.eligibility = {};
  if (!mergedData.confirmed_fields) mergedData.confirmed_fields = {};
  if (!mergedData.academic_results) mergedData.academic_results = [];
  if (!mergedData.experience) mergedData.experience = [];
  if (!mergedData.certificates) mergedData.certificates = [];
  if (!mergedData.custom_fields) mergedData.custom_fields = {};
  if (!mergedData.custom_sections) mergedData.custom_sections = [];

  const timestamp = new Date().toISOString();

  // Helper to record confirmed field provenance
  const recordField = (fieldKey: string, label: string, value: unknown, isSensitive = false) => {
    if (value === undefined || value === null || String(value).trim() === "") return;
    const cleanVal = String(value).trim();
    mergedData.confirmed_fields![fieldKey] = {
      label,
      value: cleanVal,
      source_document: documentFileName,
      source_document_id: documentId,
      confirmed_at: timestamp,
      is_sensitive: isSensitive,
      field_status: "Verified",
    };
  };

  // 1. Map Core Personal Details (if present on document)
  const rawFullName = confirmedFields.full_name || confirmedFields.student_name || confirmedFields.applicant_name || confirmedFields.intern_name || "";
  const rawFirstName = confirmedFields.first_name || "";
  const rawMiddleName = confirmedFields.middle_name || "";
  const rawLastName = confirmedFields.last_name || "";
  const rawDob = confirmedFields.date_of_birth || confirmedFields.dob || "";
  const rawGender = confirmedFields.gender || "";
  const rawFather = confirmedFields.father_name || confirmedFields.fathers_name || "";
  const rawMother = confirmedFields.mother_name || confirmedFields.mothers_name || "";

  if (rawFullName) {
    mergedData.personal.full_name = rawFullName;
    recordField("full_name", "Full Name", rawFullName);
  }
  if (rawFirstName) mergedData.personal.first_name = rawFirstName;
  if (rawMiddleName) mergedData.personal.middle_name = rawMiddleName;
  if (rawLastName) mergedData.personal.last_name = rawLastName;

  if (rawDob) {
    const isoDob = normalizeDateToISO(rawDob);
    if (isoDob) {
      mergedData.personal.date_of_birth = isoDob;
      recordField("date_of_birth", "Date of Birth", isoDob);
    }
  }
  if (rawGender) {
    mergedData.personal.gender = rawGender;
    recordField("gender", "Gender", rawGender);
  }
  if (rawFather) {
    mergedData.family.father_name = rawFather;
    recordField("father_name", "Father's Full Name", rawFather);
  }
  if (rawMother) {
    mergedData.family.mother_name = rawMother;
    recordField("mother_name", "Mother's Full Name", rawMother);
  }

  // Helper to package custom fields dictionary for a section
  const sectionCustomFields: Record<string, CustomFieldEntry> = {};
  for (const [k, v] of Object.entries(customFields)) {
    if (v && v.value !== null && v.value !== undefined && String(v.value).trim() !== "") {
      const entry: CustomFieldEntry = {
        key: k,
        label: v.raw_label || humanizeKey(k),
        value: v.value as string | number | boolean,
        source_document_id: documentId,
        source_document_type: documentType,
        confirmed_at: timestamp,
        confidence: v.confidence ?? 0.9,
        verified: true,
        is_sensitive: v.is_sensitive,
      };
      sectionCustomFields[k] = entry;
      recordField(k, entry.label, entry.value, entry.is_sensitive);
    }
  }

  // 2. Strict Semantic Boundaries by Document Category

  // ==========================================
  // CATEGORY A: CLASS 10 MARKSHEET
  // ==========================================
  if (documentType === "CLASS_10_MARKSHEET") {
    const board = normalizeBoardName(confirmedFields.board || confirmedFields.board_name || "");
    const schoolName = confirmedFields.school_name || confirmedFields.institution_name || "";
    const schoolCode = confirmedFields.school_code || "";
    const centerNo = confirmedFields.center_number || "";
    const rollNumber = confirmedFields.roll_number || confirmedFields.roll_no || "";
    const regNumber = confirmedFields.registration_number || confirmedFields.reg_no || "";
    const enrollNumber = confirmedFields.enrollment_number || confirmedFields.enroll_no || "";
    const certNumber = confirmedFields.certificate_number || "";
    const passingYear = confirmedFields.passing_year || confirmedFields.year || "";
    const examYear = confirmedFields.examination_year || passingYear;
    const percentage = confirmedFields.percentage || "";
    const cgpa = confirmedFields.cgpa || "";
    const totalMarks = confirmedFields.total_marks || "";
    const obtainedMarks = confirmedFields.obtained_marks || confirmedFields.total_marks_obtained || "";
    const result = confirmedFields.result || "PASS";
    const division = confirmedFields.division || "";
    const grade = confirmedFields.grade || "";

    const formattedSubjects: MarksheetSubject[] = subjects.map((s) => ({
      subject_code: s.code || "",
      subject_name: s.name,
      marks_obtained: s.marks_obtained,
      maximum_marks: s.max_marks,
      grade: s.grade,
      theory_marks: s.theory_marks,
      practical_marks: s.practical_marks,
      credits: s.credits,
      pass_fail: (s.status as "PASS" | "FAIL") || "PASS",
    }));

    const class10Table: MarksheetTable = {
      id: documentId,
      source_document_name: documentFileName,
      source_document_id: documentId,
      examination_name: "Class 10 / Secondary School Examination",
      board_name: board,
      school_name: schoolName,
      school_code: schoolCode,
      center_number: centerNo,
      institution_name: schoolName,
      roll_number: rollNumber,
      registration_number: regNumber,
      enrollment_number: enrollNumber,
      certificate_number: certNumber,
      passing_year: passingYear,
      examination_year: examYear,
      year: passingYear,
      percentage: percentage ? `${percentage}%` : "",
      cgpa,
      total_marks: totalMarks,
      maximum_marks: totalMarks,
      obtained_marks: obtainedMarks,
      result,
      division,
      grade,
      first_name: rawFirstName,
      middle_name: rawMiddleName,
      last_name: rawLastName,
      dob: normalizeDateToISO(rawDob) || rawDob,
      subjects: formattedSubjects,
      custom_fields: sectionCustomFields,
    };

    mergedData.secondary_10th = class10Table;

    // Track provenance
    if (board) recordField("secondary_10th_board", "Class 10 Board", board);
    if (schoolName) recordField("secondary_10th_school", "Class 10 School Name", schoolName);
    if (rollNumber) recordField("secondary_10th_roll", "Class 10 Roll Number", rollNumber);
    if (regNumber) recordField("secondary_10th_registration_number", "Class 10 Registration Number", regNumber);
    if (enrollNumber) recordField("secondary_10th_enrollment_number", "Class 10 Enrollment Number", enrollNumber);
    if (percentage) recordField("secondary_10th_percentage", "Class 10 Percentage", `${percentage}%`);
    if (totalMarks) recordField("secondary_10th_total_marks", "Class 10 Total Marks", totalMarks);
    if (obtainedMarks) recordField("secondary_10th_obtained_marks", "Class 10 Obtained Marks", obtainedMarks);
    if (passingYear) recordField("secondary_10th_year", "Class 10 Passing Year", passingYear);

    // Filter and update academic_results array
    mergedData.academic_results = (mergedData.academic_results || []).filter((r) => r.id !== documentId && !r.examination_name?.includes("10"));
    mergedData.academic_results.unshift(class10Table);

    // CRITICAL: DO NOT TOUCH mergedData.education (college)
  }

  // ==========================================
  // CATEGORY B: CLASS 12 MARKSHEET
  // ==========================================
  else if (documentType === "CLASS_12_MARKSHEET") {
    const board = normalizeBoardName(confirmedFields.board || confirmedFields.board_name || "");
    const schoolName = confirmedFields.school_name || confirmedFields.institution_name || "";
    const schoolCode = confirmedFields.school_code || "";
    const centerNo = confirmedFields.center_number || "";
    const stream = confirmedFields.stream || confirmedFields.branch_stream || "";
    const rollNumber = confirmedFields.roll_number || confirmedFields.roll_no || "";
    const regNumber = confirmedFields.registration_number || confirmedFields.reg_no || "";
    const enrollNumber = confirmedFields.enrollment_number || confirmedFields.enroll_no || "";
    const certNumber = confirmedFields.certificate_number || "";
    const passingYear = confirmedFields.passing_year || confirmedFields.year || "";
    const examYear = confirmedFields.examination_year || passingYear;
    const percentage = confirmedFields.percentage || "";
    const cgpa = confirmedFields.cgpa || "";
    const totalMarks = confirmedFields.total_marks || "";
    const obtainedMarks = confirmedFields.obtained_marks || confirmedFields.total_marks_obtained || "";
    const result = confirmedFields.result || "PASS";
    const division = confirmedFields.division || "";
    const grade = confirmedFields.grade || "";

    const formattedSubjects: MarksheetSubject[] = subjects.map((s) => ({
      subject_code: s.code || "",
      subject_name: s.name,
      marks_obtained: s.marks_obtained,
      maximum_marks: s.max_marks,
      grade: s.grade,
      theory_marks: s.theory_marks,
      practical_marks: s.practical_marks,
      credits: s.credits,
      pass_fail: (s.status as "PASS" | "FAIL") || "PASS",
    }));

    const class12Table: MarksheetTable = {
      id: documentId,
      source_document_name: documentFileName,
      source_document_id: documentId,
      examination_name: "Class 12 / Senior Secondary Examination",
      board_name: board,
      school_name: schoolName,
      school_code: schoolCode,
      center_number: centerNo,
      institution_name: schoolName,
      stream,
      roll_number: rollNumber,
      registration_number: regNumber,
      enrollment_number: enrollNumber,
      certificate_number: certNumber,
      passing_year: passingYear,
      examination_year: examYear,
      year: passingYear,
      percentage: percentage ? `${percentage}%` : "",
      cgpa,
      total_marks: totalMarks,
      maximum_marks: totalMarks,
      obtained_marks: obtainedMarks,
      result,
      division,
      grade,
      first_name: rawFirstName,
      middle_name: rawMiddleName,
      last_name: rawLastName,
      dob: normalizeDateToISO(rawDob) || rawDob,
      subjects: formattedSubjects,
      custom_fields: sectionCustomFields,
    };

    mergedData.senior_secondary_12th = class12Table;

    // Track provenance
    if (board) recordField("senior_secondary_12th_board", "Class 12 Board", board);
    if (schoolName) recordField("senior_secondary_12th_school", "Class 12 School Name", schoolName);
    if (stream) recordField("senior_secondary_12th_stream", "Class 12 Stream", stream);
    if (rollNumber) recordField("senior_secondary_12th_roll", "Class 12 Roll Number", rollNumber);
    if (regNumber) recordField("senior_secondary_12th_registration_number", "Class 12 Registration Number", regNumber);
    if (enrollNumber) recordField("senior_secondary_12th_enrollment_number", "Class 12 Enrollment Number", enrollNumber);
    if (percentage) recordField("senior_secondary_12th_percentage", "Class 12 Percentage", `${percentage}%`);
    if (totalMarks) recordField("senior_secondary_12th_total_marks", "Class 12 Total Marks", totalMarks);
    if (obtainedMarks) recordField("senior_secondary_12th_obtained_marks", "Class 12 Obtained Marks", obtainedMarks);
    if (passingYear) recordField("senior_secondary_12th_year", "Class 12 Passing Year", passingYear);

    // Filter and update academic_results array
    mergedData.academic_results = (mergedData.academic_results || []).filter((r) => r.id !== documentId && !r.examination_name?.includes("12"));
    mergedData.academic_results.unshift(class12Table);

    // CRITICAL: DO NOT TOUCH mergedData.education (college)
  }

  // ==========================================
  // CATEGORY C: COLLEGE / UG / DIPLOMA MARKSHEET
  // ==========================================
  else if (documentType === "UG_MARKSHEET" || documentType === "PG_MARKSHEET" || documentType === "DIPLOMA_MARKSHEET" || documentType === "TRANSCRIPT") {
    if (!mergedData.education) mergedData.education = {};

    const univName = confirmedFields.university_name || confirmedFields.board_name || "";
    const collegeName = confirmedFields.college_name || confirmedFields.institution_name || "";
    const degree = confirmedFields.degree || confirmedFields.degree_name || "";
    const branch = confirmedFields.branch || confirmedFields.branch_or_major || confirmedFields.specialization || "";
    const semester = confirmedFields.semester || confirmedFields.current_semester || "";
    const cgpa = confirmedFields.cgpa || confirmedFields.sgpa || "";
    const percentage = confirmedFields.percentage || "";
    const enrollNo = confirmedFields.enrollment_number || confirmedFields.roll_number || "";
    const regNo = confirmedFields.registration_number || "";

    if (univName) mergedData.education.university_name = univName;
    if (collegeName) mergedData.education.institution_name = collegeName;
    if (degree) mergedData.education.degree = degree;
    if (branch) mergedData.education.branch = branch;
    if (semester) mergedData.education.current_semester = semester;
    if (cgpa) mergedData.education.cgpa = String(cgpa);
    if (percentage) mergedData.education.percentage = `${percentage}%`;
    if (enrollNo) mergedData.education.enrollment_number = enrollNo;
    if (regNo) mergedData.education.registration_number = regNo;

    if (collegeName || univName) recordField("college_institution", "College / University", collegeName || univName);
    if (degree) recordField("college_degree", "Degree / Program", degree);
    if (branch) recordField("college_branch", "Branch / Specialization", branch);
    if (cgpa) recordField("college_cgpa", "Cumulative CGPA", String(cgpa));
  }

  // ==========================================
  // CATEGORY D: INTERNSHIP CERTIFICATE
  // ==========================================
  else if (documentType === "INTERNSHIP_CERTIFICATE") {
    const orgName = confirmedFields.organization_name || confirmedFields.company_name || "";
    const roleTitle = confirmedFields.role_title || confirmedFields.internship_role || "Intern";
    const supervisor = confirmedFields.supervisor_name || "";
    const projectName = confirmedFields.project_name || "";
    const startDate = normalizeDateToISO(confirmedFields.start_date) || confirmedFields.start_date || "";
    const endDate = normalizeDateToISO(confirmedFields.end_date) || confirmedFields.end_date || "";
    const location = confirmedFields.location || "";
    const certId = confirmedFields.certificate_id || confirmedFields.credential_id || "";
    const stipend = confirmedFields.stipend || "";
    const description = confirmedFields.description || "";

    const internshipEntry: ExperienceRecord = {
      id: documentId,
      organization: orgName,
      role: roleTitle,
      employment_type: "Internship",
      start_date: startDate,
      end_date: endDate,
      location,
      supervisor,
      stipend,
      description,
      proof_document: documentFileName,
      certificate_url: certId,
    };

    mergedData.experience = (mergedData.experience || []).filter((e) => e.id !== documentId);
    mergedData.experience.unshift(internshipEntry);

    if (orgName) recordField("internship_organization", "Internship Organization", orgName);
    if (roleTitle) recordField("internship_role", "Internship Role", roleTitle);
    if (certId) recordField("internship_certificate_id", "Internship Certificate ID", certId);
    if (supervisor) recordField("internship_supervisor", "Internship Supervisor", supervisor);
  }

  // ==========================================
  // CATEGORY E: INCOME CERTIFICATE
  // ==========================================
  else if (documentType === "INCOME_CERTIFICATE") {
    const annualIncome = confirmedFields.annual_family_income || confirmedFields.annual_income || confirmedFields.family_income || "";
    const monthlyIncome = confirmedFields.monthly_income || "";
    const certNumber = confirmedFields.certificate_number || confirmedFields.cert_no || "";
    const issueDate = normalizeDateToISO(confirmedFields.issue_date) || confirmedFields.issue_date || "";
    const validUpto = normalizeDateToISO(confirmedFields.valid_upto) || confirmedFields.valid_upto || "";
    const authority = confirmedFields.issuing_authority || confirmedFields.issuer || "";
    const state = confirmedFields.state || "";
    const district = confirmedFields.district || "";

    if (annualIncome) mergedData.eligibility.annual_income = String(annualIncome);
    if (monthlyIncome) mergedData.eligibility.monthly_income = String(monthlyIncome);
    if (certNumber) mergedData.eligibility.income_certificate_number = certNumber;
    if (issueDate) mergedData.eligibility.income_certificate_issue_date = issueDate;
    if (validUpto) mergedData.eligibility.income_certificate_expiry_date = validUpto;
    if (authority) mergedData.eligibility.issuing_authority = authority;
    if (state && !mergedData.eligibility.domicile_state) mergedData.eligibility.domicile_state = state;
    if (district && !mergedData.eligibility.domicile_district) mergedData.eligibility.domicile_district = district;

    if (annualIncome) recordField("annual_income", "Annual Family Income", `₹${annualIncome}`);
    if (certNumber) recordField("income_certificate_number", "Income Certificate Number", certNumber);
    if (authority) recordField("income_issuing_authority", "Income Issuing Authority", authority);
  }

  // ==========================================
  // CATEGORY F: IDENTITY DOCUMENT (AADHAAR / PAN)
  // ==========================================
  else if (documentType === "IDENTITY_DOCUMENT") {
    const idNumber = confirmedFields.id_number || confirmedFields.aadhaar_number || confirmedFields.pan_number || "";
    const address = confirmedFields.address_line || confirmedFields.address || "";
    const city = confirmedFields.city || confirmedFields.district || "";
    const state = confirmedFields.state || "";
    const pincode = confirmedFields.pincode || confirmedFields.pin_code || "";

    if (idNumber) {
      if (idNumber.replace(/\s+/g, "").length === 12 && /^\d+$/.test(idNumber.replace(/\s+/g, ""))) {
        mergedData.identity.aadhaar_number = idNumber;
        recordField("aadhaar_number", "Aadhaar Number", idNumber, true);
      } else if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(idNumber.trim())) {
        mergedData.identity.pan_number = idNumber.toUpperCase();
        recordField("pan_number", "PAN Card Number", idNumber.toUpperCase(), true);
      } else {
        mergedData.identity.other_government_id = idNumber;
        recordField("other_government_id", "Government ID Number", idNumber, true);
      }
    }

    if (address) {
      mergedData.address.permanent = {
        ...(mergedData.address.permanent || {}),
        street: address,
        city: city || mergedData.address.permanent?.city,
        state: state || mergedData.address.permanent?.state,
        pincode: pincode || mergedData.address.permanent?.pincode,
      };
      if (pincode) mergedData.personal.pincode = pincode;
      recordField("address", "Permanent Address", address);
    }
  }

  // ==========================================
  // CATEGORY G: DYNAMIC CUSTOM SECTIONS (Scholarships, Domicile, Other)
  // ==========================================
  else {
    // For non-standard documents, automatically create a structured CustomSectionEntry
    const customSectionFields: CustomFieldEntry[] = [];
    for (const [k, v] of Object.entries(confirmedFields)) {
      if (v && String(v).trim() !== "") {
        const fieldEntry: CustomFieldEntry = {
          key: k,
          label: humanizeKey(k),
          value: v,
          source_document_id: documentId,
          source_document_type: documentType,
          confidence: 0.9,
          confirmed_at: timestamp,
          verified: true,
        };
        customSectionFields.push(fieldEntry);
        recordField(k, fieldEntry.label, v);
      }
    }

    if (customSectionFields.length > 0) {
      const sectionTitle = documentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const sectionId = documentType.toLowerCase();

      mergedData.custom_sections = (mergedData.custom_sections || []).filter((s) => s.section_id !== sectionId);
      mergedData.custom_sections.push({
        section_id: sectionId,
        title: sectionTitle,
        category: documentType,
        fields: customSectionFields,
        metadata: {
          source_document_name: documentFileName,
          confirmed_at: timestamp,
        },
      });
    }
  }

  // Update source metadata
  const existingSources = mergedData.meta?.source_documents || [];
  mergedData.meta = {
    ...(mergedData.meta || {}),
    source_documents: [
      { id: documentId, name: documentFileName, type: documentType, confirmed_at: timestamp },
      ...existingSources.filter((s) => s.id !== documentId),
    ],
    last_confirmed_at: timestamp,
  };

  const finalFullName = rawFullName || existingProfile?.full_name || "Student";
  const finalDob = normalizeDateToISO(rawDob) || existingProfile?.date_of_birth || null;
  const finalGender = rawGender || existingProfile?.gender || null;
  const finalPhone = confirmedFields.phone || existingProfile?.phone || null;
  const finalAddress = confirmedFields.address || existingProfile?.address || null;
  const finalCity = confirmedFields.city || existingProfile?.city || null;
  const finalState = confirmedFields.state || existingProfile?.state || null;
  const finalCountry = confirmedFields.country || existingProfile?.country || "India";

  return {
    updatedProfilePayload: {
      user_id: userId,
      full_name: finalFullName,
      date_of_birth: finalDob,
      gender: finalGender,
      phone: finalPhone,
      address: finalAddress,
      city: finalCity,
      state: finalState,
      country: finalCountry,
      profile_data: mergedData,
      updated_at: timestamp,
    },
    confirmedFieldsCount: Object.keys(mergedData.confirmed_fields || {}).length,
  };
}
