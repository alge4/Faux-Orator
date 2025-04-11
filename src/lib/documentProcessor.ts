import mammoth from "mammoth";
// Commented out PDF-related imports to disable PDF support
// import "./pdf-canvas-shim";
// import { PDFExtract, PDFExtractOptions } from "pdf.js-extract";
// import { extractPdfTextBrowser } from "./pdf-browser-extractor";

/**
 * Extracts text content from different document types
 */
export async function extractDocumentContent(file: File): Promise<string> {
  try {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // Return a user-friendly message instead of processing PDF
      return "PDF processing is currently disabled. Please use another file format such as .docx or .md.";
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      return await extractWordContent(file);
    } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
      return await extractTextContent(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error("Error extracting document content:", error);
    throw new Error(
      `Failed to extract content from ${file.name}: ${error.message}`
    );
  }
}

/**
 * Extracts text from PDF files - DISABLED
 * Kept as a reference for future implementation
 */
// async function extractPdfContent(file: File): Promise<string> {
//   // PDF processing disabled
//   return "PDF processing is currently disabled. Please use another file format.";
// }

/**
 * Extracts text from Word documents using mammoth
 */
async function extractWordContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          return reject(new Error("Failed to read Word document"));
        }

        const buffer = e.target.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        resolve(result.value);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(new Error("Error reading Word document"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts text from plain text or markdown files
 */
async function extractTextContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          return reject(new Error("Failed to read text file"));
        }

        const text = e.target.result as string;
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(new Error("Error reading text file"));
    reader.readAsText(file);
  });
}

/**
 * Generates a preview of document content (truncated)
 */
export function generateContentPreview(
  content: string,
  maxLength: number = 200
): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Truncate to maxLength and add ellipsis
  return content.substring(0, maxLength) + "...";
}
