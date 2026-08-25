import { CANONICAL_FIELD_DICTIONARY, CanonicalFieldDefinition } from "./field-schema";
import { FIELD_ALIASES_MAP, normalizeAliasKey } from "./field-aliases";

export interface DeclarationRequirement {
  label: string;
  canonical_field: string;
  display_name: string;
}

export interface SemanticMatchResult {
  canonical_field: string | null;
  canonical_display_name: string;
  confidence: number;
  source: "alias" | "semantic_local" | "ai_fallback" | "user_controlled" | "file_upload" | "declaration" | "unknown";
  needs_confirmation: boolean;
  is_declaration?: boolean;
  declaration_requirements?: DeclarationRequirement[];
  reason?: string;
}

export interface FieldMetadataInput {
  field_id?: string;
  label?: string;
  raw_label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  aria_label?: string;
  element_type?: string;
  input_type?: string;
  section_context?: string;
  options?: string[];
  required?: boolean;
}

// Inverted lookup map for O(1) Level 1 Exact Matching
const EXACT_ALIAS_MAP = new Map<string, string>();
Object.entries(FIELD_ALIASES_MAP).forEach(([canonicalKey, aliasList]) => {
  aliasList.forEach((alias) => {
    EXACT_ALIAS_MAP.set(normalizeAliasKey(alias), canonicalKey);
  });
  EXACT_ALIAS_MAP.set(normalizeAliasKey(canonicalKey), canonicalKey);
});

/**
 * Multi-requirement declaration analyzer.
 * Detects if a label is a compound eligibility declaration / legal statement.
 */
export function analyzeDeclarationStatement(text: string): {
  isDeclaration: boolean;
  requirements: DeclarationRequirement[];
} {
  const norm = text.toLowerCase();
  const isDecl =
    norm.includes("i confirm") ||
    norm.includes("i declare") ||
    norm.includes("i hereby") ||
    norm.includes("i certify") ||
    norm.includes("declaration") ||
    norm.includes("terms and conditions") ||
    norm.includes("undertaking") ||
    (norm.length > 60 && (norm.includes("citizen") || norm.includes("passed") || norm.includes("eligible")));

  if (!isDecl) {
    return { isDeclaration: false, requirements: [] };
  }

  const requirements: DeclarationRequirement[] = [];

  // Check 1: Citizenship
  if (norm.includes("citizen") || norm.includes("indian citizen") || norm.includes("nationality")) {
    requirements.push({
      label: "Indian Citizenship",
      canonical_field: "nationality",
      display_name: "Citizenship / Nationality",
    });
  }

  // Check 2: Domicile / Residence
  if (norm.includes("residing in india") || norm.includes("resident") || norm.includes("domicile")) {
    requirements.push({
      label: "Residence in India / State Domicile",
      canonical_field: "domicile",
      display_name: "State / Country Domicile",
    });
  }

  // Check 3: Class 12 / Higher Secondary Qualification
  if (
    norm.includes("class 12") ||
    norm.includes("class xii") ||
    norm.includes("hsc") ||
    norm.includes("12th") ||
    norm.includes("intermediate") ||
    norm.includes("higher secondary")
  ) {
    requirements.push({
      label: "Passed Class 12 / Higher Secondary Qualification",
      canonical_field: "class_12_percentage",
      display_name: "Class 12 Qualification",
    });
  }

  // Check 4: Class 10 / Secondary Qualification
  if (
    norm.includes("class 10") ||
    norm.includes("class x") ||
    norm.includes("ssc") ||
    norm.includes("10th") ||
    norm.includes("matriculation")
  ) {
    requirements.push({
      label: "Passed Class 10 / Secondary Qualification",
      canonical_field: "class_10_percentage",
      display_name: "Class 10 Qualification",
    });
  }

  // Check 5: Annual Family Income Eligibility
  if (norm.includes("income") || norm.includes("lakh") || norm.includes("annual family income")) {
    requirements.push({
      label: "Family Income Limit Requirement",
      canonical_field: "annual_income",
      display_name: "Annual Family Income",
    });
  }

  // Check 6: Category / Reservation
  if (norm.includes("category") || norm.includes("caste") || norm.includes("sc/st") || norm.includes("obc") || norm.includes("ews")) {
    requirements.push({
      label: "Social Category / Reservation Criteria",
      canonical_field: "category",
      display_name: "Social Category",
    });
  }

  return { isDeclaration: true, requirements };
}

