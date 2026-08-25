export interface LiveFormFieldDescriptor {
  id?: string;
  name?: string;
  type: string;
  label: string;
  placeholder?: string;
  selector: string;
  required?: boolean;
  options?: string[];
  currentValue?: string;
  is_security_challenge?: boolean;
}

export interface FormFieldFillResult {
  selector: string;
  field_name?: string;
  field_label: string;
  field_type: string;
  matched_profile_field?: string;
  filled_value: string | null;
  display_value?: string;
  status: "filled" | "needs_user_input" | "security_challenge" | "skipped";
  notes?: string;
}

export interface BrowserSessionState {
  sessionId: string;
  url: string;
  pageTitle: string;
  status: "ready" | "analyzing" | "filling" | "user_control" | "closed";
  screenshotBase64: string;
  detectedFieldsCount: number;
  matchedFieldsCount: number;
  filledFieldsCount: number;
  needsInputCount: number;
  securityChallengeDetected: boolean;
  securityReason?: string;
  mappings: FormFieldFillResult[];
  statusMessage?: string;
  updatedAt: string;
}

export interface BrowserInteractionAction {
  type: "click" | "type" | "press" | "scroll" | "select";
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  selector?: string;
  value?: string;
  deltaX?: number;
  deltaY?: number;
}
