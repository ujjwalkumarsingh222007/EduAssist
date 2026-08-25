/**
 * Smart Education Assistant - Popup UI Controller
 * Dedicated Autofill Write Engine & Controlled React Form DOM Setter.
 *
 * Native prototype setters for React / Vue / Angular compatibility.
 * Dispatches bubbling 'input' and 'change' events.
 * Real DOM element verification and green highlight rings.
 */

// In-Memory Session Cache for field mappings
const sessionMappingCache = new Map();

// =========================================================================
// 1. IN-PAGE FORM FIELD EXTRACTOR (Injected via chrome.scripting.executeScript)
// =========================================================================
function extractPageFormFields() {
  try {
    const elements = Array.from(
      document.querySelectorAll("input, textarea, select")
    );

    const detectedFields = [];

    elements.forEach((el, index) => {
      const tagName = el.tagName.toLowerCase();
      const rawType = (el.getAttribute("type") || "text").toLowerCase();

      // Filter out non-data inputs
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

      // 1. Priority 1: <label for="...">
      let labelText = "";
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl) labelText = labelEl.innerText.trim();
      }

      // 2. Priority 2: Closest <label>
      if (!labelText && el.closest("label")) {
        const parentLabel = el.closest("label");
        const clone = parentLabel.cloneNode(true);
        const childInputs = clone.querySelectorAll("input, select, textarea");
        childInputs.forEach((inp) => inp.remove());
        labelText = clone.innerText.trim();
      }

      // 3. Section Context
      let sectionContext = "";
      const fieldset = el.closest("fieldset");
      if (fieldset) {
        const legend = fieldset.querySelector("legend");
        if (legend) sectionContext = legend.innerText.trim();
      }
      if (!sectionContext) {
        const parentContainer = el.closest("section, div[class*='section'], div[class*='card'], form > div");
        if (parentContainer) {
          const heading = parentContainer.querySelector("h1, h2, h3, h4, h5, legend");
          if (heading) sectionContext = heading.innerText.trim();
        }
      }

      // 4. Priorities 3-6: aria-label, placeholder, name, id
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

      const isRequired =
        el.hasAttribute("required") ||
        el.getAttribute("aria-required") === "true" ||
        el.classList.contains("required");

      // Stable fallback selector
      let stableSelector = "";
      if (id) {
        stableSelector = `#${CSS.escape(id)}`;
      } else if (name) {
        stableSelector = `[name="${CSS.escape(name)}"]`;
      } else {
        stableSelector = `${tagName}:nth-of-type(${index + 1})`;
      }

      // Collect select options
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

      detectedFields.push({
        field_id: id || name || `field_${index + 1}`,
        selector: stableSelector,
        element_type: elementType,
        input_type: inputType,
        label: displayLabel.substring(0, 150),
        raw_label: labelText.substring(0, 150),
        name,
        id,
        placeholder,
        aria_label: ariaLabel,
        section_context: sectionContext.substring(0, 100),
        required: Boolean(isRequired),
        options: options.slice(0, 10),
        total_options: options.length,
      });
    });

    return {
      success: true,
      fields: detectedFields,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Failed to inspect forms",
      fields: [],
    };
  }
}

// =========================================================================
// 2. IN-PAGE FORM AUTOFILL ENGINE (Injected via chrome.scripting.executeScript)
// =========================================================================
function fillPageFormFields(payload) {
  try {
    const items = payload.items || [];
    const results = [];

    items.forEach((item) => {
      // 1. Guard against unapproved / ignored
      if (!item.is_approved) {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: false,
          filled: false,
          status: "skipped",
          reason: "NOT_APPROVED",
          message: "User ignored / unapproved",
        });
        return;
      }

      // 2. Guard against CAPTCHA / OTP / Security (User Controlled)
      if (item.is_user_controlled) {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: false,
          filled: false,
          status: "skipped",
          reason: "USER_CONTROLLED",
          message: "🔒 User controlled (Security verification)",
        });
        return;
      }

      // 3. Guard against Declarations / Legal Consents
      if (item.is_declaration) {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: false,
          filled: false,
          status: "needs_input",
          reason: "DECLARATION",
          message: "⚖ Declaration (User confirmation required)",
        });
        return;
      }

      // 4. Guard against missing value
      if (item.value === undefined || item.value === null || String(item.value).trim() === "") {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: false,
          filled: false,
          status: "skipped",
          reason: "VALUE_MISSING",
          message: "⚠ Value not available in verified profile",
        });
        return;
      }

      // 5. Locate target element in DOM
      let el = null;
      if (item.id) {
        try {
          el = document.getElementById(item.id) || document.querySelector(`#${CSS.escape(item.id)}`);
        } catch (_) {}
      }
      if (!el && item.name) {
        try {
          el = document.querySelector(`[name="${CSS.escape(item.name)}"]`);
        } catch (_) {}
      }
      if (!el && item.field_id) {
        try {
          el = document.getElementById(item.field_id) || document.querySelector(`[name="${CSS.escape(item.field_id)}"]`);
        } catch (_) {}
      }
      if (!el && item.selector) {
        try {
          el = document.querySelector(item.selector);
        } catch (_) {}
      }

      if (!el) {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: false,
          filled: false,
          status: "failed",
          reason: "ELEMENT_NOT_FOUND",
          message: "⚠ Element not found on page",
        });
        return;
      }

      // Element found!
      const expectedValue = String(item.value).trim();
      let valToSet = expectedValue;

      // Date format normalization
      if (el.type === "date" && valToSet.includes("/")) {
        const parts = valToSet.split("/");
        if (parts.length === 3 && parts[2].length === 4) {
          valToSet = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      } else if (item.canonical_field === "date_of_birth" && el.type !== "date" && valToSet.includes("-")) {
        const parts = valToSet.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          valToSet = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Focus element
      try {
        el.focus();
      } catch (_) {}

      // Native Prototype Setter (React/Vue/Angular Controlled State Compatibility)
      const isTextarea = el instanceof HTMLTextAreaElement;
      const isSelect = el instanceof HTMLSelectElement;
      let proto = window.HTMLInputElement.prototype;
      if (isTextarea) proto = window.HTMLTextAreaElement.prototype;
      if (isSelect) proto = window.HTMLSelectElement.prototype;

      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(el, valToSet);
      } else {
        el.value = valToSet;
      }

      // Dispatch full sequence of bubbling events
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      try {
        el.dispatchEvent(new Event("blur", { bubbles: true }));
      } catch (_) {}

      // DOM Verification: Verify value actually updated in DOM
      const domValue = String(el.value);
      const isFilled =
        domValue === valToSet ||
        (el.type === "number" && Number(domValue) === Number(valToSet)) ||
        (el.type === "date" && domValue.length > 0);

      if (isFilled) {
        // Visual green highlight ring
        el.style.borderColor = "#16a34a";
        el.style.boxShadow = "0 0 0 3px rgba(22, 163, 74, 0.25)";
        el.style.transition = "border-color 0.2s, box-shadow 0.2s";

        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: true,
          filled: true,
          status: "filled",
          verified_value: domValue,
          message: "✓ Filled",
        });
      } else {
        results.push({
          field_id: item.field_id,
          canonical_field: item.canonical_field,
          label: item.label,
          found: true,
          filled: false,
          status: "failed",
          reason: "DOM_VALUE_NOT_UPDATED",
          message: "⚠ Website rejected the value",
        });
      }
    });

    const filledCount = results.filter((r) => r.filled === true).length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const failedCount = results.filter((r) => r.status === "failed" || (r.found && !r.filled)).length;
    const needsInputCount = results.filter((r) => r.status === "needs_input").length;

    return {
      success: true,
      total: results.length,
      filledCount,
      skippedCount,
      failedCount,
      needsInputCount,
      results,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Failed during DOM autofill",
      filledCount: 0,
      results: [],
    };
  }
}

