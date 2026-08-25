/**
 * Smart Education Assistant - Content Script (MV3)
 * Handles website ↔ extension handshake and safe form field analysis.
 * NOTE: NEVER modifies the webpage DOM or attributes to avoid Next.js hydration issues.
 */

// 1. Safe PostMessage Handshake (Website Installation Detection)
if (!window.__SEA_CONTENT_SCRIPT_INITIALIZED__) {
  window.__SEA_CONTENT_SCRIPT_INITIALIZED__ = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (window.location.origin !== "null" && event.origin !== window.location.origin) return;
    if (!event.data) return;

    if (
      event.data.type === "SEA_EXTENSION_PING" ||
      event.data.type === "SMART_ASSISTANT_PING"
    ) {
      window.postMessage(
        {
          type: "SEA_EXTENSION_PONG",
          extensionVersion: "1.0.0",
          installed: true,
        },
        window.location.origin
      );
    }
  });
}

// 2. Global Form Field Inspection Helper
function seaDetectFormFields() {
  const elements = Array.from(
    document.querySelectorAll("input, textarea, select")
  );

  const detectedFields = [];

  elements.forEach((el, index) => {
    const tagName = el.tagName.toLowerCase();
    const rawType = (el.getAttribute("type") || "text").toLowerCase();

    // Ignore non-data and sensitive credential/action inputs
    if (
      rawType === "hidden" ||
      rawType === "submit" ||
      rawType === "button" ||
      rawType === "reset" ||
      rawType === "image" ||
      rawType === "password"
    ) {
      return;
    }

    let elementType = "input";
    let inputType = rawType;

    if (tagName === "select") {
      elementType = "select";
      inputType = "select";
    } else if (tagName === "textarea") {
      elementType = "textarea";
      inputType = "textarea";
    } else if (rawType === "checkbox") {
      elementType = "checkbox";
      inputType = "checkbox";
    } else if (rawType === "radio") {
      elementType = "radio";
      inputType = "radio";
    } else if (rawType === "file") {
      elementType = "file";
      inputType = "file";
    } else {
      elementType = "input";
      inputType = rawType || "text";
    }

    // 1. Associated <label for="id">
    let labelText = "";
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (labelEl) {
        labelText = labelEl.innerText.trim();
      }
    }

    // 2. Closest label
    if (!labelText && el.closest("label")) {
      const parentLabel = el.closest("label");
      const clone = parentLabel.cloneNode(true);
      const childInputs = clone.querySelectorAll("input, select, textarea");
      childInputs.forEach((inp) => inp.remove());
      labelText = clone.innerText.trim();
    }

    // 3. Fallbacks: aria-label, placeholder, name, id
    const ariaLabel = el.getAttribute("aria-label")?.trim() || "";
    const placeholder = el.getAttribute("placeholder")?.trim() || "";
    const name = el.getAttribute("name")?.trim() || "";
    const id = el.id?.trim() || "";

    const displayLabel =
      labelText ||
      ariaLabel ||
      placeholder ||
      (name ? name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "") ||
      (id ? id.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : `Field ${index + 1}`);

    // Required check
    const isRequired =
      el.hasAttribute("required") ||
      el.getAttribute("aria-required") === "true" ||
      el.classList.contains("required");

    // Collect select options if select element
    const options = [];
    if (tagName === "select") {
      const selectEl = el;
      Array.from(selectEl.options).forEach((opt) => {
        const text = opt.text.trim();
        if (text && text !== "-- Select --" && text !== "Select" && text !== "") {
          options.push(text.substring(0, 40));
        }
      });
    }

    // STRICT PRIVACY: NEVER collect user-entered values (value/defaultValue)
    detectedFields.push({
      field_id: id || name || `field_${index + 1}`,
      element_type: elementType,
      input_type: inputType,
      label: displayLabel.substring(0, 100),
      raw_label: labelText.substring(0, 100),
      name,
      id,
      placeholder,
      aria_label: ariaLabel,
      required: Boolean(isRequired),
      options: options.slice(0, 10),
      total_options: options.length,
    });
  });

  return detectedFields;
}

// Make accessible to execution contexts
window.seaDetectFormFields = seaDetectFormFields;
