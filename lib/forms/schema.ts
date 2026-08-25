export type FormFieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "textarea"
  | "file";

export interface InternalFormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  profile_field?: string;
  description?: string;
  is_sensitive?: boolean;
  is_document_upload?: boolean;
}

export interface InternalFormSection {
  id: string;
  name: string;
  description?: string;
  fields: InternalFormField[];
}

export interface ApplicationFormSchema {
  application_name: string;
  provider?: string;
  source_url: string;
  instructions?: string;
  sections: InternalFormSection[];
}

export interface ApplicationFormFieldValue {
  value: string | string[] | null;
  is_from_profile: boolean;
  is_sensitive?: boolean;
  linked_document_id?: string;
  linked_document_name?: string;
}

export type ApplicationFormData = Record<string, ApplicationFormFieldValue>;

export interface ApplicationFormRecord {
  id: string;
  user_id: string;
  source_url: string;
  application_name: string;
  form_schema: ApplicationFormSchema;
  form_data: ApplicationFormData;
  status: "draft" | "completed";
  created_at: string;
  updated_at: string;
}

export interface FormCompletionStats {
  total_fields: number;
  required_fields: number;
  filled_fields: number;
  profile_filled_fields: number;
  missing_required_fields: number;
  completion_percentage: number;
}
