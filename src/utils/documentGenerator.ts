import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";

// Helper to trigger browser download
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Clean base filename without extension
export function getBaseFileName(fileName?: string | null): string {
  if (!fileName || !fileName.trim()) return "TranslatedDocument";
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

// Generate formatted filename e.g. Document_Telugu.docx
export function formatDownloadName(
  baseName: string,
  langName: string,
  extension: string
): string {
  // Extract pure language name if it contains native text e.g. "Telugu (తెలుగు)" -> "Telugu"
  const cleanLang = langName.split(" ")[0].replace(/[^a-zA-Z]/g, "") || "Translation";
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "Document";
  return `${cleanBase}_${cleanLang}.${extension}`;
}

// 1. Download as Plain Text (UTF-8)
export function downloadAsTxt(
  baseName: string,
  langName: string,
  content: string
) {
  const filename = formatDownloadName(baseName, langName, "txt");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename);
}

// 2. Download as Microsoft Word (.docx)
export async function downloadAsDocx(
  baseName: string,
  langName: string,
  content: string
) {
  const filename = formatDownloadName(baseName, langName, "docx");

  const lines = content.split("\n");
  const paragraphs: Paragraph[] = [];

  // Add document header
  paragraphs.push(
    new Paragraph({
      text: `${baseName} - ${langName} Translation`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Translated via Indian Language Translator on ${new Date().toLocaleDateString()}`,
          italics: true,
          size: 18,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Parse lines into paragraphs
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace("### ", ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace("## ", ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace("# ", ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed.substring(2))],
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed)],
          spacing: { after: 160 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}

// 3. Download as PDF (high-fidelity canvas render for Indic script ligatures)
export async function downloadAsPdf(
  baseName: string,
  langName: string,
  content: string
) {
  const filename = formatDownloadName(baseName, langName, "pdf");

  // Create an off-screen container rendered with Indian language fonts
  const printContainer = document.createElement("div");
  printContainer.style.position = "fixed";
  printContainer.style.left = "-9999px";
  printContainer.style.top = "0";
  printContainer.style.width = "794px"; // Standard A4 width at 96 DPI
  printContainer.style.padding = "48px 56px";
  printContainer.style.backgroundColor = "#ffffff";
  printContainer.style.color = "#1e293b";
  printContainer.style.fontFamily =
    "'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Kannada', 'Noto Sans Tamil', 'Noto Sans Malayalam', 'Plus Jakarta Sans', sans-serif";
  printContainer.style.fontSize = "14px";
  printContainer.style.lineHeight = "1.75";
  printContainer.style.boxSizing = "border-box";

  // Build document HTML
  const headerHtml = `
    <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">${baseName}</h1>
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
        <span><strong>Language:</strong> ${langName}</span>
        <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `;

  // Format paragraphs
  const paragraphs = content
    .split("\n\n")
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("# ")) {
        return `<h2 style="font-size: 18px; font-weight: 700; margin: 20px 0 10px 0; color: #0f172a;">${trimmed.replace(
          "# ",
          ""
        )}</h2>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #1e293b;">${trimmed.replace(
          "## ",
          ""
        )}</h3>`;
      }
      if (trimmed.startsWith("### ")) {
        return `<h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 6px 0; color: #334155;">${trimmed.replace(
          "### ",
          ""
        )}</h4>`;
      }
      return `<p style="margin: 0 0 14px 0; text-align: justify; word-break: break-word;">${trimmed.replace(
        /\n/g,
        "<br/>"
      )}</p>`;
    })
    .join("");

  const footerHtml = `
    <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      Generated by Indian Language Translator • Powered by Google Gemini AI
    </div>
  `;

  printContainer.innerHTML = headerHtml + paragraphs + footerHtml;
  document.body.appendChild(printContainer);

  try {
    const canvas = await html2canvas(printContainer, {
      scale: 2, // 2x resolution for razor-sharp typography
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate height in PDF points
    const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Subsequent pages if long document
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(printContainer);
  }
}

// 4. Download All Translations as a ZIP file
export async function downloadAllAsZip(
  baseName: string,
  translations: Record<
    string,
    {
      translatedText: string;
      wordCount: number;
      charCount: number;
      languageName: string;
    }
  >
) {
  const zip = new JSZip();
  const folder = zip.folder(`${baseName}_All_Translations`);

  for (const [_code, info] of Object.entries(translations)) {
    const txtName = formatDownloadName(baseName, info.languageName, "txt");
    folder?.file(txtName, info.translatedText);
  }

  // Also include a summary metadata file
  const summaryLines = [
    `Indian Language Translator - Batch Translation Archive`,
    `Original Document: ${baseName}`,
    `Date: ${new Date().toLocaleString()}`,
    `Included Languages:`,
    ...Object.values(translations).map(
      (t) => `- ${t.languageName}: ${t.wordCount} words (${t.charCount} characters)`
    ),
  ];
  folder?.file("TRANSLATION_SUMMARY.txt", summaryLines.join("\n"));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${baseName}_All_6_Translations.zip`);
}
