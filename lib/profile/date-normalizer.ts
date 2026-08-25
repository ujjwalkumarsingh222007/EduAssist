const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Parses any supported date string into canonical ISO format (YYYY-MM-DD)
 */
export function parseToCanonicalIsoDate(rawDate: string): string | null {
  if (!rawDate || typeof rawDate !== "string") return null;

  const clean = rawDate.trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. Standard Indian / European format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Short year format: DD/MM/YY
  const shortMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (shortMatch) {
    const d = shortMatch[1].padStart(2, "0");
    const m = shortMatch[2].padStart(2, "0");
    const yr = parseInt(shortMatch[3], 10);
    const y = yr > 40 ? `19${shortMatch[3]}` : `20${shortMatch[3]}`;
    return `${y}-${m}-${d}`;
  }

  // 4. Text format: "February 2, 2007" or "2 February 2007" or "02-Feb-2007"
  const parsedDate = new Date(clean);
  if (!isNaN(parsedDate.getTime())) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const d = String(parsedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Formats a canonical ISO date (YYYY-MM-DD) into the format expected by a target website
 */
export function formatCanonicalDate(
  isoDate: string,
  targetFormat: string = "YYYY-MM-DD"
): string {
  const canonical = parseToCanonicalIsoDate(isoDate);
  if (!canonical) return isoDate;

  const [y, m, d] = canonical.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || "";
  const monthAbbr = MONTH_ABBRS[monthIdx] || "";
  const shortYear = y.slice(2);
  const dayWithoutLeadingZero = String(parseInt(d, 10));

  const cleanFormat = targetFormat.trim().toUpperCase();

  switch (cleanFormat) {
    case "DD/MM/YYYY":
    case "DD/MM/YY":
      return `${d}/${m}/${cleanFormat === "DD/MM/YY" ? shortYear : y}`;

    case "DD-MM-YYYY":
    case "DD-MM-YY":
      return `${d}-${m}-${cleanFormat === "DD-MM-YY" ? shortYear : y}`;

    case "MM/DD/YYYY":
    case "MM/DD/YY":
      return `${m}/${d}/${cleanFormat === "MM/DD/YY" ? shortYear : y}`;

    case "MM-DD-YYYY":
      return `${m}-${d}-${y}`;

    case "YYYY-MM-DD":
      return `${y}-${m}-${d}`;

    case "YYYY/MM/DD":
      return `${y}/${m}/${d}`;

    case "MONTH DD, YYYY":
    case "FULL_TEXT":
      return `${monthName} ${dayWithoutLeadingZero}, ${y}`;

    case "DD MONTH YYYY":
      return `${dayWithoutLeadingZero} ${monthName} ${y}`;

    case "DD-MMM-YYYY":
      return `${d}-${monthAbbr}-${y}`;

    default:
      // If website expects standard HTML date input
      if (cleanFormat.includes("DATE") || cleanFormat.includes("ISO")) {
        return `${y}-${m}-${d}`;
      }
      // If placeholder suggests DD/MM/YYYY
      if (cleanFormat.includes("DD/MM")) {
        return `${d}/${m}/${y}`;
      }
      return `${y}-${m}-${d}`;
  }
}
