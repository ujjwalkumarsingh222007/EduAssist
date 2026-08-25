/**
 * Canonical Field Dictionary & Schema Definitions
 * Provides a standardized data model for all student profile fields
 * to support form filling on arbitrary external website formats.
 */

export type FieldCategory =
  | "identity"
  | "family"
  | "contact"
  | "education"
  | "financial"
  | "identity_documents"
  | "category"
  | "bank"
  | "documents";

export type FieldDataType =
  | "string"
  | "date"
  | "number"
  | "select"
  | "phone"
  | "email"
  | "address"
  | "file";

export interface CanonicalFieldDefinition {
  key: string;
  label: string;
  category: FieldCategory;
  dataType: FieldDataType;
  isSensitive: boolean;
  description: string;
  example?: string;
}

export const CANONICAL_FIELD_DICTIONARY: Record<string, CanonicalFieldDefinition> = {
  // ==========================================
  // IDENTITY
  // ==========================================
  full_name: {
    key: "full_name",
    label: "Full Name",
    category: "identity",
    dataType: "string",
    isSensitive: false,
    description: "Complete candidate name as written on official documents",
    example: "Ujjwal Kumar Sharma",
  },
  first_name: {
    key: "first_name",
    label: "First Name / Given Name",
    category: "identity",
    dataType: "string",
    isSensitive: false,
    description: "Given first name of candidate",
    example: "Ujjwal",
  },
  middle_name: {
    key: "middle_name",
    label: "Middle Name",
    category: "identity",
    dataType: "string",
    isSensitive: false,
    description: "Middle name or secondary given name(s)",
    example: "Kumar",
  },
  last_name: {
    key: "last_name",
    label: "Last Name / Surname / Family Name",
    category: "identity",
    dataType: "string",
    isSensitive: false,
    description: "Surname or family name of candidate",
    example: "Sharma",
  },
  date_of_birth: {
    key: "date_of_birth",
    label: "Date of Birth",
    category: "identity",
    dataType: "date",
    isSensitive: false,
    description: "Candidate date of birth in canonical ISO format (YYYY-MM-DD)",
    example: "2007-02-02",
  },
  gender: {
    key: "gender",
    label: "Gender",
    category: "identity",
    dataType: "select",
    isSensitive: false,
    description: "Canonical gender value (Male / Female / Other)",
    example: "Male",
  },
  nationality: {
    key: "nationality",
    label: "Nationality",
    category: "identity",
    dataType: "string",
    isSensitive: false,
    description: "Country of citizenship",
    example: "Indian",
  },

  // ==========================================
  // FAMILY
  // ==========================================
  father_name: {
    key: "father_name",
    label: "Father's Name",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Father's full name",
    example: "Ramesh Sharma",
  },
  mother_name: {
    key: "mother_name",
    label: "Mother's Name",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Mother's full name",
    example: "Sunita Sharma",
  },
  guardian_name: {
    key: "guardian_name",
    label: "Guardian's Name",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Legal guardian's full name if applicable",
    example: "Rajesh Sharma",
  },

  // ==========================================
  // CONTACT & ADDRESS
  // ==========================================
  phone: {
    key: "phone",
    label: "Mobile / Phone Number",
    category: "contact",
    dataType: "phone",
    isSensitive: false,
    description: "Primary 10-digit mobile number",
    example: "9876543210",
  },
  email: {
    key: "email",
    label: "Email Address",
    category: "contact",
    dataType: "email",
    isSensitive: false,
    description: "Primary contact email address",
    example: "student@example.com",
  },
  address: {
    key: "address",
    label: "Full Residential Address",
    category: "contact",
    dataType: "address",
    isSensitive: false,
    description: "Complete street address or combined address line",
    example: "14/B Civil Lines, Near Railway Station",
  },
  address_line1: {
    key: "address_line1",
    label: "Address Line 1",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "House/Flat number and street name",
    example: "14/B Civil Lines",
  },
  address_line2: {
    key: "address_line2",
    label: "Address Line 2",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "Locality, area, or landmark",
    example: "Near Railway Station",
  },
  city: {
    key: "city",
    label: "City / District",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "City or district name",
    example: "Kanpur",
  },
  state: {
    key: "state",
    label: "State / Province",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "State name",
    example: "Uttar Pradesh",
  },
  country: {
    key: "country",
    label: "Country",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "Country name",
    example: "India",
  },
  pincode: {
    key: "pincode",
    label: "Pincode / Postal Code / ZIP",
    category: "contact",
    dataType: "string",
    isSensitive: false,
    description: "6-digit postal code",
    example: "208001",
  },

  // ==========================================
  // EDUCATION
  // ==========================================
  institution: {
    key: "institution",
    label: "Institution / School / College Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Current enrolled educational institution",
    example: "IIT Kanpur",
  },
  university: {
    key: "university",
    label: "Affiliating University Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "University with which college is affiliated",
    example: "Indian Institute of Technology",
  },
  college: {
    key: "college",
    label: "College Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Enrolled college name",
    example: "IIT Kanpur",
  },
  degree: {
    key: "degree",
    label: "Degree / Qualification Level",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Degree qualification (e.g. B.Tech, B.Sc, M.Tech)",
    example: "B.Tech",
  },
  course: {
    key: "course",
    label: "Course / Program Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Full degree course name (e.g. Bachelor of Technology)",
    example: "Bachelor of Technology",
  },
  major: {
    key: "major",
    label: "Major / Specialization",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Primary discipline or major field of study",
    example: "Computer Science",
  },
  specialization: {
    key: "specialization",
    label: "Specialization",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Sub-specialization within major",
    example: "Artificial Intelligence",
  },
  branch: {
    key: "branch",
    label: "Branch / Stream",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Engineering or academic branch stream",
    example: "Computer Science and Engineering",
  },
  roll_number: {
    key: "roll_number",
    label: "Roll Number",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Student examination roll number",
    example: "2024IITK101",
  },
  registration_number: {
    key: "registration_number",
    label: "Registration Number",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "University registration number",
    example: "REG20249876",
  },
  enrollment_number: {
    key: "enrollment_number",
    label: "Enrollment Number",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Institutional enrollment identifier",
    example: "ENR202456",
  },
  graduation_year: {
    key: "graduation_year",
    label: "Graduation / Passing Year",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Expected or completed passing year",
    example: "2028",
  },
  percentage: {
    key: "percentage",
    label: "Marks Percentage (%)",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Previous examination score percentage",
    example: "94.0%",
  },
  cgpa: {
    key: "cgpa",
    label: "CGPA / GPA Score",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Cumulative Grade Point Average (out of 10.0 or 4.0)",
    example: "9.4",
  },

  // ==========================================
  // CLASS 10 (SECONDARY) ACADEMICS
  // ==========================================
  class_10_percentage: {
    key: "class_10_percentage",
    label: "Class 10 Percentage",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Class 10 / Secondary examination marks percentage",
    example: "92.4%",
  },
  class_10_marks: {
    key: "class_10_marks",
    label: "Class 10 Total Marks",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Total marks obtained in Class 10 / SSC",
    example: "462 / 500",
  },
  class_10_passing_year: {
    key: "class_10_passing_year",
    label: "Class 10 Passing Year",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Year of passing Class 10 / SSC examination",
    example: "2022",
  },
  class_10_board: {
    key: "class_10_board",
    label: "Class 10 Education Board",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Class 10 examination board (e.g. CBSE, ICSE, State Board)",
    example: "CBSE",
  },
  class_10_roll_number: {
    key: "class_10_roll_number",
    label: "Class 10 Roll Number",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Roll number on Class 10 marksheet",
    example: "12345678",
  },
  class_10_school: {
    key: "class_10_school",
    label: "Class 10 School Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "School name attended for Class 10",
    example: "Delhi Public School",
  },

  // ==========================================
  // CLASS 12 (HIGHER SECONDARY) ACADEMICS
  // ==========================================
  class_12_percentage: {
    key: "class_12_percentage",
    label: "Class 12 Percentage",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Class 12 / Higher Secondary / Intermediate examination marks percentage",
    example: "94.6%",
  },
  class_12_marks: {
    key: "class_12_marks",
    label: "Class 12 Total Marks",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Total marks obtained in Class 12 / HSC",
    example: "473 / 500",
  },
  class_12_passing_year: {
    key: "class_12_passing_year",
    label: "Class 12 Passing Year",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Year of passing Class 12 / HSC / Intermediate examination",
    example: "2024",
  },
  class_12_board: {
    key: "class_12_board",
    label: "Class 12 Education Board",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Class 12 examination board (e.g. CBSE, ISC, State Board)",
    example: "CBSE",
  },
  class_12_stream: {
    key: "class_12_stream",
    label: "Class 12 Academic Stream",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Senior secondary stream (Science - PCM/PCB, Commerce, Arts/Humanities)",
    example: "Science (PCM)",
  },
  class_12_roll_number: {
    key: "class_12_roll_number",
    label: "Class 12 Roll Number",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Roll number on Class 12 marksheet",
    example: "26123456",
  },
  class_12_school: {
    key: "class_12_school",
    label: "Class 12 School / Junior College Name",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "School or Junior College attended for Class 12",
    example: "Delhi Public School, R.K. Puram",
  },

  // ==========================================
  // GRADUATION / HIGHER EDUCATION
  // ==========================================
  graduation_percentage: {
    key: "graduation_percentage",
    label: "Graduation Percentage",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Cumulative undergraduate degree marks percentage",
    example: "86.5%",
  },
  graduation_cgpa: {
    key: "graduation_cgpa",
    label: "Graduation CGPA",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "Cumulative undergraduate Grade Point Average",
    example: "8.9",
  },
  graduation_university: {
    key: "graduation_university",
    label: "Graduation University",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "University conferring undergraduate degree",
    example: "Delhi Technological University",
  },
  graduation_institution: {
    key: "graduation_institution",
    label: "Graduation College / Institution",
    category: "education",
    dataType: "string",
    isSensitive: false,
    description: "College attended for undergraduate degree",
    example: "DTU Main Campus",
  },

  // ==========================================
  // FINANCIAL
  // ==========================================
  annual_income: {
    key: "annual_income",
    label: "Annual Family Income",
    category: "financial",
    dataType: "number",
    isSensitive: false,
    description: "Total annual family income in INR",
    example: "180000",
  },
  family_income: {
    key: "family_income",
    label: "Family Income",
    category: "financial",
    dataType: "number",
    isSensitive: false,
    description: "Family income as stated on income certificate",
    example: "180000",
  },
  income_certificate_number: {
    key: "income_certificate_number",
    label: "Income Certificate Number",
    category: "financial",
    dataType: "string",
    isSensitive: false,
    description: "Government issued revenue certificate serial number",
    example: "INC2026/UP/78910",
  },

  // ==========================================
  // IDENTITY DOCUMENTS (SENSITIVE)
  // ==========================================
  aadhaar_number: {
    key: "aadhaar_number",
    label: "Aadhaar Number",
    category: "identity_documents",
    dataType: "string",
    isSensitive: true,
    description: "12-digit UIDAI Aadhaar number",
    example: "7890 1234 5678",
  },
  pan_number: {
    key: "pan_number",
    label: "PAN Card Number",
    category: "identity_documents",
    dataType: "string",
    isSensitive: true,
    description: "10-character Income Tax Permanent Account Number",
    example: "ABCDE1234F",
  },
  passport_number: {
    key: "passport_number",
    label: "Passport Number",
    category: "identity_documents",
    dataType: "string",
    isSensitive: true,
    description: "Government Passport identification number",
    example: "Z1234567",
  },
  voter_id: {
    key: "voter_id",
    label: "Voter ID / EPIC Number",
    category: "identity_documents",
    dataType: "string",
    isSensitive: false,
    description: "Election Commission Electoral Photo ID Card number",
    example: "UP/12/345/678901",
  },

  // ==========================================
  // CATEGORY & DOMICILE
  // ==========================================
  category: {
    key: "category",
    label: "Social Category / Reservation Class",
    category: "category",
    dataType: "select",
    isSensitive: false,
    description: "Caste/social classification (General / OBC / SC / ST / EWS)",
    example: "General",
  },
  caste: {
    key: "caste",
    label: "Caste / Sub-Caste",
    category: "category",
    dataType: "string",
    isSensitive: false,
    description: "Sub-caste or community name",
    example: "Brahmin",
  },
  domicile: {
    key: "domicile",
    label: "State of Domicile / Permanent Residence",
    category: "category",
    dataType: "string",
    isSensitive: false,
    description: "Permanent domicile state",
    example: "Uttar Pradesh",
  },

  // ==========================================
  // BANK DETAILS (SENSITIVE)
  // ==========================================
  account_holder_name: {
    key: "account_holder_name",
    label: "Bank Account Holder Name",
    category: "bank",
    dataType: "string",
    isSensitive: false,
    description: "Name of student as per bank passbook",
    example: "Ujjwal Kumar Sharma",
  },
  account_number: {
    key: "account_number",
    label: "Bank Account Number",
    category: "bank",
    dataType: "string",
    isSensitive: true,
    description: "Bank savings account number for scholarship DBT",
    example: "10029384756",
  },
  ifsc: {
    key: "ifsc",
    label: "Bank IFSC Code",
    category: "bank",
    dataType: "string",
    isSensitive: true,
    description: "11-character Indian Financial System Code",
    example: "SBIN0001234",
  },
  bank_name: {
    key: "bank_name",
    label: "Bank Name",
    category: "bank",
    dataType: "string",
    isSensitive: false,
    description: "Name of commercial bank",
    example: "State Bank of India",
  },
  branch_name: {
    key: "branch_name",
    label: "Bank Branch Name",
    category: "bank",
    dataType: "string",
    isSensitive: false,
    description: "Name of local branch",
    example: "Civil Lines Branch, Kanpur",
  },
  // ==========================================
  // EXTENDED UNIVERSAL PROFILE FIELDS
  // ==========================================
  father_occupation: {
    key: "father_occupation",
    label: "Father's Occupation",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Profession / employment of father",
    example: "Teacher",
  },
  father_education: {
    key: "father_education",
    label: "Father's Highest Qualification",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Highest degree / education level of father",
    example: "Post Graduate",
  },
  father_income: {
    key: "father_income",
    label: "Father's Annual Income",
    category: "family",
    dataType: "number",
    isSensitive: false,
    description: "Annual income of father in INR",
    example: "350000",
  },
  mother_occupation: {
    key: "mother_occupation",
    label: "Mother's Occupation",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Profession / employment of mother",
    example: "Homemaker",
  },
  mother_education: {
    key: "mother_education",
    label: "Mother's Highest Qualification",
    category: "family",
    dataType: "string",
    isSensitive: false,
    description: "Highest degree / education level of mother",
    example: "Graduate",
  },
  current_semester: {
    key: "current_semester",
    label: "Current Semester",
    category: "education",
    dataType: "number",
    isSensitive: false,
    description: "Currently enrolled semester in college/university",
    example: "5",
  },
  jee_percentile: {
    key: "jee_percentile",
    label: "JEE Main Percentile / Score",
    category: "education",
    dataType: "number",
    isSensitive: false,
    description: "Score / NTA Percentile in JEE Main examination",
    example: "98.4",
  },
  jee_rank: {
    key: "jee_rank",
    label: "JEE Main All India Rank (AIR)",
    category: "education",
    dataType: "number",
    isSensitive: false,
    description: "All India Rank in JEE Main",
    example: "12450",
  },
  gate_score: {
    key: "gate_score",
    label: "GATE Score / Rank",
    category: "education",
    dataType: "number",
    isSensitive: false,
    description: "Score or AIR in Graduate Aptitude Test in Engineering",
    example: "720",
  },
};