/**
 * LEVEL 1 & LEVEL 2: Deterministic Local Semantic Matcher.
 * Matches aliases, keywords, compound questions, and declarations.
 */
export function matchFieldLocally(field: FieldMetadataInput): SemanticMatchResult {
  const normLabel = normalizeAliasKey(field.label || "");
  const normName = normalizeAliasKey(field.name || "");
  const normId = normalizeAliasKey(field.id || "");
  const normPlaceholder = normalizeAliasKey(field.placeholder || "");
  const normContext = normalizeAliasKey(field.section_context || "");
  const fullText = `${normLabel} ${normName} ${normId} ${normPlaceholder} ${normContext}`.trim();

  // 1. Guard against File Uploads
  if (field.element_type === "file" || field.input_type === "file") {
    return {
      canonical_field: null,
      canonical_display_name: "📄 Document upload detected",
      confidence: 1.0,
      source: "file_upload",
      needs_confirmation: false,
    };
  }

  // 2. Guard against CAPTCHA / OTP / Security (User Controlled)
  const securityKeywords = ["captcha", "security code", "security pin", "verification code", "otp", "one time password"];
  for (const kw of securityKeywords) {
    if (fullText.includes(kw)) {
      return {
        canonical_field: null,
        canonical_display_name: "🔒 User controlled",
        confidence: 1.0,
        source: "user_controlled",
        needs_confirmation: false,
      };
    }
  }

  // 3. Multi-Requirement Declaration Analysis
  const declAnalysis = analyzeDeclarationStatement(field.label || field.placeholder || "");
  if (declAnalysis.isDeclaration) {
    return {
      canonical_field: null,
      canonical_display_name: "⚖ Declaration • User confirmation required",
      confidence: 1.0,
      source: "declaration",
      needs_confirmation: true,
      is_declaration: true,
      declaration_requirements: declAnalysis.requirements,
      reason: "Legal declaration / terms checkbox requires explicit user review",
    };
  }

  // 4. LEVEL 1: Exact Alias Matching
  const candidates = [normLabel, normName, normId, normPlaceholder].filter(Boolean);
  for (const c of candidates) {
    if (EXACT_ALIAS_MAP.has(c)) {
      const canonicalKey = EXACT_ALIAS_MAP.get(c)!;
      const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
      return {
        canonical_field: canonicalKey,
        canonical_display_name: def ? def.label : canonicalKey,
        confidence: 0.99,
        source: "alias",
        needs_confirmation: false,
      };
    }
  }

  // 5. LEVEL 2: Local Semantic & Keyword Matching

  // --- Class 12 / Higher Secondary (HSC / Intermediate) ---
  const is12th =
    fullText.includes("12th") ||
    fullText.includes("class 12") ||
    fullText.includes("class xii") ||
    fullText.includes("higher secondary") ||
    fullText.includes("hsc") ||
    fullText.includes("intermediate") ||
    fullText.includes("senior secondary") ||
    fullText.includes("plus two") ||
    fullText.includes("+2");

  if (is12th) {
    if (fullText.includes("percent") || fullText.includes("marks %") || fullText.includes("score") || (fullText.includes("marks") && !fullText.includes("total") && !fullText.includes("max"))) {
      return {
        canonical_field: "class_12_percentage",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_percentage"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        reason: "Detected Class 12 percentage inquiry",
      };
    }
    if (fullText.includes("total marks") || fullText.includes("marks obtained") || fullText.includes("max marks")) {
      return {
        canonical_field: "class_12_marks",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_marks"].label,
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("year") || fullText.includes("passing") || fullText.includes("passed in")) {
      return {
        canonical_field: "class_12_passing_year",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_passing_year"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("board") || fullText.includes("council")) {
      return {
        canonical_field: "class_12_board",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_board"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("stream") || fullText.includes("branch") || fullText.includes("discipline") || fullText.includes("subject")) {
      return {
        canonical_field: "class_12_stream",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_stream"].label,
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("roll") || fullText.includes("roll no")) {
      return {
        canonical_field: "class_12_roll_number",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_roll_number"].label,
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("school") || fullText.includes("college") || fullText.includes("institution")) {
      return {
        canonical_field: "class_12_school",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_12_school"].label,
        confidence: 0.95,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
  }

  // --- Class 10 / Secondary (SSC / Matriculation) ---
  const is10th =
    fullText.includes("10th") ||
    fullText.includes("class 10") ||
    fullText.includes("class x") ||
    fullText.includes("secondary") ||
    fullText.includes("ssc") ||
    fullText.includes("matriculation") ||
    fullText.includes("high school");

  if (is10th && !is12th) {
    if (fullText.includes("percent") || fullText.includes("marks %") || fullText.includes("score")) {
      return {
        canonical_field: "class_10_percentage",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_10_percentage"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("total marks") || fullText.includes("marks obtained")) {
      return {
        canonical_field: "class_10_marks",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_10_marks"].label,
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("year") || fullText.includes("passing") || fullText.includes("passed in")) {
      return {
        canonical_field: "class_10_passing_year",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_10_passing_year"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("board") || fullText.includes("council")) {
      return {
        canonical_field: "class_10_board",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_10_board"].label,
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("roll") || fullText.includes("roll no")) {
      return {
        canonical_field: "class_10_roll_number",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["class_10_roll_number"].label,
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
  }

  // --- Nationality / Citizenship ---
  if (
    fullText.includes("indian citizen") ||
    fullText.includes("citizen of india") ||
    fullText.includes("citizenship") ||
    fullText.includes("nationality") ||
    fullText.includes("are you an indian")
  ) {
    return {
      canonical_field: "nationality",
      canonical_display_name: CANONICAL_FIELD_DICTIONARY["nationality"].label,
      confidence: 0.98,
      source: "semantic_local",
      needs_confirmation: false,
    };
  }

  // --- Domicile / State of Residence ---
  if (
    fullText.includes("state of domicile") ||
    fullText.includes("domicile state") ||
    fullText.includes("resident state") ||
    fullText.includes("state of residence") ||
    fullText.includes("permanent state") ||
    fullText.includes("domicile district") ||
    fullText.includes("domicile")
  ) {
    return {
      canonical_field: "domicile",
      canonical_display_name: CANONICAL_FIELD_DICTIONARY["domicile"].label,
      confidence: 0.96,
      source: "semantic_local",
      needs_confirmation: false,
    };
  }

  // --- Category / Social Classification ---
  if (
    fullText.includes("belong to") ||
    fullText.includes("social category") ||
    fullText.includes("reservation category") ||
    fullText.includes("caste category") ||
    fullText.includes("community category") ||
    fullText.includes("caste") ||
    fullText.includes("category")
  ) {
    return {
      canonical_field: "category",
      canonical_display_name: CANONICAL_FIELD_DICTIONARY["category"].label,
      confidence: 0.95,
      source: "semantic_local",
      needs_confirmation: false,
    };
  }

  // --- Annual / Family Income ---
  if (
    fullText.includes("annual income") ||
    fullText.includes("family income") ||
    fullText.includes("familys annual income") ||
    fullText.includes("parents annual income") ||
    fullText.includes("gross family income") ||
    fullText.includes("total annual income")
  ) {
    return {
      canonical_field: "annual_income",
      canonical_display_name: CANONICAL_FIELD_DICTIONARY["annual_income"].label,
      confidence: 0.98,
      source: "semantic_local",
      needs_confirmation: false,
    };
  }

  // --- Graduation / Undergrad ---
  if (fullText.includes("graduation") || fullText.includes("bachelor") || fullText.includes("undergraduate") || fullText.includes("degree")) {
    if (fullText.includes("percent") || fullText.includes("marks %")) {
      return {
        canonical_field: "graduation_percentage",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["graduation_percentage"].label,
        confidence: 0.95,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("cgpa") || fullText.includes("gpa")) {
      return {
        canonical_field: "graduation_cgpa",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["graduation_cgpa"].label,
        confidence: 0.95,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
    if (fullText.includes("year") || fullText.includes("passing")) {
      return {
        canonical_field: "graduation_year",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["graduation_year"].label,
        confidence: 0.95,
        source: "semantic_local",
        needs_confirmation: false,
      };
    }
  }

  // --- Fallback Substring Alias Check ---
  for (const [alias, canonicalKey] of EXACT_ALIAS_MAP.entries()) {
    if (alias.length >= 4 && (normLabel.includes(alias) || alias.includes(normLabel))) {
      const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
      return {
        canonical_field: canonicalKey,
        canonical_display_name: def ? def.label : canonicalKey,
        confidence: 0.88,
        source: "alias",
        needs_confirmation: false,
      };
    }
  }

  // 6. Unknown / Low Confidence Local Result
  return {
    canonical_field: null,
    canonical_display_name: "Unmapped Field",
    confidence: 0.3,
    source: "unknown",
    needs_confirmation: true,
  };
}
