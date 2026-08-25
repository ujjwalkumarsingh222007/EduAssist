import { CanonicalNameComponents } from "./field-schema";

/**
 * Normalizes and splits a full name string into first, middle, and last name components
 * adhering strictly to the naming rules:
 *
 * - 1 word: first_name = word, middle_name = "", last_name = ""
 * - 2 words: first_name = word 1, middle_name = "", last_name = word 2
 * - 3+ words: first_name = word 1, last_name = last word, middle_name = everything in between
 */
export function splitFullName(fullName: string): CanonicalNameComponents {
  if (!fullName || typeof fullName !== "string") {
    return { first_name: "", middle_name: "", last_name: "", is_manually_edited: false };
  }

  const clean = fullName.trim().replace(/\s+/g, " ");
  if (!clean) {
    return { first_name: "", middle_name: "", last_name: "", is_manually_edited: false };
  }

  const parts = clean.split(" ");

  if (parts.length === 1) {
    return {
      first_name: parts[0],
      middle_name: "",
      last_name: "",
      is_manually_edited: false,
    };
  }

  if (parts.length === 2) {
    return {
      first_name: parts[0],
      middle_name: "",
      last_name: parts[1],
      is_manually_edited: false,
    };
  }

  // 3 or more words
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.slice(1, parts.length - 1).join(" ");

  return {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    is_manually_edited: false,
  };
}

/**
 * Combines first, middle, and last name components into a single full name string
 */
export function combineFullName(components: {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
}): string {
  const parts = [
    components.first_name?.trim() || "",
    components.middle_name?.trim() || "",
    components.last_name?.trim() || "",
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Combines only first and last name (omitting middle name)
 */
export function formatFirstAndLast(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/**
 * Resolves name components prioritizing manual student overrides over derived values
 * while preserving the original verified full_name.
 */
export function resolveNameComponents(
  fullName: string,
  manualComponents?: Partial<CanonicalNameComponents>
): CanonicalNameComponents {
  // If user has explicitly provided manual component edits, honor them
  if (
    manualComponents &&
    manualComponents.is_manually_edited &&
    (manualComponents.first_name !== undefined ||
      manualComponents.middle_name !== undefined ||
      manualComponents.last_name !== undefined)
  ) {
    return {
      first_name: manualComponents.first_name?.trim() || "",
      middle_name: manualComponents.middle_name?.trim() || "",
      last_name: manualComponents.last_name?.trim() || "",
      is_manually_edited: true,
    };
  }

  // Otherwise, automatically derive from verified full_name
  return splitFullName(fullName);
}