/**
 * Normalized Canonical Profile Data Model
 */
export interface CanonicalNameComponents {
  first_name: string;
  middle_name: string;
  last_name: string;
  is_manually_edited?: boolean;
}

export interface CanonicalAddressComponents {
  full_address: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface CanonicalEducationComponents {
  institution: string;
  university: string;
  college: string;
  degree: string;
  course: string;
  major: string;
  branch: string;
  specialization: string;
  roll_number: string;
  registration_number: string;
  enrollment_number: string;
  graduation_year: string;
  percentage: string;
  cgpa: string;
}

export interface CanonicalBankComponents {
  account_holder_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string;
  branch_name: string;
}

export interface CanonicalProfile {
  // Identity
  full_name: string;
  name_components: CanonicalNameComponents;
  date_of_birth: string; // ISO format: YYYY-MM-DD
  gender: string;
  nationality: string;

  // Family
  father_name: string;
  mother_name: string;
  guardian_name: string;

  // Contact & Address
  phone: string;
  email: string;
  address: CanonicalAddressComponents;

  // Education
  education: CanonicalEducationComponents;

  // Financial
  annual_income: string;
  family_income: string;
  income_certificate_number: string;

  // Identity Documents (Sensitive)
  aadhaar_number: string;
  pan_number: string;
  passport_number: string;
  voter_id: string;

  // Category & Domicile
  category: string;
  caste: string;
  domicile: string;

  // Bank (Sensitive)
  bank: CanonicalBankComponents;

  // Document attachments available in repository
  verified_documents: {
    id: string;
    canonical_type: string;
    file_name: string;
    file_path: string;
  }[];

  // Metadata
  raw_profile_data?: Record<string, unknown>;
}
