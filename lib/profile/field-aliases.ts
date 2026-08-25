/**
 * Field Alias Dictionary
 * Maps diverse website field labels, placeholders, input names, and identifiers
 * to our normalized canonical profile field keys.
 */

export function normalizeAliasKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const FIELD_ALIASES_MAP: Record<string, string[]> = {
  // ==========================================
  // IDENTITY
  // ==========================================
  full_name: [
    "full name",
    "applicant name",
    "candidate name",
    "student name",
    "name of applicant",
    "name of candidate",
    "candidate full name",
    "applicant full name",
    "complete name",
    "candidate fullname",
    "student fullname",
    "name",
  ],
  first_name: [
    "first name",
    "given name",
    "given names",
    "firstname",
    "candidate first name",
    "applicant first name",
    "forename",
    "first",
  ],
  middle_name: [
    "middle name",
    "second name",
    "middlename",
    "candidate middle name",
    "middle",
  ],
  last_name: [
    "last name",
    "family name",
    "surname",
    "lastname",
    "candidate last name",
    "applicant last name",
    "last",
  ],
  date_of_birth: [
    "date of birth",
    "dob",
    "birth date",
    "birthdate",
    "date of birth ddmmyyyy",
    "candidate dob",
    "applicant dob",
    "d o b",
  ],
  gender: [
    "gender",
    "sex",
    "candidate gender",
    "applicant gender",
  ],
  nationality: [
    "nationality",
    "citizenship",
    "country of citizenship",
    "candidate nationality",
  ],

  // ==========================================
  // FAMILY
  // ==========================================
  father_name: [
    "fathers name",
    "father name",
    "fathers full name",
    "father full name",
    "parent name",
    "name of father",
    "father guardian name",
  ],
  mother_name: [
    "mothers name",
    "mother name",
    "mothers full name",
    "mother full name",
    "name of mother",
  ],
  guardian_name: [
    "guardian name",
    "guardians name",
    "legal guardian name",
    "guardian full name",
  ],

  // ==========================================
  // CONTACT & ADDRESS
  // ==========================================
  phone: [
    "mobile",
    "mobile number",
    "phone",
    "phone number",
    "contact number",
    "cell number",
    "mobile no",
    "contact no",
    "telephone",
    "student mobile",
    "candidate mobile",
  ],
  email: [
    "email",
    "email address",
    "student email",
    "candidate email",
    "e mail",
    "e mail address",
  ],
  address: [
    "address",
    "permanent address",
    "residential address",
    "full address",
    "communication address",
    "correspondence address",
    "present address",
    "street address",
    "candidate address",
  ],
  address_line1: [
    "address line 1",
    "address line1",
    "street address line 1",
    "flat house no",
    "house number",
    "street",
  ],
  address_line2: [
    "address line 2",
    "address line2",
    "street address line 2",
    "locality",
    "landmark",
    "area",
  ],
  city: [
    "city",
    "district",
    "town",
    "city district",
    "domicile district",
    "residential city",
  ],
  state: [
    "state",
    "domicile state",
    "resident state",
    "state of residence",
    "province",
    "domicile",
  ],
  country: [
    "country",
    "nation",
    "country of residence",
  ],
  pincode: [
    "pin",
    "pin code",
    "postal code",
    "zip",
    "zip code",
    "pincode",
    "post code",
  ],

  // ==========================================
  // EDUCATION
  // ==========================================
  institution: [
    "college",
    "college name",
    "institution",
    "institution name",
    "school name",
    "school college name",
    "institute name",
    "enrolled institution",
    "present institution",
  ],
  university: [
    "university",
    "university name",
    "affiliating university",
    "board university",
    "name of university",
  ],
  degree: [
    "degree",
    "degree name",
    "qualification",
    "qualification level",
    "degree level",
    "level of study",
  ],
  course: [
    "course",
    "program",
    "programme",
    "course name",
    "program name",
    "enrolled course",
  ],
  major: [
    "major",
    "primary discipline",
    "major field of study",
    "field of study",
  ],
  branch: [
    "branch",
    "stream",
    "discipline",
    "branch of study",
    "engineering branch",
  ],
  specialization: [
    "specialization",
    "sub specialization",
    "area of specialization",
  ],
  roll_number: [
    "roll number",
    "roll no",
    "exam roll no",
    "examination roll number",
    "class roll no",
  ],
  registration_number: [
    "registration number",
    "registration no",
    "reg no",
    "univ registration number",
  ],
  enrollment_number: [
    "enrollment number",
    "enrollment no",
    "enrolment no",
    "student enrollment number",
  ],
  graduation_year: [
    "graduation year",
    "year of graduation",
    "passing year",
    "year of passing",
    "completion year",
  ],
  percentage: [
    "percentage",
    "marks percentage",
    "percent",
    "percentage of marks",
    "score percentage",
    "total percentage",
  ],
  cgpa: [
    "cgpa",
    "gpa",
    "cumulative gpa",
    "cgpa score",
    "grade point average",
  ],

  // ==========================================
  // CLASS 10 (SECONDARY) ACADEMICS
  // ==========================================
  class_10_percentage: [
    "10th percentage",
    "class 10 percentage",
    "class x percentage",
    "ssc percentage",
    "matriculation percentage",
    "10th standard percentage",
    "high school percentage",
    "class 10 marks percentage",
    "secondary percentage",
    "10th marks %",
    "10th percent",
  ],
  class_10_marks: [
    "10th marks",
    "class 10 marks",
    "class x marks",
    "ssc marks",
    "matriculation marks",
    "10th total marks",
    "10th marks obtained",
  ],
  class_10_passing_year: [
    "10th passing year",
    "year of passing 10th",
    "class 10 passing year",
    "class x passing year",
    "ssc passing year",
    "matriculation passing year",
    "10th pass year",
    "year of passing class 10",
  ],
  class_10_board: [
    "10th board",
    "class 10 board",
    "class x board",
    "ssc board",
    "matriculation board",
    "board of 10th",
    "10th education board",
    "secondary education board",
  ],
  class_10_roll_number: [
    "10th roll number",
    "class 10 roll number",
    "class x roll number",
    "ssc roll number",
    "matriculation roll no",
    "10th roll no",
  ],
  class_10_school: [
    "10th school",
    "class 10 school",
    "10th school name",
    "high school name",
    "secondary school name",
  ],

  // ==========================================
  // CLASS 12 (HIGHER SECONDARY) ACADEMICS
  // ==========================================
  class_12_percentage: [
    "12th percentage",
    "12th standard percentage",
    "class 12 percentage",
    "class xii percentage",
    "higher secondary percentage",
    "hsc percentage",
    "intermediate percentage",
    "class 12 marks percentage",
    "senior secondary percentage",
    "12th marks %",
    "12th percent",
    "12th score percentage",
    "12th standard marks percentage",
    "intermediate marks percentage",
    "plus two percentage",
    "+2 percentage",
  ],
  class_12_marks: [
    "12th marks",
    "class 12 marks",
    "class xii marks",
    "hsc marks",
    "intermediate marks",
    "12th total marks",
    "12th marks obtained",
    "senior secondary marks",
  ],
  class_12_passing_year: [
    "12th passing year",
    "year of passing 12th",
    "class 12 passing year",
    "class xii passing year",
    "hsc passing year",
    "intermediate passing year",
    "12th pass year",
    "year of passing class 12",
    "senior secondary passing year",
    "year of passing higher secondary",
  ],
  class_12_board: [
    "12th board",
    "class 12 board",
    "class xii board",
    "hsc board",
    "intermediate board",
    "board of 12th",
    "12th education board",
    "senior secondary board",
    "higher secondary board",
    "board of class 12",
  ],
  class_12_stream: [
    "12th stream",
    "class 12 stream",
    "class xii stream",
    "senior secondary stream",
    "higher secondary stream",
    "intermediate stream",
    "12th branch",
    "12th discipline",
    "12th subject stream",
  ],
  class_12_roll_number: [
    "12th roll number",
    "class 12 roll number",
    "class xii roll number",
    "hsc roll number",
    "intermediate roll no",
    "12th roll no",
  ],
  class_12_school: [
    "12th school",
    "class 12 school",
    "12th school name",
    "junior college name",
    "senior secondary school name",
  ],

  // ==========================================
  // GRADUATION / HIGHER EDUCATION
  // ==========================================
  graduation_percentage: [
    "graduation percentage",
    "degree percentage",
    "ug percentage",
    "undergraduate percentage",
    "bachelor percentage",
    "graduation marks percentage",
    "overall degree percentage",
  ],
  graduation_cgpa: [
    "graduation cgpa",
    "degree cgpa",
    "ug cgpa",
    "undergraduate cgpa",
    "bachelor cgpa",
    "degree gpa",
  ],
  graduation_university: [
    "graduation university",
    "degree university",
    "ug university",
    "conferring university",
  ],
  graduation_institution: [
    "graduation college",
    "degree college",
    "ug college",
    "undergraduate institution",
  ],

  // ==========================================
  // FINANCIAL
  // ==========================================
  annual_income: [
    "annual income",
    "family income",
    "annual family income",
    "total family income",
    "parents annual income",
    "family annual income",
    "income",
    "gross annual income",
  ],
  income_certificate_number: [
    "income certificate number",
    "income cert no",
    "aay praman patra no",
    "income certificate serial number",
  ],

  // ==========================================
  // IDENTITY DOCUMENTS
  // ==========================================
  aadhaar_number: [
    "aadhaar",
    "aadhaar number",
    "aadhaar no",
    "aadhar",
    "aadhar number",
    "uidai",
    "unique identification number",
  ],
  pan_number: [
    "pan",
    "pan number",
    "pan card",
    "pan card number",
    "permanent account number",
  ],
  passport_number: [
    "passport",
    "passport number",
    "passport no",
  ],
  voter_id: [
    "voter id",
    "voter card",
    "epic number",
    "election card number",
  ],

  // ==========================================
  // CATEGORY & DOMICILE
  // ==========================================
  category: [
    "category",
    "social category",
    "reservation category",
    "caste category",
    "community category",
  ],
  caste: [
    "caste",
    "sub caste",
    "community",
    "caste name",
  ],
  domicile: [
    "domicile",
    "domicile state",
    "state of domicile",
    "permanent domicile",
    "resident of state",
  ],

  // ==========================================
  // BANK DETAILS
  // ==========================================
  account_holder_name: [
    "account holder name",
    "bank account holder name",
    "name as per bank",
    "beneficiary name",
  ],
  account_number: [
    "bank account",
    "account number",
    "bank account number",
    "savings account number",
    "account no",
    "bank acc no",
  ],
  ifsc: [
    "ifsc",
    "ifsc code",
    "bank ifsc",
    "bank ifsc code",
    "branch ifsc",
  ],
  bank_name: [
    "bank name",
    "name of bank",
    "commercial bank name",
  ],
  branch_name: [
    "bank branch",
    "bank branch name",
    "branch name",
  ],

  // ==========================================
  // CANONICAL DOCUMENT ATTACHMENTS
  // ==========================================
  doc_10th_marksheet: [
    "10th marksheet",
    "class 10 marksheet",
    "high school certificate",
    "secondary marksheet",
    "matriculation certificate",
  ],
  doc_12th_marksheet: [
    "12th marksheet",
    "class 12 marksheet",
    "senior secondary marksheet",
    "intermediate marksheet",
    "higher secondary certificate",
  ],
  doc_degree_certificate: [
    "degree certificate",
    "graduation marksheet",
    "college transcript",
    "provisional degree certificate",
  ],
  doc_income_certificate: [
    "income certificate",
    "income proof",
    "aay praman patra",
    "family income certificate",
  ],
  doc_caste_certificate: [
    "caste certificate",
    "community certificate",
    "jati praman patra",
    "category certificate",
  ],
  doc_domicile_certificate: [
    "domicile certificate",
    "residence certificate",
    "niwas praman patra",
    "resident certificate",
  ],
  doc_aadhaar: [
    "aadhaar card",
    "aadhaar document",
    "aadhar card copy",
    "identity proof",
  ],
  // ==========================================
  // EXTENDED UNIVERSAL PROFILE ALIASES
  // ==========================================
  father_occupation: [
    "father occupation",
    "fathers occupation",
    "father profession",
    "father job",
    "fathers job",
    "occupation of father",
  ],
  father_education: [
    "father education",
    "fathers education",
    "father qualification",
    "fathers qualification",
    "father educational qualification",
  ],
  father_income: [
    "father income",
    "fathers income",
    "father annual income",
    "fathers annual income",
  ],
  mother_occupation: [
    "mother occupation",
    "mothers occupation",
    "mother profession",
    "mother job",
    "mothers job",
  ],
  mother_education: [
    "mother education",
    "mothers education",
    "mother qualification",
    "mothers qualification",
  ],
  mother_income: [
    "mother income",
    "mothers income",
    "mother annual income",
  ],
  current_semester: [
    "current semester",
    "semester",
    "enrolled semester",
    "current sem",
    "present semester",
    "sem",
  ],
  jee_percentile: [
    "jee percentile",
    "jee main percentile",
    "jee score",
    "nta percentile",
    "jee main score",
  ],
  jee_rank: [
    "jee rank",
    "jee air",
    "jee main rank",
    "all india rank jee",
    "jee rank air",
  ],
  gate_score: [
    "gate score",
    "gate rank",
    "gate air",
    "gate marks",
  ],
};

