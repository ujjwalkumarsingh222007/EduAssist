export interface ExtractedField {
  value: string | number | boolean | null;
  confidence: number; // 0.0 to 1.0
  is_sensitive?: boolean;
}

export interface MarksheetSubject {
  subject_name: string;
  marks_obtained?: number | string | null;
  maximum_marks?: number | string | null;
  grade?: string | null;
  credits?: number | string | null;
}

export interface ExtractedTable {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  subjects?: MarksheetSubject[];
}

export interface ExtractionResult {
  document_type: string;
  confidence: number;
  fields: Record<string, ExtractedField>;
  tables?: ExtractedTable[];
  notes?: string;
}
