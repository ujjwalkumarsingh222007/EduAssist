/**
 * Smart Normalization Engine for cross-document consistency matching.
 * Handles casing, punctuation, honorifics, initials, whitespace, dates, and numeric/percentage formatting.
 */

// Honorifics commonly found in Indian identity and academic documents
const HONORIFICS_REGEX = /\b(mr|mrs|ms|shri|smt|shrimati|dr|prof|master|kumari|km|late|md)\b\.?/gi;

/**
 * Normalizes general text by trimming, folding case, removing punctuation, and collapsing multiple spaces.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes a person's name for robust comparison by stripping honorifics and cleaning extra tokens.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  const cleaned = String(name)
    .replace(HONORIFICS_REGEX, "")
    .trim();
  return normalizeText(cleaned);
}

/**
 * Splits a normalized name into individual word tokens.
 */
export function getNameTokens(name: string | null | undefined): string[] {
  const norm = normalizeName(name);
  if (!norm) return [];
  return norm.split(" ").filter((t) => t.length > 0);
}

/**
 * Compares two person names and determines whether they match, partially match with initials, or mismatch.
 */
export function compareNames(
  nameA: string | null | undefined,
  nameB: string | null | undefined
): {
  status: "match" | "possible_match" | "mismatch";
  similarity: number; // 0 to 1
  reason: string;
} {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  if (!normA || !normB) {
    return { status: "possible_match", similarity: 0.5, reason: "One of the names is empty or unformatted." };
  }

  // Exact Match after standard normalization & honorific removal
  if (normA === normB) {
    return { status: "match", similarity: 1.0, reason: "Exact name match." };
  }

  const tokensA = getNameTokens(normA);
  const tokensB = getNameTokens(normB);

  // Critical Mismatch Check: Different Last Names / Surnames (e.g. "Sunita Singh" vs "Sunita Devi")
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  if (lastA && lastB && lastA !== lastB && lastA.length > 1 && lastB.length > 1) {
    // If last names are completely different titles (like Singh vs Devi or Sharma vs Verma)
    return {
      status: "mismatch",
      similarity: 0.3,
      reason: `Surname / Title difference detected ('${lastA}' vs '${lastB}').`,
    };
  }

  // Check for subset / initials match (e.g. "Ujjwal K. Singh" vs "Ujjwal Kumar Singh" or "Rohan Sharma" vs "Rohan Kumar Sharma")
  const minLen = Math.min(tokensA.length, tokensB.length);
  const maxLen = Math.max(tokensA.length, tokensB.length);

  let matchScore = 0;
  let hasInitialMatch = false;

  for (let i = 0; i < minLen; i++) {
    const tA = tokensA[i];
    const tB = tokensB[i];

    if (tA === tB) {
      matchScore += 1;
    } else if (
      (tA.length === 1 && tB.startsWith(tA)) ||
      (tB.length === 1 && tA.startsWith(tB))
    ) {
      matchScore += 0.85;
      hasInitialMatch = true;
    }
  }

  // If one has middle name omitted (e.g. "Rohan Sharma" vs "Rohan Kumar Sharma")
  if (tokensA[0] === tokensB[0] && lastA === lastB && Math.abs(tokensA.length - tokensB.length) === 1) {
    return {
      status: "possible_match",
      similarity: 0.75,
      reason: "Names match on first and last name, but one name omits the middle name.",
    };
  }

  const ratio = matchScore / maxLen;

  if (ratio >= 0.9) {
    return { status: "match", similarity: ratio, reason: "Names match with minor formatting variations." };
  }

  if (ratio >= 0.5 || hasInitialMatch) {
    return {
      status: "possible_match",
      similarity: ratio,
      reason: "Names share significant parts with abbreviations or initials.",
    };
  }

  return {
    status: "mismatch",
    similarity: ratio,
    reason: "Distinct first, middle, or last names detected across documents.",
  };
}

/**
 * Normalizes dates to ISO YYYY-MM-DD format for exact comparison.
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();

  // If already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Textual date e.g. "15 August 2008" or "15 Aug 2008" or "Aug 15, 2008"
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Compares two dates deterministically.
 */
export function compareDates(
  dateA: string | null | undefined,
  dateB: string | null | undefined
): {
  status: "match" | "mismatch" | "unparseable";
  isoA: string | null;
  isoB: string | null;
  reason: string;
} {
  const isoA = normalizeDate(dateA);
  const isoB = normalizeDate(dateB);

  if (!isoA || !isoB) {
    return { status: "unparseable", isoA, isoB, reason: "Could not parse one or both dates to standard format." };
  }

  if (isoA === isoB) {
    return { status: "match", isoA, isoB, reason: `Exact date match (${isoA}).` };
  }

  return { status: "mismatch", isoA, isoB, reason: `Date mismatch: ${isoA} vs ${isoB}.` };
}

/**
 * Normalizes numeric scores, percentages, and financial values.
 * Handles "91.4%", "91.40%", "457/500", "₹2,50,000", "250000".
 */
export function normalizeNumericValue(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;

  const str = String(val).replace(/[\u20B9,$\s%]/g, "").trim();

  // Handle fraction "457/500"
  const fractionMatch = str.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den > 0) return (num / den) * 100;
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Compares numeric values deterministically with tolerance (e.g. for rounding 91.4% vs 91.40%).
 */
export function compareNumerics(
  numA: string | number | null | undefined,
  numB: string | number | null | undefined
): {
  status: "match" | "mismatch";
  valA: number | null;
  valB: number | null;
  reason: string;
} {
  const vA = normalizeNumericValue(numA);
  const vB = normalizeNumericValue(numB);

  if (vA === null || vB === null) {
    return { status: "match", valA: vA, valB: vB, reason: "Non-numeric or empty value." };
  }

  // Tolerance of 0.05 for minor rounding differences
  const diff = Math.abs(vA - vB);
  if (diff < 0.05) {
    return { status: "match", valA: vA, valB: vB, reason: `Numeric values match (${vA} vs ${vB}).` };
  }

  return { status: "mismatch", valA: vA, valB: vB, reason: `Numeric discrepancy: ${vA} vs ${vB}.` };
}

/**
 * Normalizes academic and identification numbers (Roll numbers, Aadhaar, Registration No).
 */
export function normalizeIdentifier(val: string | number | null | undefined): string {
  if (!val) return "";
  return String(val)
    .replace(/[\s\-_/]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Compares two identifiers.
 */
export function compareIdentifiers(
  idA: string | number | null | undefined,
  idB: string | number | null | undefined
): {
  status: "match" | "mismatch";
  reason: string;
} {
  const normA = normalizeIdentifier(idA);
  const normB = normalizeIdentifier(idB);

  if (!normA || !normB) {
    return { status: "match", reason: "Identifier not present in both documents." };
  }

  if (normA === normB) {
    return { status: "match", reason: "Exact identifier match." };
  }

  return { status: "mismatch", reason: `Identifier mismatch (${normA} vs ${normB}).` };
}