// =========================================================================
// 3. CANONICAL FIELD DICTIONARY & ALIASES
// =========================================================================

const CANONICAL_DICTIONARY = {
  full_name: "Full Name",
  first_name: "First Name",
  middle_name: "Middle Name",
  last_name: "Last Name",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  nationality: "Nationality",
  father_name: "Father Name",
  mother_name: "Mother Name",
  guardian_name: "Guardian Name",
  phone: "Mobile / Phone",
  email: "Email Address",
  address: "Full Address",
  city: "City",
  state: "State",
  country: "Country",
  pincode: "PIN Code",
  institution: "Institution",
  university: "University",
  college: "College",
  degree: "Degree",
  course: "Course",
  major: "Branch / Major",
  roll_number: "Roll Number",
  registration_number: "Registration Number",
  annual_income: "Annual Family Income",
  category: "Category",
  aadhaar_number: "Aadhaar Number",
  pan_number: "PAN Card",
  account_holder_name: "Account Holder Name",
  account_number: "Account Number",
  ifsc: "IFSC Code",

  class_10_percentage: "Class 10 Percentage",
  class_10_marks: "Class 10 Marks",
  class_10_passing_year: "Class 10 Passing Year",
  class_10_board: "Class 10 Board",

  class_12_percentage: "Class 12 Percentage",
  class_12_marks: "Class 12 Marks",
  class_12_passing_year: "Class 12 Passing Year",
  class_12_board: "Class 12 Board",
  class_12_stream: "Class 12 Stream",

  graduation_percentage: "Graduation Percentage",
  graduation_cgpa: "Graduation CGPA",
  graduation_year: "Graduation Passing Year",
  domicile: "State of Domicile",
};

const FIELD_ALIASES = {
  full_name: [
    "full name", "applicant name", "candidate name", "student name",
    "name of applicant", "name of candidate", "candidate full name", "applicant full name",
    "complete name", "candidate fullname", "applicant fullname"
  ],
  first_name: [
    "first name", "given name", "given names", "firstname",
    "candidate first name", "applicant first name", "forename"
  ],
  middle_name: [
    "middle name", "second name", "middlename", "candidate middle name"
  ],
  last_name: [
    "last name", "family name", "surname", "lastname",
    "candidate last name", "applicant last name"
  ],
  date_of_birth: [
    "date of birth", "dob", "birth date", "birthdate",
    "candidate dob", "applicant dob", "d o b"
  ],
  gender: [
    "gender", "sex", "candidate gender", "applicant gender"
  ],
  nationality: [
    "nationality", "citizenship", "country of citizenship", "are you an indian citizen",
    "indian citizen", "citizen of india"
  ],
  father_name: [
    "fathers name", "father name", "fathers full name", "father full name",
    "parent name", "name of father", "father guardian name"
  ],
  mother_name: [
    "mothers name", "mother name", "mothers full name", "mother full name",
    "name of mother"
  ],
  guardian_name: [
    "guardian name", "guardians name", "legal guardian name", "guardian full name"
  ],
  phone: [
    "mobile", "mobile number", "phone", "phone number", "contact number",
    "cell number", "mobile no", "contact no", "telephone", "student mobile"
  ],
  email: [
    "email", "email address", "student email", "candidate email", "e mail"
  ],
  address: [
    "address", "permanent address", "residential address", "full address",
    "communication address", "correspondence address", "present address", "street address"
  ],
  city: [
    "city", "district", "town", "city district", "domicile district"
  ],
  state: [
    "state", "domicile state", "resident state", "state of residence", "province"
  ],
  domicile: [
    "domicile", "state of domicile", "permanent state", "resident of state"
  ],
  country: [
    "country", "nation", "country of residence"
  ],
  pincode: [
    "pin", "pin code", "postal code", "zip", "zip code", "pincode", "post code"
  ],
  institution: [
    "college", "college name", "institution", "institution name", "institute name", "school name"
  ],
  university: [
    "university", "university name", "affiliating university", "board university", "name of university"
  ],
  degree: [
    "degree", "degree name", "qualification", "qualification level", "degree level"
  ],
  course: [
    "course", "program", "programme", "course name", "program name", "enrolled course"
  ],
  major: [
    "branch", "stream", "major", "specialization", "discipline", "branch of study", "field of study"
  ],
  annual_income: [
    "annual income", "family income", "annual family income", "total family income",
    "parents annual income", "family annual income", "gross annual income", "familys annual income"
  ],
  category: [
    "category", "social category", "reservation category", "caste category", "community category", "do you belong to"
  ],
  aadhaar_number: [
    "aadhaar", "aadhaar number", "aadhaar no", "aadhar", "aadhar number", "uidai"
  ],
  pan_number: [
    "pan", "pan number", "pan card", "pan card number"
  ],

  // Class 10
  class_10_percentage: [
    "10th percentage", "class 10 percentage", "class x percentage", "ssc percentage",
    "matriculation percentage", "10th standard percentage", "high school percentage", "class 10 marks percentage"
  ],
  class_10_marks: [
    "10th marks", "class 10 marks", "class x marks", "ssc marks", "matriculation marks"
  ],
  class_10_passing_year: [
    "10th passing year", "year of passing 10th", "class 10 passing year", "class x passing year",
    "ssc passing year", "matriculation passing year"
  ],
  class_10_board: [
    "10th board", "class 10 board", "class x board", "ssc board", "matriculation board", "board of 10th"
  ],

  // Class 12
  class_12_percentage: [
    "12th percentage", "12th standard percentage", "class 12 percentage", "class xii percentage",
    "higher secondary percentage", "hsc percentage", "intermediate percentage", "class 12 marks percentage",
    "senior secondary percentage", "plus two percentage", "+2 percentage"
  ],
  class_12_marks: [
    "12th marks", "class 12 marks", "class xii marks", "hsc marks", "intermediate marks"
  ],
  class_12_passing_year: [
    "12th passing year", "year of passing 12th", "class 12 passing year", "class xii passing year",
    "hsc passing year", "intermediate passing year", "year of passing class 12"
  ],
  class_12_board: [
    "12th board", "class 12 board", "class xii board", "hsc board", "intermediate board", "board of 12th"
  ],
  class_12_stream: [
    "12th stream", "class 12 stream", "class xii stream", "senior secondary stream", "higher secondary stream",
    "intermediate stream"
  ],

  // Graduation
  graduation_percentage: [
    "graduation percentage", "degree percentage", "ug percentage", "undergraduate percentage"
  ],
  graduation_cgpa: [
    "graduation cgpa", "degree cgpa", "ug cgpa", "undergraduate cgpa"
  ],
};

