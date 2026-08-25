/**
 * Universal Field Label & Abbreviation Normalizer
 *
 * Provides deterministic, context-aware normalization of website form field labels,
 * placeholders, OCR text, and abbreviations into canonical profile field keys.
 */

// Common noise/harmless words stripped before alias matching
const NOISE_WORDS = new Set([
  "enter",
  "please",
  "your",
  "applicant",
  "applicants",
  "candidate",
  "candidates",
  "student",
  "students",
  "name of",
  "official",
  "legal",
  "complete",
  "as per aadhaar",
  "as per id",
  "as on certificate",
  "as on marksheet",
  "registered",
  "current",
  "valid",
  "permanent",
  "mandatory",
  "optional",
  "(optional)",
  "(mandatory)",
  "(required)",
  "*",
  ":",
]);

// Common abbreviation dictionary
const ABBREVIATIONS_MAP: Record<string, string> = {
  dob: "date of birth",
  "d.o.b": "date of birth",
  "d o b": "date of birth",
  "d-o-b": "date of birth",
  birthdate: "date of birth",
  birth_date: "date of birth",

  mob: "mobile",
  "mob no": "mobile number",
  "mob. no.": "mobile number",
  ph: "phone",
  "ph no": "phone number",
  "ph. no.": "phone number",
  tel: "telephone",
  "contact no": "contact number",
  "mobile no": "mobile number",
  "phone no": "phone number",
  "email id": "email",
  "mail id": "email",
  "e-mail": "email",
  "e mail": "email",

  pin: "pincode",
  "pin code": "pincode",
  "postal code": "pincode",
  zip: "pincode",
  "zip code": "pincode",
  "post code": "pincode",

  "reg no": "registration number",
  "reg. no.": "registration number",
  "roll no": "roll number",
  "roll. no.": "roll number",
  "roll#": "roll number",
  "enr no": "enrollment number",
  "enr. no.": "enrollment number",
  "app no": "application number",
  "app. no.": "application number",

  "10th": "class 10",
  "class x": "class 10",
  xth: "class 10",
  ssc: "class 10",
  matric: "class 10",
  matriculation: "class 10",
  "high school": "class 10",

  "12th": "class 12",
  "class xii": "class 12",
  xiith: "class 12",
  hsc: "class 12",
  "higher secondary": "class 12",
  "senior secondary": "class 12",
  intermediate: "class 12",
  "plus two": "class 12",
  "+2": "class 12",

  univ: "university",
  inst: "institution",
  dept: "department",
  prog: "program",
  cert: "certificate",
  doc: "document",
  addr: "address",
  dist: "district",
  cty: "city",
  pct: "percentage",
  percent: "percentage",
  "%": "percentage",
  cgpa: "cgpa",
  "c.g.p.a.": "cgpa",
  gpa: "cgpa",
};

/**
 * Standard string normalization: removes punctuation, apostrophes, hyphens, and noise words.
 */
