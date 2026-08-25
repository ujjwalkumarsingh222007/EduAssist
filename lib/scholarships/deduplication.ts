import { Scholarship } from "./types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeUrl(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return (parsed.hostname + parsed.pathname).toLowerCase().replace(/\/+$/, "");
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Deduplicates and merges scholarships from Database and Live Web Discovery
 * - If a scholarship appears in both sources, merges them and prefers verified/official source.
 */
export function deduplicateScholarships(
  databaseScholarships: Scholarship[],
  webScholarships: Scholarship[]
): Scholarship[] {
  const mergedMap = new Map<string, Scholarship>();

  // 1. Add database scholarships first (trusted baseline)
  for (const s of databaseScholarships) {
    const key = normalizeTitle(s.title);
    mergedMap.set(key, { ...s });
  }

  // 2. Process web discovery scholarships
  for (const webS of webScholarships) {
    const key = normalizeTitle(webS.title);
    const existing = mergedMap.get(key);

    if (!existing) {
      // Check if URL matches any existing scholarship
      const webUrlNorm = normalizeUrl(webS.application_url);
      let matchFound = false;

      for (const [existingKey, existingS] of Array.from(mergedMap.entries())) {
        if (webUrlNorm && normalizeUrl(existingS.application_url) === webUrlNorm) {
          matchFound = true;
          // Merge metadata
          mergedMap.set(existingKey, {
            ...existingS,
            deadline: webS.deadline || existingS.deadline,
            date_found: webS.date_found || existingS.date_found,
          });
          break;
        }
      }

      if (!matchFound) {
        mergedMap.set(key, { ...webS });
      }
    } else {
      // Merge web discovered information with database record
      mergedMap.set(key, {
        ...existing,
        deadline: webS.deadline || existing.deadline,
        date_found: webS.date_found || existing.date_found,
        // Prefer official provider URL
        application_url: existing.application_url || webS.application_url,
      });
    }
  }

  return Array.from(mergedMap.values());
}
