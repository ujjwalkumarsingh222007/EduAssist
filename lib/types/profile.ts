export interface MarksheetSubject {
  subject_name: string;
  subject_code?: string;
  maximum_marks?: string | number | null;
  theory_marks?: string | number | null;
  practical_marks?: string | number | null;
  internal_marks?: string | number | null;
  marks_obtained?: string | number | null;
  total_marks?: string | number | null;
  grade?: string | null;
  grade_point?: string | number | null;
  credits?: string | number | null;
  pass_fail?: "PASS" | "FAIL" | string;
}

export interface MarksheetTable {
  id?: string;
  source_document_name?: string;
  source_document_id?: string;
  examination_name?: string;
  board_name?: string;
  institution_name?: string;
  school_name?: string;
  roll_number?: string;
  registration_number?: string;
  certificate_number?: string;
  year?: string;
  passing_year?: string;
  result_date?: string;
  stream?: string;
  total_marks?: string | number;
  maximum_marks?: string | number;
  percentage?: string | number;
  cgpa?: string | number;
  division?: string;
  grade?: string;
  result?: string;
  subjects?: MarksheetSubject[];
}

export interface VerifiedCertificate {
  id?: string;
  certificate_type: string;
  certificate_number?: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  category?: string;
  state?: string;
  district?: string;
  source_document_name?: string;
  source_document_id?: string;
  verified?: boolean;
}

export interface ConfirmedFieldEntry {
  label: string;
  value: string;
  source_document?: string;
  source_document_id?: string;
  confidence?: number;
  confirmed_at?: string;
  is_sensitive?: boolean;
  field_status?: "Verified" | "AI Extracted" | "User Confirmed" | "User Edited" | "Unverified";
}

export interface FieldConflictEntry {
  field_key: string;
  field_label: string;
  existing_value: string;
  existing_source?: string;
  new_value: string;
  new_source: string;
  detected_at: string;
}

export interface SiblingRecord {
  id?: string;
  name: string;
  age?: string | number;
  gender?: "Male" | "Female" | "Other" | string;
  relationship?: "Brother" | "Sister" | "Sibling" | string;
  education?: string;
  institution?: string;
  occupation?: string;
  annual_income?: string | number;
}

export interface SemesterRecord {
  id?: string;
  semester_number: number | string;
  academic_year?: string;
  sgpa?: string | number;
  cgpa?: string | number;
  credits_completed?: string | number;
  backlogs?: number | string;
  active_backlogs?: number | string;
  subjects?: MarksheetSubject[];
}

export interface CompetitiveExamRecord {
  id?: string;
  exam_name: string;
  exam_year?: string;
  application_number?: string;
  roll_number?: string;
  registration_number?: string;
  attempt?: string | number;
  score?: string | number;
  percentile?: string | number;
  rank?: string | number;
  category_rank?: string | number;
  qualifying_status?: "Qualified" | "Not Qualified" | "Appeared" | string;
  exam_date?: string;
  result_date?: string;
}

export interface CertificationRecord {
  id?: string;
  certification_name: string;
  issuing_organization: string;
  credential_id?: string;
  credential_url?: string;
  issue_date?: string;
  expiry_date?: string;
  score?: string | number;
  grade?: string;
  skills_covered?: string[];
  verification_url?: string;
}

export type SkillProficiency = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface SkillRecord {
  id?: string;
  skill_name: string;
  category?: string;
  proficiency?: SkillProficiency;
  years_of_experience?: string | number;
  verified?: boolean;
  source?: string;
}

export interface ProjectRecord {
  id?: string;
  project_name: string;
  description?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  technologies?: string[];
  programming_languages?: string[];
  team_size?: string | number;
  github_url?: string;
  live_demo_url?: string;
  documentation_url?: string;
  achievement?: string;
  award?: string;
  project_type?: "Academic Project" | "Personal Project" | "Hackathon Project" | "Research Project" | "Industry Project" | string;
}

export interface ExperienceRecord {
  id?: string;
  organization: string;
  role: string;
  employment_type?: "Internship" | "Full-time" | "Part-time" | "Freelance" | "Research" | "Volunteering" | string;
  start_date?: string;
  end_date?: string;
  currently_working?: boolean;
  location?: string;
  remote?: boolean;
  stipend?: string;
  salary?: string;
  description?: string;
  responsibilities?: string;
  technologies?: string[];
  skills?: string[];
  supervisor?: string;
  certificate_url?: string;
  proof_document?: string;
}

export interface AchievementRecord {
  id?: string;
  title: string;
  organization?: string;
  date?: string;
  position?: string;
  rank?: string;
  description?: string;
  certificate_name?: string;
  verification_url?: string;
  category?: "Competition" | "Hackathon" | "Olympiad" | "Academic Award" | "Sports" | "Cultural" | "Leadership" | "Publication" | "Scholarship" | "Other" | string;
}

export interface ExtracurricularRecord {
  id?: string;
  activity: string;
  organization?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  achievement?: string;
  description?: string;
}

export interface LanguageRecord {
  id?: string;
  language: string;
  reading?: boolean;
  writing?: boolean;
  speaking?: boolean;
  listening?: boolean;
  proficiency?: "Basic" | "Conversational" | "Fluent" | "Native" | string;
}

export interface ResearchPublicationRecord {
  id?: string;
  title: string;
  authors?: string;
  journal_or_conference?: string;
  date?: string;
  doi?: string;
  url?: string;
  patent_number?: string;
  description?: string;
}