function normalizeText(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeDeclaration(text) {
  const norm = (text || "").toLowerCase();
  const isDecl =
    norm.includes("i confirm") ||
    norm.includes("i declare") ||
    norm.includes("i hereby") ||
    norm.includes("i certify") ||
    norm.includes("declaration") ||
    norm.includes("terms and conditions") ||
    norm.includes("undertaking") ||
    (norm.length > 50 && (norm.includes("citizen") || norm.includes("passed") || norm.includes("eligible")));

  if (!isDecl) return { isDeclaration: false, requirements: [] };

  const requirements = [];
  if (norm.includes("citizen") || norm.includes("nationality")) {
    requirements.push({ label: "Citizenship / Nationality", canonical_field: "nationality" });
  }
  if (norm.includes("residing") || norm.includes("resident") || norm.includes("domicile")) {
    requirements.push({ label: "Country / State Residence", canonical_field: "domicile" });
  }
  if (norm.includes("class 12") || norm.includes("hsc") || norm.includes("12th") || norm.includes("intermediate")) {
    requirements.push({ label: "Class 12 Qualification", canonical_field: "class_12_percentage" });
  }
  if (norm.includes("class 10") || norm.includes("ssc") || norm.includes("10th")) {
    requirements.push({ label: "Class 10 Qualification", canonical_field: "class_10_percentage" });
  }
  if (norm.includes("income") || norm.includes("family income")) {
    requirements.push({ label: "Family Income Limit", canonical_field: "annual_income" });
  }

  return { isDeclaration: true, requirements };
}

function mapSingleFieldLocally(field) {
  const normLabel = normalizeText(field.label);
  const normName = normalizeText(field.name);
  const normId = normalizeText(field.id);
  const normPlaceholder = normalizeText(field.placeholder);
  const normContext = normalizeText(field.section_context);
  const fullText = `${normLabel} ${normName} ${normId} ${normPlaceholder} ${normContext}`.trim();

  // 1. File Upload
  if (field.element_type === "file" || field.input_type === "file") {
    return {
      field_id: field.field_id,
      selector: field.selector,
      name: field.name,
      id: field.id,
      element_type: field.element_type,
      input_type: field.input_type,
      website_label: field.label || "Upload Document",
      canonical_field: null,
      canonical_display_name: "📄 Document upload detected",
      confidence: 1.0,
      source: "file_upload",
      needs_confirmation: false,
      status: "approved",
      required: field.required,
      options: field.options,
    };
  }

  // 2. Security / CAPTCHA / OTP
  const userControlledKeys = ["captcha", "security code", "security pin", "verification code", "otp", "one time password"];
  for (const key of userControlledKeys) {
    if (fullText.includes(key)) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label || "Security Verification",
        canonical_field: null,
        canonical_display_name: "🔒 User controlled",
        confidence: 1.0,
        source: "user_controlled",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
  }

  // 3. Declarations
  const decl = analyzeDeclaration(field.label || field.placeholder || "");
  if (decl.isDeclaration) {
    return {
      field_id: field.field_id,
      selector: field.selector,
      name: field.name,
      id: field.id,
      element_type: field.element_type,
      input_type: field.input_type,
      website_label: field.label || "Declaration",
      canonical_field: null,
      canonical_display_name: "⚖ Declaration • User confirmation required",
      confidence: 1.0,
      source: "declaration",
      is_declaration: true,
      declaration_requirements: decl.requirements,
      needs_confirmation: true,
      status: "approved",
      required: field.required,
      options: field.options,
    };
  }

  // 4. Exact Alias Matching
  const candidateTexts = [normLabel, normName, normId, normPlaceholder].filter(Boolean);
  for (const text of candidateTexts) {
    for (const [canonicalKey, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(text) || canonicalKey.replace(/_/g, " ") === text) {
        return {
          field_id: field.field_id,
          selector: field.selector,
          name: field.name,
          id: field.id,
          element_type: field.element_type,
          input_type: field.input_type,
          website_label: field.label || canonicalKey,
          canonical_field: canonicalKey,
          canonical_display_name: CANONICAL_DICTIONARY[canonicalKey] || canonicalKey,
          confidence: 0.98,
          source: "alias",
          needs_confirmation: false,
          status: "approved",
          required: field.required,
          options: field.options,
        };
      }
    }
  }

  // 5. Semantic / Keyword Matching
  const is12th = fullText.includes("12th") || fullText.includes("class 12") || fullText.includes("class xii") || fullText.includes("hsc") || fullText.includes("intermediate") || fullText.includes("higher secondary") || fullText.includes("plus two");
  if (is12th) {
    if (fullText.includes("percent") || fullText.includes("score") || (fullText.includes("marks") && !fullText.includes("total"))) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_12_percentage",
        canonical_display_name: "Class 12 Percentage",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
    if (fullText.includes("passing year") || fullText.includes("year of passing") || fullText.includes("passing") || fullText.includes("year")) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_12_passing_year",
        canonical_display_name: "Class 12 Passing Year",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
    if (fullText.includes("board") || fullText.includes("council")) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_12_board",
        canonical_display_name: "Class 12 Board",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
    if (fullText.includes("stream") || fullText.includes("branch") || fullText.includes("discipline")) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_12_stream",
        canonical_display_name: "Class 12 Stream",
        confidence: 0.96,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
  }

  const is10th = (fullText.includes("10th") || fullText.includes("class 10") || fullText.includes("class x") || fullText.includes("ssc") || fullText.includes("matriculation") || fullText.includes("secondary")) && !is12th;
  if (is10th) {
    if (fullText.includes("percent") || fullText.includes("score") || (fullText.includes("marks") && !fullText.includes("total"))) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_10_percentage",
        canonical_display_name: "Class 10 Percentage",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
    if (fullText.includes("passing year") || fullText.includes("year of passing") || fullText.includes("year")) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_10_passing_year",
        canonical_display_name: "Class 10 Passing Year",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
    if (fullText.includes("board") || fullText.includes("council")) {
      return {
        field_id: field.field_id,
        selector: field.selector,
        name: field.name,
        id: field.id,
        element_type: field.element_type,
        input_type: field.input_type,
        website_label: field.label,
        canonical_field: "class_10_board",
        canonical_display_name: "Class 10 Board",
        confidence: 0.97,
        source: "semantic_local",
        needs_confirmation: false,
        status: "approved",
        required: field.required,
        options: field.options,
      };
    }
  }

  // Citizenship / Nationality Check
  if (fullText.includes("indian citizen") || fullText.includes("citizenship") || fullText.includes("nationality") || fullText.includes("are you an indian")) {
    return {
      field_id: field.field_id,
      selector: field.selector,
      name: field.name,
      id: field.id,
      element_type: field.element_type,
      input_type: field.input_type,
      website_label: field.label,
      canonical_field: "nationality",
      canonical_display_name: "Nationality / Citizenship",
      confidence: 0.98,
      source: "semantic_local",
      needs_confirmation: false,
      status: "approved",
      required: field.required,
      options: field.options,
    };
  }

  // Domicile / State Check
  if (fullText.includes("domicile") || fullText.includes("state of domicile") || fullText.includes("resident state")) {
    return {
      field_id: field.field_id,
      selector: field.selector,
      name: field.name,
      id: field.id,
      element_type: field.element_type,
      input_type: field.input_type,
      website_label: field.label,
      canonical_field: "domicile",
      canonical_display_name: "State of Domicile",
      confidence: 0.97,
      source: "semantic_local",
      needs_confirmation: false,
      status: "approved",
      required: field.required,
      options: field.options,
    };
  }

  // Category Check
  if (fullText.includes("category") || fullText.includes("caste") || fullText.includes("reservation")) {
    return {
      field_id: field.field_id,
      selector: field.selector,
      name: field.name,
      id: field.id,
      element_type: field.element_type,
      input_type: field.input_type,
      website_label: field.label,
      canonical_field: "category",
      canonical_display_name: "Category",
      confidence: 0.96,
      source: "semantic_local",
      needs_confirmation: false,
      status: "approved",
      required: field.required,
      options: field.options,
    };
  }

  // Substring Alias Fallback
  for (const [canonicalKey, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (alias.length >= 4 && (normLabel.includes(alias) || alias.includes(normLabel))) {
        return {
          field_id: field.field_id,
          selector: field.selector,
          name: field.name,
          id: field.id,
          element_type: field.element_type,
          input_type: field.input_type,
          website_label: field.label,
          canonical_field: canonicalKey,
          canonical_display_name: CANONICAL_DICTIONARY[canonicalKey] || canonicalKey,
          confidence: 0.88,
          source: "alias",
          needs_confirmation: false,
          status: "approved",
          required: field.required,
          options: field.options,
        };
      }
    }
  }

  return {
    field_id: field.field_id,
    selector: field.selector,
    name: field.name,
    id: field.id,
    element_type: field.element_type,
    input_type: field.input_type,
    website_label: field.label || field.name || "Unknown Field",
    canonical_field: null,
    canonical_display_name: "Unmapped Field",
    confidence: 0.3,
    source: "unknown",
    needs_confirmation: true,
    status: "pending",
    required: field.required,
    options: field.options,
  };
}

// =========================================================================
// 4. POPUP UI CONTROLLER & EVENT LISTENERS
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  const currentWebsiteEl = document.getElementById("currentWebsite");
  const accountStatusTextEl = document.getElementById("accountStatusText");
  const statusBadgeTagEl = document.getElementById("statusBadgeTag");

  const disconnectedSection = document.getElementById("disconnectedSection");
  const connectedSection = document.getElementById("connectedSection");
  const displayUserIdEl = document.getElementById("displayUserId");

  const btnOpenDashboard = document.getElementById("btnOpenDashboard");
  const inputPairingCode = document.getElementById("inputPairingCode");
  const btnSubmitCode = document.getElementById("btnSubmitCode");
  const btnDisconnect = document.getElementById("btnDisconnect");
  const btnAnalyzeForm = document.getElementById("btnAnalyzeForm");

  // View 1: Mapping
  const mappingResultsSection = document.getElementById("mappingResultsSection");
  const fieldsDetectedSummary = document.getElementById("fieldsDetectedSummary");
  const mappingStatsBadge = document.getElementById("mappingStatsBadge");
  const mappingList = document.getElementById("mappingList");
  const btnToggleReviewMode = document.getElementById("btnToggleReviewMode");
  const btnFetchProfilePreview = document.getElementById("btnFetchProfilePreview");

  // View 2: Values Preview
  const valuesPreviewSection = document.getElementById("valuesPreviewSection");
  const valuesPreviewList = document.getElementById("valuesPreviewList");
  const btnBackToMapping = document.getElementById("btnBackToMapping");
  const btnFillApprovedFields = document.getElementById("btnFillApprovedFields");

  // Confirmation Prompt
  const autofillConfirmBox = document.getElementById("autofillConfirmBox");
  const confirmMessageText = document.getElementById("confirmMessageText");
  const btnCancelAutofill = document.getElementById("btnCancelAutofill");
  const btnConfirmAutofill = document.getElementById("btnConfirmAutofill");

  // View 3: Autofill Results
  const autofillResultsSection = document.getElementById("autofillResultsSection");
  const statFilledCount = document.getElementById("statFilledCount");
  const statNeedsInputCount = document.getElementById("statNeedsInputCount");
  const statSkippedCount = document.getElementById("statSkippedCount");
  const autofillResultsList = document.getElementById("autofillResultsList");
  const btnResetToValues = document.getElementById("btnResetToValues");
  const btnDoneAutofill = document.getElementById("btnDoneAutofill");

  const errorMessageBox = document.getElementById("errorMessageBox");
  const infoMessageBox = document.getElementById("infoMessageBox");

  // Local State
  let currentMappings = [];
  let isReviewMode = false;
  let profileValuesData = {};
  let confirmedSensitiveFields = new Set();
  let approvedFieldChecks = {};

  // 1. Initialize Active Tab and Hostname
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0 && tabs[0].url) {
      try {
        const urlObj = new URL(tabs[0].url);
        currentWebsiteEl.textContent = urlObj.hostname || "local page";
      } catch {
        currentWebsiteEl.textContent = tabs[0].url.substring(0, 24);
      }
    } else {
      currentWebsiteEl.textContent = "Current Tab";
    }
  });

  // 2. Auto-format pairing code input
  if (inputPairingCode) {
    inputPairingCode.addEventListener("input", (e) => {
      let raw = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (raw.length > 9) raw = raw.substring(0, 9);

      let formatted = "";
      for (let i = 0; i < raw.length; i++) {
        if (i > 0 && (i === 3 || i === 6)) formatted += "-";
        formatted += raw[i];
      }
      e.target.value = formatted;
      hideMessages();
    });

    inputPairingCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && btnSubmitCode) btnSubmitCode.click();
    });
  }

  // 3. Initial Status Check
  refreshStatus();

  function refreshStatus() {
    chrome.runtime.sendMessage({ type: "GET_CONNECTION_STATUS" }, (status) => {
      if (chrome.runtime.lastError) {
        accountStatusTextEl.textContent = "Account: Not connected";
        disconnectedSection.classList.remove("hidden");
        connectedSection.classList.add("hidden");
        return;
      }

      if (status && status.connected) {
        accountStatusTextEl.textContent = "Account: Connected ✓";
        accountStatusTextEl.style.color = "#15803d";
        statusBadgeTagEl.textContent = "✓ Extension installed";
        statusBadgeTagEl.style.background = "#dcfce7";
        statusBadgeTagEl.style.color = "#166534";
        statusBadgeTagEl.style.borderColor = "#86efac";

        if (displayUserIdEl) {
          displayUserIdEl.textContent = status.user_id
            ? `ID: ${status.user_id.substring(0, 8)}...`
            : "Active";
        }

        disconnectedSection.classList.add("hidden");
        connectedSection.classList.remove("hidden");
      } else {
        accountStatusTextEl.textContent = "Account: Not connected";
        accountStatusTextEl.style.color = "#64748b";
        statusBadgeTagEl.textContent = "✓ Extension installed";
        statusBadgeTagEl.style.background = "#f1f5f9";
        statusBadgeTagEl.style.color = "#64748b";
        statusBadgeTagEl.style.borderColor = "#e2e8f0";

        if (status && status.error && status.error !== "Not connected") {
          showError(status.error);
        }

        disconnectedSection.classList.remove("hidden");
        connectedSection.classList.add("hidden");
      }
    });
  }

  // 4. Open Website Dashboard
  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener("click", async () => {
      const baseUrl = typeof getApiBaseUrl === "function" ? await getApiBaseUrl() : "https://edu-assist-two.vercel.app";
      chrome.tabs.create({ url: `${baseUrl}/dashboard/extension` });
    });
  }

  // 5. Submit Pairing Code
  if (btnSubmitCode) {
    btnSubmitCode.addEventListener("click", () => {
      const code = inputPairingCode.value.trim();
      if (!code || code.replace(/[^a-zA-Z0-9]/g, "").length < 6) {
        showError("Please enter a valid 9-character code.");
        inputPairingCode.focus();
        return;
      }

      btnSubmitCode.disabled = true;
      btnSubmitCode.textContent = "Verifying...";
      hideMessages();

      chrome.runtime.sendMessage({ type: "SUBMIT_PAIRING_CODE", code }, async (res) => {
        btnSubmitCode.disabled = false;
        btnSubmitCode.textContent = "Connect";

        if (chrome.runtime.lastError) {
          const baseUrl = typeof getApiBaseUrl === "function" ? await getApiBaseUrl() : "https://edu-assist-two.vercel.app";
          showError(`Server unavailable. Please ensure EduAssist (${getDisplayDomain(baseUrl)}) is reachable.`);
          return;
        }

        if (res && res.success) {
          inputPairingCode.value = "";
          showInfo("Account connected successfully! ✓");
          refreshStatus();
        } else {
          showError(res?.error || "Connection failed");
        }
      });
    });
  }

  // 6. Disconnect Account
  if (btnDisconnect) {
    btnDisconnect.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "DISCONNECT_EXTENSION" }, () => {
        showInfo("Disconnected successfully.");
        profileValuesData = {};
        sessionMappingCache.clear();
        if (mappingResultsSection) mappingResultsSection.classList.add("hidden");
        if (valuesPreviewSection) valuesPreviewSection.classList.add("hidden");
        if (autofillResultsSection) autofillResultsSection.classList.add("hidden");
        refreshStatus();
      });
    });
  }

  // 7. Toggle Review Mode
  if (btnToggleReviewMode) {
    btnToggleReviewMode.addEventListener("click", () => {
      isReviewMode = !isReviewMode;
      btnToggleReviewMode.classList.toggle("btn-review-active", isReviewMode);
      btnToggleReviewMode.textContent = isReviewMode ? "Done Reviewing" : "Review Mappings";
      renderMappingsList();
    });
  }

  // 8. Analyze Form (Direct Scripting Execution)
  if (btnAnalyzeForm) {
    btnAnalyzeForm.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          showError("Please open a normal webpage and try again.");
          return;
        }

        const activeTab = tabs[0];
        const tabUrl = activeTab.url || "";

        if (
          tabUrl.startsWith("chrome://") ||
          tabUrl.startsWith("chrome-extension://") ||
          tabUrl.startsWith("edge://") ||
          tabUrl.startsWith("about:") ||
          tabUrl.startsWith("view-source:") ||
          tabUrl.includes("chrome.google.com/webstore") ||
          tabUrl.includes("chromewebstore.google.com")
        ) {
          showError("This page cannot be analyzed by the extension.");
          return;
        }

        btnAnalyzeForm.disabled = true;
        btnAnalyzeForm.innerHTML = `
          <svg class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/>
          </svg>
          Analyzing...
        `;
        hideMessages();

        try {
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: extractPageFormFields,
          });

          if (!injectionResults || injectionResults.length === 0) {
            btnAnalyzeForm.disabled = false;
            btnAnalyzeForm.textContent = "Analyze Form";
            showError("Could not analyze this page.");
            return;
          }

          const response = injectionResults[0].result;
          if (!response || !response.success) {
            btnAnalyzeForm.disabled = false;
            btnAnalyzeForm.textContent = "Analyze Form";
            showError(response?.error || "Could not analyze this page.");
            return;
          }

          const rawFields = response.fields || [];

          // Map detected fields locally
          const mappedItems = rawFields.map((field) => {
            const cacheKey = normalizeText(field.label);
            if (sessionMappingCache.has(cacheKey)) {
              const cached = sessionMappingCache.get(cacheKey);
              return {
                ...cached,
                field_id: field.field_id,
                selector: field.selector,
                name: field.name,
                id: field.id,
                element_type: field.element_type,
                input_type: field.input_type,
                required: field.required,
                options: field.options,
              };
            }

            const localResult = mapSingleFieldLocally(field);
            sessionMappingCache.set(cacheKey, localResult);
            return localResult;
          });

          btnAnalyzeForm.disabled = false;
          btnAnalyzeForm.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Analyze Form
          `;

          finalizeMappings(mappedItems);
        } catch (err) {
          btnAnalyzeForm.disabled = false;
          btnAnalyzeForm.textContent = "Analyze Form";
          console.error("[SEA] analyze error:", err);
          showError("Please open a normal webpage and try again.");
        }
      });
    });
  }

  function finalizeMappings(mappedItems) {
    currentMappings = mappedItems;
    isReviewMode = false;
    confirmedSensitiveFields.clear();

    console.log(`[SEA] mapped fields: ${currentMappings.length}`);

    approvedFieldChecks = {};
    currentMappings.forEach((m) => {
      if (m.canonical_field === "aadhaar_number" || m.canonical_field === "pan_number") {
        approvedFieldChecks[m.field_id] = false;
      } else {
        approvedFieldChecks[m.field_id] = m.status !== "ignored";
      }
    });

    if (valuesPreviewSection) valuesPreviewSection.classList.add("hidden");
    if (autofillResultsSection) autofillResultsSection.classList.add("hidden");
    if (autofillConfirmBox) autofillConfirmBox.classList.add("hidden");
    renderMappingsList();
  }

  // 9. Render Smart Field Mappings (View 1)
  function renderMappingsList() {
    const total = currentMappings.length;

    if (total === 0) {
      if (fieldsDetectedSummary) fieldsDetectedSummary.textContent = "Fields detected: 0";
      if (mappingStatsBadge) mappingStatsBadge.textContent = "0 Fields";
      if (mappingList) {
        mappingList.innerHTML = `
          <div class="mapping-card" style="text-align: center; color: #64748b; padding: 12px;">
            No form fields found on this page.
          </div>
        `;
      }
      mappingResultsSection.classList.remove("hidden");
      return;
    }

    if (fieldsDetectedSummary) fieldsDetectedSummary.textContent = `Fields detected: ${total}`;
    const mappedCount = currentMappings.filter((m) => m.canonical_field !== null && m.status !== "ignored").length;
    if (mappingStatsBadge) mappingStatsBadge.textContent = `${mappedCount} Mapped`;

    if (mappingList) {
      mappingList.innerHTML = "";

      currentMappings.forEach((mapping, index) => {
        const cardEl = document.createElement("div");
        cardEl.className = "mapping-card";

        if (mapping.status === "ignored") cardEl.classList.add("card-ignored");
        if (mapping.needs_confirmation) cardEl.classList.add("card-needs-review");

        let targetDisplayName = mapping.canonical_display_name;
        let targetClass = "text-blue";
        if (mapping.source === "user_controlled") targetClass = "text-amber";
        if (mapping.source === "declaration") targetClass = "text-amber";
        if (mapping.source === "file_upload") targetClass = "text-emerald";
        if (mapping.status === "ignored") {
          targetDisplayName = "✕ Ignored field";
          targetClass = "text-slate";
        }

        let confidenceBadge = "";
        if (mapping.source === "ai_fallback") {
          const confPercent = Math.round((mapping.confidence || 0.9) * 100);
          confidenceBadge = `<span class="confidence-tag confidence-ai">✨ AI matched (${confPercent}%)</span>`;
        } else if (mapping.source === "declaration") {
          confidenceBadge = `<span class="confidence-tag confidence-decl">⚖ Declaration</span>`;
        } else if (mapping.source === "user_controlled" || mapping.source === "file_upload") {
          confidenceBadge = `<span class="confidence-tag confidence-high">${escapeHtml(mapping.canonical_display_name)}</span>`;
        } else if (mapping.needs_confirmation || mapping.confidence < 0.8) {
          confidenceBadge = `<span class="confidence-tag confidence-medium">⚠ Needs review</span>`;
        } else {
          confidenceBadge = `<span class="confidence-tag confidence-high">✓ High confidence</span>`;
        }

        const reqBadge = mapping.required ? '<span class="required-dot">*</span>' : "";

        cardEl.innerHTML = `
          <div class="mapping-flow">
            <div class="website-label-row">
              <span class="website-label-name">${index + 1}. ${escapeHtml(mapping.website_label)}${reqBadge}</span>
              ${confidenceBadge}
            </div>
            <div class="mapping-arrow">↓</div>
            <div class="canonical-target-row">
              <span class="canonical-name ${targetClass}">${escapeHtml(targetDisplayName)}</span>
            </div>
          </div>
        `;

        mappingList.appendChild(cardEl);
      });
    }

    mappingResultsSection.classList.remove("hidden");
  }

  // Helper: Fetch Profile Fields from backend
  function fetchProfileFieldsFromBackend(callback) {
    const requestedKeys = currentMappings
      .filter((m) => m.canonical_field !== null && m.status !== "ignored")
      .map((m) => m.canonical_field);

    if (requestedKeys.length === 0) {
      if (callback) callback({ success: false, error: "Requested profile fields are unavailable." });
      return;
    }

    const uniqueKeys = Array.from(new Set(requestedKeys));
    console.log(`[SEA] requested profile fields: ${uniqueKeys.length}`);

    chrome.runtime.sendMessage(
      {
        type: "FETCH_PROFILE_FIELDS",
        fields: uniqueKeys,
        confirmed_sensitive: Array.from(confirmedSensitiveFields),
      },
      (res) => {
        if (chrome.runtime.lastError) {
          console.warn("[SEA] Profile API request failed: Runtime messaging error", chrome.runtime.lastError);
          const baseUrl = typeof getApiBaseUrl === "function" ? await getApiBaseUrl() : "https://edu-assist-two.vercel.app";
          if (callback) callback({ success: false, error: `Server unavailable. Please ensure EduAssist (${getDisplayDomain(baseUrl)}) is reachable.` });
          return;
        }

        if (!res || !res.success) {
          const safeError = res?.error || "Profile request failed.";
          console.warn(`[SEA] Profile API request failed: ${safeError}`);
          if (callback) callback({ success: false, error: safeError });
          return;
        }

        profileValuesData = res.fields || {};
        let availableCount = 0;
        let unavailableCount = 0;
        Object.entries(profileValuesData).forEach(([fKey, f]) => {
          const isAvail = Boolean(f && f.available && (f.value || f.sensitive));
          console.log(`[SEA] profile field ${fKey} available: ${isAvail}`);
          if (isAvail) availableCount++;
          else unavailableCount++;
        });

        console.log(`[SEA] available profile fields: ${availableCount}`);
        console.log(`[SEA] unavailable profile fields: ${unavailableCount}`);

        if (callback) callback({ success: true, fields: profileValuesData });
      }
    );
  }

  // 10. Fetch & Preview Profile Values (Step 6C)
  if (btnFetchProfilePreview) {
    btnFetchProfilePreview.addEventListener("click", () => {
      btnFetchProfilePreview.disabled = true;
      btnFetchProfilePreview.textContent = "Fetching verified values...";
      hideMessages();

      fetchProfileFieldsFromBackend((res) => {
        btnFetchProfilePreview.disabled = false;
        btnFetchProfilePreview.textContent = "Preview Profile Values →";

        if (!res.success) {
          showError(res.error || "Failed to retrieve verified profile values.");
          return;
        }

        mappingResultsSection.classList.add("hidden");
        if (autofillConfirmBox) autofillConfirmBox.classList.add("hidden");
        if (autofillResultsSection) autofillResultsSection.classList.add("hidden");
        renderValuesPreviewList();
        valuesPreviewSection.classList.remove("hidden");
      });
    });
  }

  // 11. Render Profile Values Preview (View 2)
  function renderValuesPreviewList() {
    if (!valuesPreviewList) return;
    valuesPreviewList.innerHTML = "";

    currentMappings.forEach((mapping, index) => {
      if (mapping.status === "ignored") return;

      const cardEl = document.createElement("div");
      cardEl.className = "value-card";

      const isChecked = approvedFieldChecks[mapping.field_id] !== false;
      if (!isChecked) cardEl.classList.add("card-unapproved");

      let valueDisplayHtml = "";

      if (mapping.source === "user_controlled") {
        valueDisplayHtml = `
          <div class="preview-value-box">
            <span class="preview-value-text" style="color: #b45309;">🔒 User controlled (CAPTCHA / OTP)</span>
            <span class="badge-user-controlled">Manual</span>
          </div>
        `;
      } else if (mapping.source === "declaration") {
        valueDisplayHtml = `
          <div class="preview-value-box" style="background:#fffbeb; border:1px solid #fde68a;">
            <span class="preview-value-text" style="color: #b45309;">⚖ Legal Declaration • User confirmation required</span>
            <span class="badge-user-controlled">Manual Action</span>
          </div>
        `;
      } else if (mapping.source === "file_upload") {
        valueDisplayHtml = `
          <div class="preview-value-box">
            <span class="preview-value-text" style="color: #15803d;">📄 Document upload detected</span>
            <span class="badge-doc-upload">Manual Attachment</span>
          </div>
        `;
      } else if (mapping.canonical_field) {
        const fieldData = profileValuesData[mapping.canonical_field];

        if (!fieldData || fieldData.available === false) {
          valueDisplayHtml = `
            <div class="preview-value-box" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
              <span class="preview-value-text text-slate" style="font-style: italic; color: #94a3b8;">⚠ Not available in verified profile</span>
            </div>
          `;
        } else if (fieldData.sensitive) {
          if (fieldData.requires_explicit_confirmation && !fieldData.value) {
            valueDisplayHtml = `
              <div class="sensitive-lock-box">
                <div class="sensitive-title-group">
                  <span class="sensitive-tag">🔐 Sensitive • Masked</span>
                  <span class="masked-digits">${escapeHtml(fieldData.masked_value || "••••••••••••")}</span>
                </div>
                <button class="btn-unmask" data-field="${mapping.canonical_field}">[Show & Approve]</button>
              </div>
            `;
          } else {
            const sourceDocTag = fieldData.source_document
              ? `<span class="source-doc-pill">✓ From verified ${escapeHtml(fieldData.source_document)}</span>`
              : "";
            valueDisplayHtml = `
              <div class="preview-value-box" style="background: #fefce8; border: 1px solid #fde047;">
                <span class="preview-value-text font-mono">${escapeHtml(fieldData.value || "Not found")}</span>
                <span class="verified-tag">✓ Ready to fill</span>
              </div>
              ${sourceDocTag}
            `;
          }
        } else {
          let val = fieldData.value;
          if (val === undefined || val === null || val === "") {
            val = "⚠ Not available in verified profile";
          }

          if (mapping.canonical_field === "date_of_birth" && val && val.includes("-")) {
            const parts = val.split("-");
            if (parts.length === 3) val = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }

          const sourceDocTag = fieldData.source_document
            ? `<span class="source-doc-pill">✓ From verified ${escapeHtml(fieldData.source_document)}</span>`
            : "";

          valueDisplayHtml = `
            <div class="preview-value-box">
              <span class="preview-value-text">${escapeHtml(val)}</span>
              <span class="verified-tag">✓ Ready to fill</span>
            </div>
            ${sourceDocTag}
          `;
        }
      }

      const reqBadge = mapping.required ? '<span class="required-dot">*</span>' : "";

      cardEl.innerHTML = `
        <div class="value-card-header">
          <input
            type="checkbox"
            class="field-checkbox"
            data-id="${mapping.field_id}"
            ${isChecked ? "checked" : ""}
          />
          <div class="value-flow-body">
            <div class="value-row-top">
              <span class="website-field-title">${index + 1}. ${escapeHtml(mapping.website_label)}${reqBadge}</span>
            </div>
            <span class="canonical-subtext">→ ${escapeHtml(mapping.canonical_display_name)}</span>
            ${valueDisplayHtml}
          </div>
        </div>
      `;

      valuesPreviewList.appendChild(cardEl);
    });

    valuesPreviewList.querySelectorAll(".field-checkbox").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const fId = e.target.getAttribute("data-id");
        approvedFieldChecks[fId] = e.target.checked;
        const parentCard = e.target.closest(".value-card");
        if (parentCard) parentCard.classList.toggle("card-unapproved", !e.target.checked);
      });
    });

    valuesPreviewList.querySelectorAll(".btn-unmask").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const sensitiveKey = e.target.getAttribute("data-field");
        confirmedSensitiveFields.add(sensitiveKey);

        btn.disabled = true;
        btn.textContent = "Unmasking...";

        chrome.runtime.sendMessage(
          {
            type: "FETCH_PROFILE_FIELDS",
            fields: [sensitiveKey],
            confirmed_sensitive: Array.from(confirmedSensitiveFields),
          },
          (res) => {
            if (res && res.success && res.fields?.[sensitiveKey]) {
              profileValuesData[sensitiveKey] = res.fields[sensitiveKey];
              const matchingM = currentMappings.find((m) => m.canonical_field === sensitiveKey);
              if (matchingM) approvedFieldChecks[matchingM.field_id] = true;
              renderValuesPreviewList();
            }
          }
        );
      });
    });
  }

  // 12. Switch Back to Mapping Edit
  if (btnBackToMapping) {
    btnBackToMapping.addEventListener("click", () => {
      valuesPreviewSection.classList.add("hidden");
      mappingResultsSection.classList.remove("hidden");
      if (autofillConfirmBox) autofillConfirmBox.classList.add("hidden");
    });
  }

  // 13. Trigger Autofill Confirmation Prompt
  if (btnFillApprovedFields) {
    btnFillApprovedFields.addEventListener("click", () => {
      const fillableItems = currentMappings.filter((m) => {
        if (!approvedFieldChecks[m.field_id]) return false;
        if (m.source === "user_controlled" || m.source === "file_upload" || m.source === "declaration") return false;
        if (!m.canonical_field) return false;
        const fieldData = profileValuesData[m.canonical_field];
        if (!fieldData || fieldData.available === false) return false;
        if (fieldData.sensitive && !fieldData.value) return false;
        return Boolean(fieldData.value);
      });

      const count = fillableItems.length;
      if (confirmMessageText) {
        confirmMessageText.textContent = `You are about to fill ${count} fields on this website.`;
      }
      if (autofillConfirmBox) {
        autofillConfirmBox.classList.remove("hidden");
        autofillConfirmBox.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Cancel Confirmation
  if (btnCancelAutofill) {
    btnCancelAutofill.addEventListener("click", () => {
      if (autofillConfirmBox) autofillConfirmBox.classList.add("hidden");
    });
  }

  // 14. Execute Real Form Autofill on Active Tab
  if (btnConfirmAutofill) {
    btnConfirmAutofill.addEventListener("click", () => {
      if (autofillConfirmBox) autofillConfirmBox.classList.add("hidden");
      hideMessages();

      // Ensure profile data is fetched
      fetchProfileFieldsFromBackend((fetchRes) => {
        if (!fetchRes.success && Object.keys(profileValuesData).length === 0) {
          console.error("PROFILE VALUE NOT REACHING AUTOFILL");
          showError("Profile value not reaching autofill. Please verify account connection.");
          return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            showError("Active webpage tab not found.");
            return;
          }

          const activeTab = tabs[0];

          // Trace candidate values and build payload
          const autofillItems = [];
          let hasAvailableCandidate = false;

          currentMappings.forEach((mapping) => {
            const isApproved = approvedFieldChecks[mapping.field_id] !== false && mapping.status !== "ignored";
            const fieldData = mapping.canonical_field ? profileValuesData[mapping.canonical_field] : null;

            let val = null;
            if (fieldData && fieldData.available !== false) {
              val = fieldData.value || null;
            }

            if (mapping.canonical_field) {
              const isAvail = Boolean(val);
              if (isAvail) hasAvailableCandidate = true;
              console.log(`[SEA] autofill candidate:\n${mapping.canonical_field}\navailable: ${isAvail}`);
            }

            autofillItems.push({
              field_id: mapping.field_id,
              selector: mapping.selector,
              name: mapping.name,
              id: mapping.id,
              label: mapping.website_label,
              canonical_field: mapping.canonical_field,
              canonical_display_name: mapping.canonical_display_name,
              element_type: mapping.element_type,
              input_type: mapping.input_type,
              value: val,
              is_approved: isApproved,
              is_sensitive: Boolean(fieldData?.sensitive),
              is_user_controlled: mapping.source === "user_controlled",
              is_declaration: Boolean(mapping.is_declaration),
              is_file_upload: mapping.source === "file_upload",
              options: mapping.options,
            });
          });

          if (!hasAvailableCandidate) {
            console.error("PROFILE VALUE NOT REACHING AUTOFILL");
            showError("Profile value not reaching autofill.");
            return;
          }

          btnFillApprovedFields.disabled = true;
          btnFillApprovedFields.textContent = "Filling fields on page...";

          try {
            const injectionResults = await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: fillPageFormFields,
              args: [{ items: autofillItems }],
            });

            btnFillApprovedFields.disabled = false;
            btnFillApprovedFields.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              ✓ Fill Approved Fields
            `;

            if (!injectionResults || injectionResults.length === 0) {
              showError("Could not execute autofill on this page.");
              return;
            }

            const response = injectionResults[0].result;
            if (!response || !response.success) {
              showError(response?.error || "Autofill failed on page.");
              return;
            }

            // Switch to Results View
            valuesPreviewSection.classList.add("hidden");
            renderAutofillResults(response);
            autofillResultsSection.classList.remove("hidden");
          } catch (err) {
            btnFillApprovedFields.disabled = false;
            btnFillApprovedFields.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              ✓ Fill Approved Fields
            `;
            console.error("[SEA] Autofill error:", err);
            showError("Failed to fill webpage fields. Please check page permissions.");
          }
        });
      });
    });
  }

  // 15. Render Autofill Results (View 3)
  function renderAutofillResults(data) {
    const filledCount = data.filledCount || 0;
    const titleEl = document.querySelector("#autofillResultsSection .section-title");

    if (titleEl) {
      if (filledCount > 0) {
        titleEl.textContent = "AUTOFILL COMPLETE ✓";
        titleEl.style.color = "#16a34a";
      } else {
        titleEl.textContent = "AUTOFILL NOT COMPLETED";
        titleEl.style.color = "#dc2626";
      }
    }

    if (statFilledCount) statFilledCount.textContent = `${filledCount} fields filled`;
    if (statNeedsInputCount) statNeedsInputCount.textContent = `${data.needsInputCount || 0} need input`;
    if (statSkippedCount) statSkippedCount.textContent = `${data.skippedCount || 0} skipped`;

    if (!autofillResultsList) return;
    autofillResultsList.innerHTML = "";

    const results = data.results || [];
    results.forEach((item, index) => {
      const cardEl = document.createElement("div");
      cardEl.className = "value-card";

      let statusBadgeHtml = "";
      let valueText = item.verified_value || item.message;

      if (item.status === "filled" && item.filled) {
        statusBadgeHtml = `<span class="filled-tag">✓ Filled</span>`;
      } else if (item.status === "skipped") {
        statusBadgeHtml = `<span class="skipped-tag">${escapeHtml(item.message)}</span>`;
      } else if (item.status === "needs_input") {
        statusBadgeHtml = `<span class="needs-input-tag">${escapeHtml(item.message)}</span>`;
      } else {
        statusBadgeHtml = `<span class="needs-input-tag" style="background:#fee2e2; color:#b91c1c;">${escapeHtml(item.message || "Failed to update DOM")}</span>`;
      }

      cardEl.innerHTML = `
        <div class="value-flow-body">
          <div class="value-row-top">
            <span class="website-field-title">${index + 1}. ${escapeHtml(item.label)}</span>
            ${statusBadgeHtml}
          </div>
          <span class="canonical-subtext">→ ${escapeHtml(item.canonical_field || item.label)}</span>
          ${
            item.filled
              ? `<div class="preview-value-box" style="background:#f0fdf4; border:1px solid #bbf7d0;"><span class="preview-value-text" style="color:#15803d;">${escapeHtml(valueText)}</span></div>`
              : ""
          }
        </div>
      `;

      autofillResultsList.appendChild(cardEl);
    });
  }

  // 16. Results Navigation
  if (btnResetToValues) {
    btnResetToValues.addEventListener("click", () => {
      autofillResultsSection.classList.add("hidden");
      valuesPreviewSection.classList.remove("hidden");
    });
  }

  if (btnDoneAutofill) {
    btnDoneAutofill.addEventListener("click", () => {
      showInfo("Autofill complete! Please review and verify all fields on the page before submitting.");
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showError(msg) {
    errorMessageBox.textContent = msg;
    errorMessageBox.classList.remove("hidden");
    infoMessageBox.classList.add("hidden");
  }

  function showInfo(msg) {
    infoMessageBox.textContent = msg;
    infoMessageBox.classList.remove("hidden");
    errorMessageBox.classList.add("hidden");
  }

  function hideMessages() {
    errorMessageBox.classList.add("hidden");
    infoMessageBox.classList.add("hidden");
  }
});