export function cleanFieldLabel(label: string): string {
  if (!label) return "";

  let cleaned = label
    .toLowerCase()
    .replace(/['’`"]/g, "") // remove apostrophes
    .replace(/[–—_/-]/g, " ") // replace hyphens and underscores with spaces
    .replace(/[^a-z0-9\s%]/g, " ") // replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();

  // Strip noise words
  const words = cleaned.split(" ");
  const filtered = words.filter((w) => !NOISE_WORDS.has(w));
  cleaned = filtered.join(" ").trim();

  // Check abbreviation replacements
  if (ABBREVIATIONS_MAP[cleaned]) {
    cleaned = ABBREVIATIONS_MAP[cleaned];
  }

  return cleaned;
}

/**
 * Context-Aware Field Matcher
 * Uses field label + surrounding context (section title, parent form legend, placeholder, input name)
 * to accurately resolve canonical field keys.
 */
export function matchCanonicalField(
  label: string,
  contextText: string = ""
): string | null {
  const normLabel = cleanFieldLabel(label);
  const normContext = cleanFieldLabel(contextText);
  const combined = `${normContext} ${normLabel}`.toLowerCase();

  // 1. Context-Aware Disambiguation for Generic "Name" / "F Name" / "M Name"
  if (
    normLabel === "name" ||
    normLabel === "full name" ||
    normLabel === "f name" ||
    normLabel === "first name" ||
    normLabel === "m name" ||
    normLabel === "middle name" ||
    normLabel === "given name"
  ) {
    if (combined.includes("father") || combined.includes("parent")) {
      return "father_name";
    }
    if (combined.includes("mother")) {
      return "mother_name";
    }
    if (combined.includes("guardian")) {
      return "guardian_name";
    }
    if (normLabel === "f name" || normLabel === "first name" || normLabel === "given name") {
      return "first_name";
    }
    if (normLabel === "m name" || normLabel === "middle name") {
      return "middle_name";
    }
    return "full_name";
  }

  // 2. Context-Aware Disambiguation for Generic "Roll Number"
  if (normLabel === "roll number" || normLabel === "roll no" || normLabel === "exam roll number") {
    if (combined.includes("12") || combined.includes("higher secondary") || combined.includes("senior secondary") || combined.includes("hsc") || combined.includes("intermediate") || combined.includes("plus two")) {
      return "class_12_roll_number";
    }
    if (combined.includes("10") || (combined.includes("secondary") && !combined.includes("higher") && !combined.includes("senior")) || combined.includes("ssc") || combined.includes("matric")) {
      return "class_10_roll_number";
    }
    if (combined.includes("university") || combined.includes("college") || combined.includes("graduation")) {
      return "roll_number";
    }
    return "roll_number";
  }

  // 3. Context-Aware Disambiguation for Generic "Percentage" / "Marks"
  if (normLabel === "percentage" || normLabel === "marks" || normLabel === "aggregate percentage" || normLabel === "score") {
    if (combined.includes("12") || combined.includes("higher secondary") || combined.includes("senior secondary") || combined.includes("hsc") || combined.includes("intermediate") || combined.includes("plus two")) {
      return "class_12_percentage";
    }
    if (combined.includes("10") || (combined.includes("secondary") && !combined.includes("higher") && !combined.includes("senior")) || combined.includes("ssc") || combined.includes("matric")) {
      return "class_10_percentage";
    }
    if (combined.includes("graduation") || combined.includes("university") || combined.includes("degree")) {
      return "percentage";
    }
  }

  // 4. Context-Aware Disambiguation for Generic "Board"
  if (normLabel === "board" || normLabel === "education board" || normLabel === "board name") {
    if (combined.includes("12") || combined.includes("higher secondary") || combined.includes("senior secondary") || combined.includes("hsc") || combined.includes("intermediate") || combined.includes("plus two")) {
      return "class_12_board";
    }
    if (combined.includes("10") || (combined.includes("secondary") && !combined.includes("higher") && !combined.includes("senior")) || combined.includes("ssc") || combined.includes("matric")) {
      return "class_10_board";
    }
    return "class_12_board";
  }

  // 5. Context-Aware Disambiguation for Generic "Passing Year" / "Year"
  if (normLabel === "passing year" || normLabel === "year of passing" || normLabel === "year") {
    if (combined.includes("12") || combined.includes("higher secondary") || combined.includes("senior secondary") || combined.includes("hsc") || combined.includes("intermediate") || combined.includes("plus two")) {
      return "class_12_passing_year";
    }
    if (combined.includes("10") || (combined.includes("secondary") && !combined.includes("higher") && !combined.includes("senior")) || combined.includes("ssc")) {
      return "class_10_passing_year";
    }
    if (combined.includes("graduation") || combined.includes("college") || combined.includes("degree")) {
      return "graduation_year";
    }
  }

  // 6. Direct Matches
  if (
    normLabel === "date of birth" ||
    normLabel === "dob" ||
    normLabel.startsWith("dob ") ||
    normLabel.includes("birth date")
  ) {
    return "date_of_birth";
  }

  if (normLabel === "father name" || normLabel === "fathers name" || normLabel === "father full name") {
    return "father_name";
  }

  if (normLabel === "mother name" || normLabel === "mothers name" || normLabel === "mother full name") {
    return "mother_name";
  }

  if (normLabel === "guardian name" || normLabel === "guardians name" || normLabel === "legal guardian") {
    return "guardian_name";
  }

  if (
    normLabel === "mobile" ||
    normLabel === "mobile number" ||
    normLabel === "phone" ||
    normLabel === "phone number" ||
    normLabel === "contact number" ||
    normLabel === "contact no"
  ) {
    return "phone";
  }

  if (normLabel === "email" || normLabel === "email address" || normLabel === "e mail") {
    return "email";
  }

  if (normLabel === "pincode" || normLabel === "pin code" || normLabel === "postal code" || normLabel === "zip code") {
    return "pincode";
  }

  if (normLabel === "city" || normLabel === "city name" || normLabel === "town") {
    return "city";
  }

  if (normLabel === "district" || normLabel === "district name") {
    return "district";
  }

  if (normLabel === "state" || normLabel === "state name" || normLabel === "state ut") {
    return "state";
  }

  if (normLabel === "gender" || normLabel === "sex") {
    return "gender";
  }

  if (normLabel === "nationality" || normLabel === "citizenship") {
    return "nationality";
  }

  if (normLabel === "category" || normLabel === "social category" || normLabel === "caste category" || normLabel === "caste") {
    return "category";
  }

  if (normLabel === "father occupation" || normLabel === "fathers occupation" || normLabel === "father profession") {
    return "father_occupation";
  }

  if (normLabel === "father education" || normLabel === "fathers education" || normLabel === "father qualification") {
    return "father_education";
  }

  if (normLabel === "mother occupation" || normLabel === "mothers occupation" || normLabel === "mother profession") {
    return "mother_occupation";
  }

  if (normLabel === "mother education" || normLabel === "mothers education" || normLabel === "mother qualification") {
    return "mother_education";
  }

  if (
    normLabel === "annual income" ||
    normLabel === "family income" ||
    normLabel === "annual family income" ||
    normLabel === "household income"
  ) {
    return "annual_income";
  }

  if (normLabel === "cgpa" || normLabel === "cumulative gpa" || normLabel === "gpa") {
    return "cgpa";
  }

  if (normLabel === "university" || normLabel === "university name") {
    return "university";
  }

  if (normLabel === "college" || normLabel === "college name" || normLabel === "institution" || normLabel === "institution name") {
    return "institution";
  }

  if (normLabel === "degree" || normLabel === "degree name" || normLabel === "qualification") {
    return "degree";
  }

  if (normLabel === "course" || normLabel === "course name" || normLabel === "program" || normLabel === "program name") {
    return "course";
  }

  if (normLabel === "branch" || normLabel === "stream" || normLabel === "major" || normLabel === "specialization") {
    return "branch";
  }

  return null;
}
