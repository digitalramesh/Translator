import React, { useState } from "react";
import { FileText, FileDown, Download, Archive, Loader2 } from "lucide-react";
import {
  downloadAsTxt,
  downloadAsDocx,
  downloadAsPdf,
} from "../utils/documentGenerator";

interface DownloadButtonsProps {
  baseName: string;
  languageName: string;
  content: string;
  onDownloadAllZip?: () => void;
  isAllView?: boolean;
}

export const DownloadButtons: React.FC<DownloadButtonsProps> = ({
  baseName,
  languageName,
  content,
  onDownloadAllZip,
  isAllView = false,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownload = async (format: "txt" | "docx" | "pdf") => {
    try {
      setDownloadingFormat(format);
      if (format === "txt") {
        downloadAsTxt(baseName, languageName, content);
      } else if (format === "docx") {
        await downloadAsDocx(baseName, languageName, content);
      } else if (format === "pdf") {
        await downloadAsPdf(baseName, languageName, content);
      }
    } catch (err) {
      console.error(`Failed to download ${format}:`, err);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 600);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Download TXT */}
      <button
        type="button"
        id={`download-txt-btn-${languageName}`}
        onClick={() => handleDownload("txt")}
        disabled={downloadingFormat !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        title="Download plain text file"
      >
        {downloadingFormat === "txt" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-slate-600" />
        )}
        <span>Download TXT</span>
      </button>

      {/* Download DOCX */}
      <button
        type="button"
        id={`download-docx-btn-${languageName}`}
        onClick={() => handleDownload("docx")}
        disabled={downloadingFormat !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        title="Download Microsoft Word document"
      >
        {downloadingFormat === "docx" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileDown className="w-3.5 h-3.5 text-blue-600" />
        )}
        <span>Download DOCX</span>
      </button>

      {/* Download PDF */}
      <button
        type="button"
        id={`download-pdf-btn-${languageName}`}
        onClick={() => handleDownload("pdf")}
        disabled={downloadingFormat !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        title="Download formatted PDF document with native Indic typography"
      >
        {downloadingFormat === "pdf" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 text-rose-600" />
        )}
        <span>Download PDF</span>
      </button>

      {/* Download All as ZIP (if available) */}
      {isAllView && onDownloadAllZip && (
        <button
          type="button"
          id="download-all-zip-btn"
          onClick={onDownloadAllZip}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
          title="Download all translations bundled in a ZIP archive"
        >
          <Archive className="w-3.5 h-3.5 text-emerald-700" />
          <span>Download All Translations (.ZIP)</span>
        </button>
      )}
    </div>
  );
};
