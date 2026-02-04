import type jsPDF from "jspdf";

export interface PdfHeaderOptions {
  organizationName: string;
  logoUrl?: string | null;
  documentTitle: string;
  subtitle?: string;
  isServer?: boolean;
}

/**
 * Loads an image from URL and converts it to base64 data URL
 * Handles both client-side (browser) and server-side (Node.js) environments
 */
export async function loadImageAsBase64(
  url: string,
  isServer = false,
): Promise<string | null> {
  try {
    if (isServer) {
      // Server-side: Use Node.js fetch with arrayBuffer
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      // Detect content type from response or default to jpeg
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${base64}`;
    }

    // Client-side: Use Blob and FileReader
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Failed to read image blob");
        reject(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
}

/**
 * Adds a standardized header to a PDF document with optional logo
 * Returns the Y position where content should start
 */
export async function addPdfHeader(
  doc: jsPDF,
  options: PdfHeaderOptions,
): Promise<number> {
  const {
    organizationName,
    logoUrl,
    documentTitle,
    subtitle,
    isServer = false,
  } = options;

  let yPosition = 15;
  const leftMargin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  // Try to load and add logo if provided
  let logoAdded = false;
  if (logoUrl) {
    try {
      const base64Image = await loadImageAsBase64(logoUrl, isServer);
      if (base64Image) {
        // Add logo at top-left with max dimensions 40x30
        const logoMaxWidth = 40;
        const logoMaxHeight = 30;

        // Try to add image, catch any format errors
        try {
          doc.addImage(
            base64Image,
            "JPEG", // jsPDF will auto-detect format
            leftMargin,
            yPosition,
            logoMaxWidth,
            logoMaxHeight,
            undefined,
            "FAST",
          );
          logoAdded = true;
        } catch (imageError) {
          console.error("Failed to add image to PDF:", imageError);
        }
      }
    } catch (error) {
      console.error("Failed to load logo for PDF:", error);
    }
  }

  // Add organization name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");

  if (logoAdded) {
    // Position org name next to logo
    doc.text(organizationName, leftMargin + 45, yPosition + 10);
    yPosition += 35; // Move down past logo
  } else {
    // Center org name if no logo
    doc.text(organizationName, centerX, yPosition, { align: "center" });
    yPosition += 10;
  }

  // Add document title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(documentTitle, centerX, yPosition, { align: "center" });
  yPosition += 8;

  // Add optional subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, centerX, yPosition, { align: "center" });
    yPosition += 8;
  }

  // Add separator line
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPosition, pageWidth - leftMargin, yPosition);
  yPosition += 5;

  return yPosition;
}