export interface ProfileData {
  personal?: {
    full_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    previous_name?: string;
    date_of_birth?: string;
    place_of_birth?: string;
    gender?: string;
    nationality?: string;
    citizenship?: string;
    marital_status?: string;
    blood_group?: string;
    mother_tongue?: string;
    email?: string;
    alternate_email?: string;
    phone?: string;
    alternate_phone?: string;
    emergency_contact?: string;
    pincode?: string;
    address_line1?: string;
    address_line2?: string;
    name_components?: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      is_manually_edited?: boolean;
    };
    [key: string]: unknown;
  };

  identity?: {
    aadhaar_number?: string;
    pan_number?: string;
    passport_number?: string;
    passport_expiry?: string;
    voter_id?: string;
    driving_license?: string;
    other_government_id?: string;
    [key: string]: unknown;
  };

  address?: {
    permanent?: {
      house_number?: string;
      street?: string;
      area?: string;
      village?: string;
      town?: string;
      city?: string;
      district?: string;
      state?: string;
      country?: string;
      pincode?: string;
    };
    current?: {
      same_as_permanent?: boolean;
      house_number?: string;
      street?: string;
      area?: string;
      village?: string;
      town?: string;
      city?: string;
      district?: string;
      state?: string;
      country?: string;
      pincode?: string;
    };
    domicile_state?: string;
    domicile_district?: string;
    years_at_current_address?: string | number;
    [key: string]: unknown;
  };

  family?: {
    father_name?: string;
    father_dob?: string;
    father_age?: string | number;
    father_occupation?: string;
    father_employer?: string;
    father_employment_type?: string;
    father_education?: string;
    father_income?: string | number;
    father_monthly_income?: string | number;
    father_phone?: string;
    father_email?: string;
    father_status?: "Alive" | "Deceased" | string;

    mother_name?: string;
    mother_dob?: string;
    mother_age?: string | number;
    mother_occupation?: string;
    mother_employer?: string;
    mother_employment_type?: string;
    mother_education?: string;
    mother_income?: string | number;
    mother_monthly_income?: string | number;
    mother_phone?: string;
    mother_email?: string;
    mother_status?: "Alive" | "Deceased" | string;

    guardian_name?: string;
    guardian_relationship?: string;
    guardian_occupation?: string;
    guardian_education?: string;
    guardian_employer?: string;
    guardian_income?: string | number;
    guardian_phone?: string;
    guardian_email?: string;
    guardian_address?: string;

    siblings?: SiblingRecord[];
    [key: string]: unknown;
  };

  secondary_10th?: MarksheetTable;
  senior_secondary_12th?: MarksheetTable;

  education?: {
    institution_name?: string;
    university_name?: string;
    college_name?: string;
    campus?: string;
    degree?: string;
    course?: string;
    program?: string;
    branch?: string;
    major?: string;
    minor?: string;
    specialization?: string;
    mode?: "Regular" | "Distance" | "Part-time" | "Online" | string;
    current_semester?: string | number;
    admission_year?: string;
    expected_graduation_year?: string;
    actual_graduation_year?: string;
    graduation_year?: string;
    enrollment_number?: string;
    roll_number?: string;
    registration_number?: string;
    student_id?: string;
    cgpa?: string;
    percentage?: string;
    active_backlogs?: string | number;
    cleared_backlogs?: string | number;
    credits_completed?: string | number;
    total_credits?: string | number;
    rank?: string;
    [key: string]: unknown;
  };

  higher_education?: {
    institution_name?: string;
    university_name?: string;
    college_name?: string;
    campus?: string;
    degree?: string;
    course?: string;
    branch?: string;
    major?: string;
    minor?: string;
    specialization?: string;
    current_semester?: string | number;
    admission_year?: string;
    expected_graduation_year?: string;
    cgpa?: string;
    percentage?: string;
    active_backlogs?: string | number;
    cleared_backlogs?: string | number;
    credits_completed?: string | number;
    [key: string]: unknown;
  };

  semesters?: SemesterRecord[];
  competitive_exams?: CompetitiveExamRecord[];
  certifications?: CertificationRecord[];
  skills?: SkillRecord[];
  projects?: ProjectRecord[];
  experience?: ExperienceRecord[];
  achievements?: AchievementRecord[];
  extracurriculars?: ExtracurricularRecord[];
  languages?: LanguageRecord[];
  research_publications?: ResearchPublicationRecord[];

  academic_results?: MarksheetTable[];
  certificates?: VerifiedCertificate[];

  eligibility?: {
    annual_income?: string;
    family_income?: string;
    monthly_income?: string;
    income_source?: string;
    income_certificate_number?: string;
    income_certificate_issue_date?: string;
    income_certificate_expiry_date?: string;
    category?: string;
    subcategory?: string;
    caste?: string;
    caste_certificate_number?: string;
    caste_certificate_issue_date?: string;
    issuing_authority?: string;
    domicile?: string;
    domicile_state?: string;
    domicile_district?: string;
    domicile_certificate_number?: string;
    residence?: string;
    pwd_status?: string;
    disability_type?: string;
    disability_percentage?: string;
    minority_status?: string;
    ex_serviceman?: string;
    [key: string]: unknown;
  };

  bank?: {
    account_holder_name?: string;
    account_number?: string;
    ifsc?: string;
    bank_name?: string;
    branch_name?: string;
    [key: string]: unknown;
  };

  confirmed_fields?: Record<string, ConfirmedFieldEntry>;
  conflicts?: FieldConflictEntry[];

  meta?: {
    source_documents?: { id: string; name: string; type?: string; confirmed_at: string; document_number?: string }[];
    last_confirmed_at?: string;
    verified_fields_count?: number;
    profile_completion_percentage?: number;
  };
}

export interface Profile {
  id?: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  profile_data?: ProfileData;
  created_at?: string;
  updated_at?: string;
}
