import { DocumentTypeCategory, EducationLevel } from "./classifier";

export interface FieldScore<T = string | number | boolean | null> {
  value: T;
  confidence: number; // 0.0 to 1.0
  raw_label?: string;
}

export interface SubjectEntry {
  code?: string;
  name: string;
  marks_obtained?: number | string | null;
  theory_marks?: number | string | null;
  practical_marks?: number | string | null;
  max_marks?: number | string | null;
  grade?: string | null;
  grade_point?: number | string | null;
  credits?: number | string | null;
  status?: "PASS" | "FAIL" | string;
}

export interface Class10ExtractionData {
  document_type: "CLASS_10_MARKSHEET";
  education_level: "CLASS_10";
  student: {
    full_name: FieldScore<string | null>;
    first_name?: FieldScore<string | null>;
    middle_name?: FieldScore<string | null>;
    last_name?: FieldScore<string | null>;
    father_name?: FieldScore<string | null>;
    mother_name?: FieldScore<string | null>;
    date_of_birth?: FieldScore<string | null>;
    gender?: FieldScore<string | null>;
  };
  academic: {
    board: FieldScore<string | null>;
    school_name: FieldScore<string | null>;
    school_code?: FieldScore<string | null>;
    center_number?: FieldScore<string | null>;
    roll_number: FieldScore<string | null>;
    registration_number?: FieldScore<string | null>;
    enrollment_number?: FieldScore<string | null>;
    certificate_number?: FieldScore<string | null>;
    passing_year: FieldScore<string | null>;
    examination_year?: FieldScore<string | null>;
    result: FieldScore<string | null>;
    division?: FieldScore<string | null>;
    grade?: FieldScore<string | null>;
    percentage: FieldScore<number | null>;
    cgpa?: FieldScore<number | null>;
    total_marks?: FieldScore<number | null>;
    obtained_marks?: FieldScore<number | null>;
  };
  subjects: SubjectEntry[];
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface Class12ExtractionData {
  document_type: "CLASS_12_MARKSHEET";
  education_level: "CLASS_12";
  student: {
    full_name: FieldScore<string | null>;
    first_name?: FieldScore<string | null>;
    middle_name?: FieldScore<string | null>;
    last_name?: FieldScore<string | null>;
    father_name?: FieldScore<string | null>;
    mother_name?: FieldScore<string | null>;
    date_of_birth?: FieldScore<string | null>;
    gender?: FieldScore<string | null>;
  };
  academic: {
    board: FieldScore<string | null>;
    school_name: FieldScore<string | null>;
    school_code?: FieldScore<string | null>;
    center_number?: FieldScore<string | null>;
    stream: FieldScore<string | null>; // Science (PCM/PCB), Commerce, Arts/Humanities
    roll_number: FieldScore<string | null>;
    registration_number?: FieldScore<string | null>;
    enrollment_number?: FieldScore<string | null>;
    certificate_number?: FieldScore<string | null>;
    passing_year: FieldScore<string | null>;
    examination_year?: FieldScore<string | null>;
    result: FieldScore<string | null>;
    division?: FieldScore<string | null>;
    grade?: FieldScore<string | null>;
    percentage: FieldScore<number | null>;
    cgpa?: FieldScore<number | null>;
    total_marks?: FieldScore<number | null>;
    obtained_marks?: FieldScore<number | null>;
  };
  subjects: SubjectEntry[];
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface CollegeMarksheetExtractionData {
  document_type: "UG_MARKSHEET" | "PG_MARKSHEET" | "DIPLOMA_MARKSHEET" | "TRANSCRIPT";
  education_level: "UNDERGRADUATE" | "POSTGRADUATE" | "DIPLOMA";
  student: {
    full_name: FieldScore<string | null>;
    enrollment_number?: FieldScore<string | null>;
    roll_number?: FieldScore<string | null>;
    registration_number?: FieldScore<string | null>;
  };
  college: {
    university_name: FieldScore<string | null>;
    college_name: FieldScore<string | null>;
    degree: FieldScore<string | null>;
    branch_or_major: FieldScore<string | null>;
    semester?: FieldScore<string | null>;
    academic_year?: FieldScore<string | null>;
    sgpa?: FieldScore<number | null>;
    cgpa?: FieldScore<number | null>;
    percentage?: FieldScore<number | null>;
    total_credits?: FieldScore<number | null>;
    backlogs?: FieldScore<number | string | null>;
    result?: FieldScore<string | null>;
  };
  subjects: SubjectEntry[];
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface InternshipExtractionData {
  document_type: "INTERNSHIP_CERTIFICATE";
  education_level: "NONE";
  student: {
    intern_name: FieldScore<string | null>;
  };
  internship: {
    organization_name: FieldScore<string | null>;
    role_title: FieldScore<string | null>;
    department_domain?: FieldScore<string | null>;
    supervisor_name?: FieldScore<string | null>;
    project_name?: FieldScore<string | null>;
    start_date?: FieldScore<string | null>;
    end_date?: FieldScore<string | null>;
    duration_months_or_weeks?: FieldScore<string | null>;
    location?: FieldScore<string | null>;
    certificate_id?: FieldScore<string | null>;
    issue_date?: FieldScore<string | null>;
    stipend?: FieldScore<string | null>;
    technologies_or_skills?: string[];
    description?: FieldScore<string | null>;
  };
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface IncomeExtractionData {
  document_type: "INCOME_CERTIFICATE";
  education_level: "NONE";
  holder: {
    applicant_name: FieldScore<string | null>;
    father_name?: FieldScore<string | null>;
    family_head_name?: FieldScore<string | null>;
  };
  financial: {
    annual_family_income: FieldScore<number | null>;
    monthly_income?: FieldScore<number | null>;
    financial_year?: FieldScore<string | null>;
    certificate_number: FieldScore<string | null>;
    issue_date?: FieldScore<string | null>;
    valid_upto?: FieldScore<string | null>;
    issuing_authority?: FieldScore<string | null>;
    district?: FieldScore<string | null>;
    state?: FieldScore<string | null>;
    income_in_words?: FieldScore<string | null>;
  };
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface IdentityExtractionData {
  document_type: "IDENTITY_DOCUMENT";
  education_level: "NONE";
  identity_type: "Aadhaar Card" | "PAN Card" | "Passport" | "Voter ID" | "Driving License" | "Other";
  person: {
    full_name: FieldScore<string | null>;
    date_of_birth?: FieldScore<string | null>;
    gender?: FieldScore<string | null>;
    father_name?: FieldScore<string | null>;
    id_number: FieldScore<string | null>;
    address_line?: FieldScore<string | null>;
    city?: FieldScore<string | null>;
    state?: FieldScore<string | null>;
    pincode?: FieldScore<string | null>;
    issue_date?: FieldScore<string | null>;
    expiry_date?: FieldScore<string | null>;
  };
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export interface GenericExtractionData {
  document_type: DocumentTypeCategory;
  education_level: EducationLevel;
  fields: Record<string, FieldScore<unknown>>;
  tables?: { name: string; headers: string[]; rows: (string | number | null)[][] }[];
  custom_fields?: Record<string, FieldScore<unknown>>;
}

export type StructuredDocumentData =
  | Class10ExtractionData
  | Class12ExtractionData
  | CollegeMarksheetExtractionData
  | InternshipExtractionData
  | IncomeExtractionData
  | IdentityExtractionData
  | GenericExtractionData;
