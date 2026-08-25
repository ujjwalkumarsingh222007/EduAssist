import { Page } from "playwright";
import { LiveFormFieldDescriptor, FormFieldFillResult } from "./types";
import { mapLiveFieldToVerifiedProfile } from "./profile-mapper";
import { Profile } from "@/lib/types/profile";

export interface FormFillExecutionSummary {
  detected_count: number;
  matched_count: number;
  filled_count: number;
  needs_input_count: number;
  security_challenge_detected: boolean;
  mappings: FormFieldFillResult[];
  status_message: string;
}

/**
 * Fills detected fields on the live Playwright page using verified profile data
 */
export async function executeFormFilling(
  page: Page,
  fields: LiveFormFieldDescriptor[],
  profile: Profile | null
): Promise<FormFillExecutionSummary> {
  const mappings: FormFieldFillResult[] = [];
  let filledCount = 0;
  let matchedCount = 0;
  let needsInputCount = 0;
  let securityDetected = false;

  for (const field of fields) {
    const mapping = mapLiveFieldToVerifiedProfile(field, profile);

    if (mapping.status === "security_challenge") {
      securityDetected = true;
      mappings.push(mapping);
      continue;
    }

    if (mapping.status === "filled" && mapping.filled_value) {
      matchedCount++;
      try {
        const locator = page.locator(field.selector);
        if ((await locator.count()) > 0) {
          const el = locator.first();

          if (field.type === "select") {
            await el.selectOption({ label: mapping.filled_value }).catch(async () => {
              await el.selectOption({ value: mapping.filled_value! }).catch(() => {});
            });
          } else if (field.type === "radio" || field.type === "checkbox") {
            await el.check().catch(() => {});
          } else {
            await el.fill(mapping.filled_value);
          }

          filledCount++;
          mappings.push(mapping);
        } else {
          needsInputCount++;
          mappings.push({
            ...mapping,
            status: "needs_user_input",
            notes: "Could not resolve element selector on page.",
          });
        }
      } catch (err) {
        console.error(`Error filling field ${field.name}:`, err);
        needsInputCount++;
        mappings.push({
          ...mapping,
          status: "needs_user_input",
          notes: "Field could not be filled automatically.",
        });
      }
    } else {
      needsInputCount++;
      mappings.push(mapping);
    }
  }

  const statusMessage = `${fields.length} fields detected • ${matchedCount} matched • ${filledCount} filled • ${needsInputCount} need manual input`;

  return {
    detected_count: fields.length,
    matched_count: matchedCount,
    filled_count: filledCount,
    needs_input_count: needsInputCount,
    security_challenge_detected: securityDetected,
    mappings,
    status_message: statusMessage,
  };
}
