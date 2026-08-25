import { StructuredRequirementRule } from "@/lib/opportunities/types";
import { GoogleGenAI } from "@google/genai";

/**
 * Deterministic Regex Parser: Converts common Indian scholarship and internship
 * requirement patterns into structured rules with zero latency and zero API calls.
 */
export function parseRequirementsLocally(text: string): StructuredRequirementRule[] {
  const rules: StructuredRequirementRule[] = [];
  const lower = (text || "").toLowerCase();

  // 1. Class 12 Percentage (e.g. "at least 85% in Class 12" or "12th percentage >= 80%")
  const match12 =
    lower.match(/(?:class\s*12|12th|hsc|intermediate|higher\s*secondary)[^.%\n]*?(?:at\s*least|minimum|>=|of|with|scoring)?\s*(\d{1,2}(?:\.\d+)?)\s*%/i) ||
    lower.match(/(?:minimum|at\s*least|>=)\s*(\d{1,2}(?:\.\d+)?)\s*%\s*(?:in|for)?\s*(?:class\s*12|12th|hsc|intermediate)/i);
  if (match12 && match12[1]) {
    rules.push({
      field: "class_12_percentage",
      operator: ">=",
      value: parseFloat(match12[1]),
      required: true,
      label: "Class 12 Percentage",
      description: `Minimum ${match12[1]}% in Class 12 / Higher Secondary`,
    });
  }

  // 2. Class 10 Percentage (e.g. "at least 75% in 10th")
  const match10 =
    lower.match(/(?:class\s*10|10th|ssc|matriculation)[^.%\n]*?(?:at\s*least|minimum|>=|of|with|scoring)?\s*(\d{1,2}(?:\.\d+)?)\s*%/i) ||
    lower.match(/(?:minimum|at\s*least|>=)\s*(\d{1,2}(?:\.\d+)?)\s*%\s*(?:in|for)?\s*(?:class\s*10|10th|ssc)/i);
  if (match10 && match10[1]) {
    rules.push({
      field: "class_10_percentage",
      operator: ">=",
      value: parseFloat(match10[1]),
      required: true,
      label: "Class 10 Percentage",
      description: `Minimum ${match10[1]}% in Class 10 / SSC`,
    });
  }

  // 3. Minimum CGPA (e.g. "minimum CGPA of 7.5" or "CGPA >= 8.0")
  const matchCgpa = lower.match(/(?:cgpa|gpa)\s*(?:of|at\s*least|minimum|>=)?\s*(\d(?:\.\d+)?)/i);
  if (matchCgpa && matchCgpa[1]) {
    rules.push({
      field: "cgpa",
      operator: ">=",
      value: parseFloat(matchCgpa[1]),
      required: true,
      label: "Minimum CGPA",
      description: `Minimum CGPA of ${matchCgpa[1]}`,
    });
  }

  // 4. Family Income Cap (e.g. "family income less than ₹4,50,000" or "income <= 250000")
  const matchIncome = lower.match(/(?:income|family\s*income|annual\s*income)[^0-9\n]*?(?:less\s*than|below|not\s*exceeding|under|<=|<)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/i);
  if (matchIncome && matchIncome[1]) {
    const cleanNum = parseInt(matchIncome[1].replace(/,/g, ""), 10);
    if (!isNaN(cleanNum) && cleanNum >= 50000) {
      rules.push({
        field: "family_income",
        operator: "<=",
        value: cleanNum,
        required: true,
        label: "Annual Family Income",
        description: `Annual family income must not exceed ₹${cleanNum.toLocaleString("en-IN")}`,
      });
    }
  }

  // 5. Gender Restrictions (e.g. "Only for female students" or "for girl students")
  if (lower.includes("female") || lower.includes("girl") || lower.includes("women")) {
    rules.push({
      field: "gender",
      operator: "==",
      value: "Female",
      required: true,
      label: "Gender Restriction",
      description: "Restricted to Female candidates",
    });
  }

  // 6. Branch / Major (e.g. "Computer Science", "Information Technology", "Electronics", "Mechanical")
  const branches: string[] = [];
  if (lower.includes("computer science") || lower.includes("cse") || lower.includes("software")) branches.push("computer science");
  if (lower.includes("information technology") || lower.includes("it")) branches.push("information technology");
  if (lower.includes("electronics") || lower.includes("ece") || lower.includes("electrical")) branches.push("electronics");
  if (lower.includes("mechanical")) branches.push("mechanical");
  if (lower.includes("civil")) branches.push("civil");
  if (lower.includes("data science") || lower.includes("artificial intelligence") || lower.includes("ai/ml")) branches.push("data science");

  if (branches.length > 0) {
    rules.push({
      field: "branch",
      operator: "contains",
      value: branches,
      required: true,
      label: "Eligible Engineering / Study Branches",
      description: `Eligible branches: ${branches.join(", ")}`,
    });
  }

  // 7. Degree (e.g. "B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "MCA")
  const degrees: string[] = [];
  if (lower.includes("b.tech") || lower.includes("btech") || lower.includes("b.e.") || lower.includes("be") || lower.includes("engineering")) degrees.push("b.tech");
  if (lower.includes("b.sc") || lower.includes("bsc")) degrees.push("b.sc");
  if (lower.includes("bca")) degrees.push("bca");
  if (lower.includes("m.tech") || lower.includes("mtech") || lower.includes("m.e.")) degrees.push("m.tech");
  if (lower.includes("mca")) degrees.push("mca");

  if (degrees.length > 0) {
    rules.push({
      field: "degree",
      operator: "contains",
      value: degrees,
      required: true,
      label: "Degree Level",
      description: `Eligible degrees: ${degrees.join(", ")}`,
    });
  }

  // 8. Domicile / State (e.g. "Resident of Uttar Pradesh", "Delhi domicile")
  const states = [
    "delhi", "uttar pradesh", "maharashtra", "karnataka", "tamil nadu",
    "telangana", "andhra pradesh", "gujarat", "rajasthan", "madhya pradesh",
    "bihar", "west bengal", "kerala", "punjab", "haryana", "odisha"
  ];
  for (const st of states) {
    if (lower.includes(`resident of ${st}`) || lower.includes(`${st} domicile`) || lower.includes(`from ${st}`)) {
      rules.push({
        field: "domicile",
        operator: "==",
        value: st.replace(/\b\w/g, (c) => c.toUpperCase()),
        required: true,
        label: "State of Domicile",
        description: `Must be a permanent resident of ${st.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      });
    }
  }

  // 9. Reservation Category (e.g. "SC/ST students", "OBC category")
  const categories: string[] = [];
  if (lower.includes("sc") || lower.includes("scheduled caste")) categories.push("SC");
  if (lower.includes("st") || lower.includes("scheduled tribe")) categories.push("ST");
  if (lower.includes("obc") || lower.includes("other backward")) categories.push("OBC");
  if (lower.includes("ews") || lower.includes("economically weaker")) categories.push("EWS");

  if (categories.length > 0 && !lower.includes("all categories") && !lower.includes("general")) {
    rules.push({
      field: "category",
      operator: "in",
      value: categories,
      required: true,
      label: "Social Category",
      description: `Eligible categories: ${categories.join(", ")}`,
    });
  }

  return rules;
}

/**
 * AI Requirement Reader Fallback using Gemini:
 * Converts unstructured natural-language text into structured JSON rules.
 * Strictly zero student PII or profile data is sent.
 */
export async function parseRequirementsWithAI(text: string): Promise<StructuredRequirementRule[]> {
  const localRules = parseRequirementsLocally(text);
  if (localRules.length >= 2) {
    return localRules;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text || text.trim().length < 15) {
    return localRules;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a strict eligibility requirement parser for Indian scholarships and internships.
Convert the following unstructured eligibility criteria text into structured rule definitions.

CRITERIA TEXT:
"""${text.substring(0, 1000)}"""

Respond ONLY with valid JSON array of objects adhering to this schema:
[
  {
    "field": "class_12_percentage" | "class_10_percentage" | "cgpa" | "percentage" | "degree" | "branch" | "family_income" | "gender" | "domicile" | "category" | "graduation_year",
    "operator": ">=" | "<=" | "==" | "!=" | "contains" | "in",
    "value": number | string | string[],
    "required": true,
    "label": "Human readable label",
    "description": "Brief description"
  }
]

If no specific rules can be extracted, return []`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const rawText = response.text || "[]";
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("[SEA Requirement Parser] AI fallback error, using local rules:", err);
  }

  return localRules;
}
