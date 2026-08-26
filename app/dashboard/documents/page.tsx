"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StudentDocument, DocumentType, ExtractionStatus } from "@/lib/types/document";
import ExtractionReviewModal from "@/components/documents/ExtractionReviewModal";
import {
  FileText,
  Upload,
  Loader2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  RotateCw,
  Eye,
  ArrowRight,
  User,
} from "lucide-react";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "transcript", label: "Marksheet / Academic Transcript" },
  { value: "certificate", label: "Degree / Diploma Certificate" },
  { value: "id_card", label: "Aadhaar / PAN / National ID / College ID" },
  { value: "test_score", label: "Standardized Test Score (JEE, NEET, CUET, etc.)" },
  { value: "recommendation", label: "Income / Caste / Domicile Certificate" },
  { value: "other", label: "Other Student Document" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>("transcript");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [reviewDoc, setReviewDoc] = useState<StudentDocument | null>(null);
  const [profileUpdatedToast, setProfileUpdatedToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        loadDocuments();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const isAuthenticated = !userError && !!user;
      console.log(`[DOCS] authenticated user: ${isAuthenticated}`);

      if (userError || !user) {
        console.log(`[DOCS] document query executed: false`);
        setErrorMessage("Please log in to view your documents.");
        setLoading(false);
        return;
      }

      console.log(`[DOCS] document query executed: true`);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DOCS] Error fetching documents:", error.message);
        console.log(`[DOCS] documents returned: 0`);
        setErrorMessage("Unable to load your documents. Please try again.");
      } else {
        const docList = (data as StudentDocument[]) || [];
        console.log(`[DOCS] documents returned: ${docList.length}`);
        setDocuments(docList);
      }
    } catch (err: unknown) {
      console.error("[DOCS] Unexpected error:", err);
      console.log(`[DOCS] documents returned: 0`);
      setErrorMessage("Unable to load your documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(file: File) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage("Only PDF and image files (.png, .jpg, .jpeg, .webp) are supported.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File size must be under 15 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");
      setSuccessMessage("");
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("You must be logged in to upload documents.");
        setUploading(false);
        return;
      }

      // Generate secure storage path: user_id/timestamp_filename
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}_${sanitizedName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        setErrorMessage(
          uploadError.message ||
            "Failed to upload file to storage. Ensure 'student-documents' bucket is created in Supabase."
        );
        setUploading(false);
        return;
      }

      // 2. Insert metadata row into documents table
      const { data: docData, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: storagePath,
          document_type: selectedType,
          extraction_status: "uploaded",
          extracted_data: {},
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        setErrorMessage(
          "File uploaded to storage, but failed to save document metadata in database."
        );
      } else if (docData) {
        const newDoc = docData as StudentDocument;
        setDocuments((prev) => [newDoc, ...prev]);
        setSuccessMessage(`"${selectedFile.name}" uploaded successfully! Click "Analyze with AI" to extract information.`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setErrorMessage("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(doc: StudentDocument) {
    try {
      setAnalyzingId(doc.id);
      setErrorMessage("");
      setSuccessMessage("");
      setProfileUpdatedToast(null);

      // Update local state to processing
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, extraction_status: "processing" } : d))
      );

      // Call server extraction endpoint
      const res = await fetch("/api/documents/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: doc.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI extraction failed. Please try again.");
      }

      // Update document record in state
      const updatedDoc: StudentDocument = {
        ...doc,
        extraction_status: "completed",
        document_type: data.document_type || doc.document_type,
        extracted_data: data.extraction,
      };

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updatedDoc : d)));
      setSuccessMessage(`AI analysis complete for "${doc.file_name}"! Opening review...`);

      // Open review modal automatically for user confirmation
      setReviewDoc(updatedDoc);
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : "AI analysis encountered an error.";
      setErrorMessage(msg);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, extraction_status: "failed" } : d))
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleView(filePath: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
        alert("Failed to generate secure preview link.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("View error:", err);
      alert("Unable to open document.");
    }
  }

  async function handleDelete(doc: StudentDocument) {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

    try {
      setDeletingId(doc.id);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("You must be logged in to delete documents.");
        return;
      }

      // 1. Delete from storage (strictly scoped to user.id path prefix)
      if (doc.file_path.startsWith(`${user.id}/`)) {
        await supabase.storage.from("student-documents").remove([doc.file_path]);
      }

      // 2. Delete from database (strictly scoped to user.id)
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id)
        .eq("user_id", user.id);

      if (error) {
        setErrorMessage("Failed to delete document record from database.");
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        setSuccessMessage(`Document "${doc.file_name}" deleted.`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleConfirmSuccess(updatedName?: string) {
    setProfileUpdatedToast(
      updatedName
        ? `Profile for ${updatedName} successfully updated with confirmed data!`
        : "Student profile updated successfully with confirmed data!"
    );
    loadDocuments();
  }

  function getStatusBadge(status: ExtractionStatus) {
    switch (status) {
      case "uploaded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Uploaded (Pending AI)
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            AI Analyzing...
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck className="w-3.5 h-3.5" />
            Extracted
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Extraction Failed
          </span>
        );
    }
  }

  function getTypeLabel(type: DocumentType) {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (["png", "jpg", "jpeg", "webp"].includes(ext || ""))
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    return <FileSpreadsheet className="w-5 h-5 text-slate-500" />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Student Documents</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload marksheets, Aadhaar, PAN, certificates, and IDs. AI will extract your information for your review.
        </p>
      </div>

      {/* Profile Updated Success Toast Banner */}
      {profileUpdatedToast && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3.5 rounded-xl text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{profileUpdatedToast}</p>
          </div>
          <Link
            href="/dashboard/profile"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            View My Profile <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* General Notifications */}
      {successMessage && !profileUpdatedToast && (
        <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Notice</p>
            <p className="text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Box Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-10">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Upload New Document</h2>
            <p className="text-xs text-slate-500">
              PDFs and images supported (Marksheets, Aadhaar, PAN, Certificates, IDs)
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-5">
          {/* Document Type Selector */}
          <div>
            <label htmlFor="doc_type" className="block text-sm font-medium text-slate-700 mb-1.5">
              Document Category <span className="text-red-500">*</span>
            </label>
            <select
              id="doc_type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="w-full sm:w-96 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-blue-500 bg-blue-50/50"
                : selectedFile
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
                {selectedFile ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6 text-blue-600" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                  </p>
                  <p className="text-xs text-blue-600 mt-2 hover:underline">Click or drop another file to change</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Drag and drop your file here, or <span className="text-blue-600 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, or WEBP (Max 15 MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to Secure Storage...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">
            Uploaded Documents ({documents.length})
          </h2>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading your documents...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white rounded-2xl border border-red-200 bg-red-50/20 p-12 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Unable to load your documents</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
              {errorMessage}
            </p>
            <button
              onClick={loadDocuments}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">You haven't uploaded any documents yet.</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Upload your marksheet, Aadhaar, certificates, or scorecards above to extract your profile information automatically.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const isAnalyzingThis = analyzingId === doc.id || doc.extraction_status === "processing";

                return (
                  <div
                    key={doc.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Left file icon & title */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                        {getFileIcon(doc.file_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">
                            {getTypeLabel(doc.document_type)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400">
                            {new Date(doc.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right status & Action controls */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div>{getStatusBadge(doc.extraction_status)}</div>

                      {/* AI Action Button based on status */}
                      <div>
                        {doc.extraction_status === "uploaded" && (
                          <button
                            onClick={() => handleAnalyze(doc)}
                            disabled={isAnalyzingThis}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Analyze with AI
                          </button>
                        )}

                        {doc.extraction_status === "processing" && (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 cursor-not-allowed"
                          >
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            AI is analyzing...
                          </button>
                        )}

                        {doc.extraction_status === "completed" && (
                          <button
                            onClick={() => setReviewDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Extracted Info
                          </button>
                        )}

                        {doc.extraction_status === "failed" && (
                          <button
                            onClick={() => handleAnalyze(doc)}
                            disabled={isAnalyzingThis}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            Try Again
                          </button>
                        )}
                      </div>

                      {/* Document Preview & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(doc.file_path)}
                          title="View Document File"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          title="Delete Document"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Review & Confirmation Modal */}
      {reviewDoc && (
        <ExtractionReviewModal
          isOpen={!!reviewDoc}
          onClose={() => setReviewDoc(null)}
          document={reviewDoc}
          onConfirmSuccess={handleConfirmSuccess}
        />
      )}
    </div>
  );
}
