export type ExtractionStatus = "uploaded" | "processing" | "completed" | "failed";

export type DocumentType =
  | "transcript"
  | "certificate"
  | "id_card"
  | "test_score"
  | "recommendation"
  | "other";

export interface StudentDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  document_type: DocumentType;
  extraction_status: ExtractionStatus;
  extracted_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
