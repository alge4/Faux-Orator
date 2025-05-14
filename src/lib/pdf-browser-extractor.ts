/**
 * Browser-compatible PDF text extraction using pdfjs-dist
 */
import * as PDFJS from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";

// Set the worker source to our local copy for production
// and fallback to CDN for development if the local file isn't available
try {
  GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";
} catch (error) {
  console.warn(
    "Failed to set PDF.js worker source, trying CDN fallback:",
    error
  );
  // Fallback to CDN
  GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

/**
 * Extract text from a PDF file using the browser-compatible PDF.js library
 */
export async function extractPdfTextBrowser(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    // Load the PDF document
    const pdf = await PDFJS.getDocument({ data: buffer }).promise;

    let fullText = "";

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Concatenate the text items with spaces
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      fullText += pageText + "\n\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}