import { cleanFieldLabel, matchCanonicalField } from "./normalize-field-label";

// Inverted lookup map for fast O(1) matching
const ALIAS_LOOKUP = new Map<string, string>();

Object.entries(FIELD_ALIASES_MAP).forEach(([canonicalKey, aliasList]) => {
  aliasList.forEach((alias) => {
    ALIAS_LOOKUP.set(normalizeAliasKey(alias), canonicalKey);
  });
  // Also register canonical key itself
  ALIAS_LOOKUP.set(normalizeAliasKey(canonicalKey), canonicalKey);
});

/**
 * Resolves any raw field string (label, name, id, placeholder) with optional context to its canonical field key
 */
export function resolveCanonicalFieldKey(rawInput: string, contextText: string = ""): string | null {
  if (!rawInput) return null;

  // 1. Context-aware matcher first
  const contextMatch = matchCanonicalField(rawInput, contextText);
  if (contextMatch) {
    return contextMatch;
  }

  // 2. Clean normalizer
  const clean = cleanFieldLabel(rawInput);
  const aliasClean = normalizeAliasKey(clean);

  if (ALIAS_LOOKUP.has(aliasClean)) {
    return ALIAS_LOOKUP.get(aliasClean)!;
  }

  // 3. Fallback substring matching for compound labels (e.g. "Candidate's Full Name (in block letters)")
  for (const [alias, canonicalKey] of ALIAS_LOOKUP.entries()) {
    if (alias.length >= 4 && (aliasClean.includes(alias) || alias.includes(aliasClean))) {
      return canonicalKey;
    }
  }

  return null;
}
