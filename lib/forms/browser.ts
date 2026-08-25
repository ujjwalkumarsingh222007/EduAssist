import { chromium, Browser, Page } from "playwright";
import { FormFieldDescriptor, FieldMappingResult } from "./types";
import { Profile } from "@/lib/types/profile";
import { buildVerifiedLookup, mapFormField } from "./field-mapper";
import { isSecurityChallengeField } from "./privacy";

export interface BrowserAutoFillResult {
  success: boolean;
  page_title: string;
  current_url: string;
  filled: FieldMappingResult[];
  needs_user_input: FieldMappingResult[];
  skipped: FieldMappingResult[];
  security_challenge_detected: boolean;
  security_challenge_reason?: string;
  screenshot_base64?: string;
  message: string;
}

/**
 * Inspects all interactive form fields on the active Playwright page
 */
export async function inspectPageFormFields(page: Page): Promise<FormFieldDescriptor[]> {
  return await page.evaluate(() => {
    const descriptors: FormFieldDescriptor[] = [];
    const elements = document.querySelectorAll("input, select, textarea");

    elements.forEach((el, index) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      // Ignore hidden, submit, reset, and button inputs
      const type = (input.getAttribute("type") || input.tagName.toLowerCase()).toLowerCase();
      if (type === "hidden" || type === "submit" || type === "button" || type === "reset") {
        return;
      }

      const id = input.id || `field_${index}_${input.name || "input"}`;
      const name = input.name || input.id || `field_${index}`;

      // Extract associated label text
      let labelText = "";
      if (input.id) {
        const labelEl = document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) labelText = labelEl.textContent?.trim() || "";
      }
      if (!labelText && input.closest("label")) {
        labelText = input.closest("label")?.textContent?.trim() || "";
      }
      if (!labelText && input.getAttribute("aria-label")) {
        labelText = input.getAttribute("aria-label")?.trim() || "";
      }
      if (!labelText && input.getAttribute("placeholder")) {
        labelText = input.getAttribute("placeholder")?.trim() || "";
      }
      if (!labelText) {
        // Look for preceding sibling or parent text
        const parent = input.parentElement;
        if (parent) {
          const prev = input.previousElementSibling;
          if (prev && prev.tagName === "SPAN" || prev?.tagName === "LABEL") {
            labelText = prev.textContent?.trim() || "";
          }
        }
      }

      descriptors.push({
        id,
        name,
        label: labelText || name,
        type,
        placeholder: input.getAttribute("placeholder") || undefined,
        autocomplete: input.getAttribute("autocomplete") || undefined,
        required: input.required || input.getAttribute("aria-required") === "true",
      });
    });

    return descriptors;
  });
}

/**
 * Automates real server-side browser navigation and verified field population via Playwright
 */
export async function executeBrowserAutoFill(
  targetUrl: string,
  profile: Profile | null
): Promise<BrowserAutoFillResult> {
  let browser: Browser | null = null;

  try {
    // 1. Launch Playwright Chromium
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // 2. Navigate to destination application URL
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch (navErr: unknown) {
      const navMsg = navErr instanceof Error ? navErr.message : "Navigation error";
      return {
        success: false,
        page_title: "Error",
        current_url: targetUrl,
        filled: [],
        needs_user_input: [],
        skipped: [],
        security_challenge_detected: true,
        security_challenge_reason: `Unable to access target page directly (${navMsg}). Please open and complete manually.`,
        message: `Navigation blocked or timed out: ${navMsg}`,
      };
    }

    const pageTitle = await page.title();
    const currentUrl = page.url();

    // 3. Inspect Form Controls
    const formDescriptors = await inspectPageFormFields(page);

    // 4. Build Verified Mapping Lookup
    const verifiedLookup = buildVerifiedLookup(profile);

    const filled: FieldMappingResult[] = [];
    const needsUserInput: FieldMappingResult[] = [];
    const skipped: FieldMappingResult[] = [];
    let securityDetected = false;
    let securityReason = "";

    // 5. Iterate and Fill High-Confidence Matches
    for (const field of formDescriptors) {
      const mapping = mapFormField(field, verifiedLookup, profile);

      if (mapping.status === "manual_security_challenge") {
        securityDetected = true;
        securityReason = "CAPTCHA or security verification challenge detected on form.";
        skipped.push(mapping);
        continue;
      }

      if (mapping.status === "needs_user_input") {
        needsUserInput.push(mapping);
        continue;
      }

      if (mapping.status === "filled" && mapping.filled_value) {
        try {
          const safeEscape = (str: string) => str.replace(/["'\\]/g, "\\$&");

          let targetLocator = null;
          if (field.id) {
            const byId = page.locator(`#${safeEscape(field.id)}`);
            if ((await byId.count()) > 0) {
              targetLocator = byId.first();
            }
          }
          if (!targetLocator && field.name) {
            const byName = page.locator(`[name="${safeEscape(field.name)}"]`);
            if ((await byName.count()) > 0) {
              targetLocator = byName.first();
            }
          }

          if (targetLocator) {
            if (field.type === "select") {
              // Try select by label or value
              await targetLocator.selectOption({ label: mapping.filled_value }).catch(async () => {
                await targetLocator!.selectOption({ value: mapping.filled_value! }).catch(() => {});
              });
            } else if (field.type === "radio" || field.type === "checkbox") {
              await targetLocator.check().catch(() => {});
            } else {
              // Fill input / textarea
              await targetLocator.fill(mapping.filled_value);
            }
            filled.push(mapping);
          } else {
            // Could not locate element precisely
            needsUserInput.push({
              ...mapping,
              status: "needs_user_input",
              notes: "Element selector could not be uniquely resolved on page.",
            });
          }
        } catch (fillErr) {
          console.error(`Error filling field ${field.name}:`, fillErr);
          needsUserInput.push({
            ...mapping,
            status: "needs_user_input",
            notes: "Field could not be filled automatically. Please enter manually.",
          });
        }
      } else {
        skipped.push(mapping);
      }
    }

    // 6. Capture live screenshot of the filled page for user preview
    let screenshotBase64 = "";
    try {
      const buffer = await page.screenshot({ fullPage: false, type: "jpeg", quality: 75 });
      screenshotBase64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch {
      // Screenshot optional
    }

    // 7. STOP Automation: NEVER submit
    return {
      success: true,
      page_title: pageTitle,
      current_url: currentUrl,
      filled,
      needs_user_input: needsUserInput,
      skipped,
      security_challenge_detected: securityDetected,
      security_challenge_reason: securityReason || undefined,
      screenshot_base64: screenshotBase64 || undefined,
      message: `Successfully populated ${filled.length} verified fields. Automation stopped before submission for student review.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Playwright execution error";
    console.error("Browser automation error:", errorMsg);
    return {
      success: false,
      page_title: "Automation Stopped",
      current_url: targetUrl,
      filled: [],
      needs_user_input: [],
      skipped: [],
      security_challenge_detected: true,
      security_challenge_reason: "External site prevented automation or requires manual login/CAPTCHA.",
      message: errorMsg,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
