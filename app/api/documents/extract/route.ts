import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDocumentData } from "@/lib/ai/extractor";

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user (supports cookie sessions or Authorization Bearer header)
    const authHeader = req.headers.get("Authorization");
    let supabase = await createClient();
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { createServerClient } = await import("@supabase/ssr");
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          cookies: {
            getAll() {
              return [];
            },
            setAll() {},
          },
        }
      );

      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { document_id } = body;

    if (!document_id || typeof document_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid document_id parameter." },
        { status: 400 }
      );
    }

    // 3. Fetch document record (RLS ensures user can only query their own)
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Update status to 'processing'
    await supabase
      .from("documents")
      .update({
        extraction_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .eq("user_id", user.id);

    // 5. Download document file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("student-documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({
          extraction_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id)
        .eq("user_id", user.id);

      return NextResponse.json(
        { error: "Failed to download document from storage for processing." },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = getMimeType(document.file_name);

    // 6. Execute AI extraction (Server-Side)
    const extraction = await extractDocumentData(fileBuffer, mimeType);

    // 7. Save extracted data and update status to 'completed'
    // NOTE: Does NOT automatically submit or save to student profile table.
    // Stored in documents table for subsequent user review and confirmation.
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        extraction_status: "completed",
        document_type: extraction.document_type || document.document_type,
        extracted_data: extraction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Extracted data processed, but failed to save metadata to database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document_id,
      document_type: extraction.document_type,
      confidence: extraction.confidence,
      fields_count: Object.keys(extraction.fields || {}).length,
      extraction,
    });
  } catch (err: unknown) {
    // Privacy safeguard: never log document contents or extracted PII
    const errorMessage = err instanceof Error ? err.message : "Unknown error during extraction";
    console.error("AI Document extraction failed:", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
