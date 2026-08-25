import { Page } from "playwright";
import { LiveFormFieldDescriptor } from "./types";

const SECURITY_KEYWORDS = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "security_code",
  "security_pin",
  "security_captcha",
  "otp",
  "one_time_password",
  "passcode",
  "verification_code",
  "two_factor",
  "mfa",
  "biometric",
  "password",
];

export function isSecurityChallengeName(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECURITY_KEYWORDS.some((k) => clean.includes(k.replace(/_/g, "")));
}

/**
 * Detects and extracts interactive form elements directly from the live Playwright DOM
 */
export async function detectPageFormFields(page: Page): Promise<LiveFormFieldDescriptor[]> {
  try {
    const rawFields = await page.evaluate(() => {
      const results: Array<{
        id?: string;
        name?: string;
        type: string;
        label: string;
        placeholder?: string;
        selector: string;
        required?: boolean;
        options?: string[];
        currentValue?: string;
      }> = [];

      const elements = Array.from(
        document.querySelectorAll("input, select, textarea")
      ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

      elements.forEach((el, index) => {
        // Skip hidden or disabled controls
        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          el.hasAttribute("hidden")
        ) {
          return;
        }

        const tag = el.tagName.toLowerCase();
        let inputType = tag;
        if (tag === "input") {
          inputType = (el as HTMLInputElement).type.toLowerCase() || "text";
          if (["submit", "reset", "button", "image", "hidden"].includes(inputType)) {
            return;
          }
        }

        // Extract associated label text
        let labelText = "";
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) labelText = labelEl.textContent?.trim() || "";
        }
        if (!labelText && el.closest("label")) {
          labelText = el.closest("label")?.textContent?.trim() || "";
        }
        if (!labelText && el.getAttribute("aria-label")) {
          labelText = el.getAttribute("aria-label")?.trim() || "";
        }
        if (!labelText && el.getAttribute("placeholder")) {
          labelText = el.getAttribute("placeholder")?.trim() || "";
        }
        if (!labelText && el.name) {
          labelText = el.name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Extract options for select elements
        let options: string[] = [];
        if (tag === "select") {
          const selectEl = el as HTMLSelectElement;
          options = Array.from(selectEl.options)
            .map((opt) => opt.text.trim())
            .filter((t) => t && !t.startsWith("--"));
        }

        // Generate unique selector
        let uniqueSelector = "";
        if (el.id) {
          uniqueSelector = `#${el.id}`;
        } else if (el.name) {
          if (inputType === "radio" || inputType === "checkbox") {
            const val = (el as HTMLInputElement).value;
            uniqueSelector = `${tag}[name="${el.name}"][value="${val}"]`;
          } else {
            uniqueSelector = `${tag}[name="${el.name}"]`;
          }
        } else {
          uniqueSelector = `${tag}:nth-of-type(${index + 1})`;
        }

        results.push({
          id: el.id || undefined,
          name: el.name || undefined,
          type: inputType,
          label: labelText || `Field ${index + 1}`,
          placeholder: el.getAttribute("placeholder") || undefined,
          selector: uniqueSelector,
          required: el.required || el.hasAttribute("aria-required"),
          options: options.length > 0 ? options : undefined,
          currentValue: el.value || undefined,
        });
      });

      return results;
    });

    // Tag security challenge fields
    return rawFields.map((f) => {
      const matchText = `${f.name || ""} ${f.id || ""} ${f.label} ${f.placeholder || ""}`;
      const isSec = isSecurityChallengeName(matchText) || f.type === "password";
      return {
        ...f,
        is_security_challenge: isSec,
      };
    });
  } catch (err) {
    console.error("DOM form detection error:", err);
    return [];
  }
}
