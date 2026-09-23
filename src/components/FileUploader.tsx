import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { DocumentInfo } from "../types";

interface FileUploaderProps {
  documentInfo: DocumentInfo | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  isExtracting: boolean;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  documentInfo,
  onFileSelect,
  onRemoveFile,
  isExtracting,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndProcessFile = (file: File) => {
    setLocalError(null);
    const validExtensions = [".pdf", ".docx", ".txt", ".md", ".csv"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setLocalError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setLocalError("File is too large. Maximum supported file size is 25 MB.");
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {documentInfo && documentInfo.fileName ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate" title={documentInfo.fileName}>
                    {documentInfo.fileName}
                  </p>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    {documentInfo.fileName.split(".").pop()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  {documentInfo.fileSize && <span>{formatFileSize(documentInfo.fileSize)}</span>}
                  <span>•</span>
                  <span>{documentInfo.wordCount} words</span>
                  <span>•</span>
                  <span>{documentInfo.charCount} chars</span>
                </div>
              </div>
            </div>

            <button
              id="remove-file-button"
              type="button"
              onClick={onRemoveFile}
              disabled={disabled || isExtracting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove File</span>
            </button>
          </div>

          {isExtracting && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/50 p-2 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Extracting and parsing document contents...</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            id="drop-zone-container"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && !isExtracting && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-orange-500 bg-orange-50/40"
                : "border-slate-300 hover:border-orange-400 bg-white hover:bg-slate-50/50"
            } ${disabled || isExtracting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled || isExtracting}
            />

            <div className="w-12 h-12 mx-auto rounded-full bg-orange-100/80 text-orange-600 flex items-center justify-center mb-3">
              {isExtracting ? (
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-1">
              {isExtracting
                ? "Extracting document content..."
                : "Drag and drop your document here, or click to browse"}
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Supports PDF, DOCX, TXT (up to 25 MB)
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium">
              <span>PDF</span>
              <span className="text-slate-300">|</span>
              <span>DOCX</span>
              <span className="text-slate-300">|</span>
              <span>TXT</span>
            </div>
          </div>

          {localError && (
            <div className="mt-2.5 flex items-center gap-2 p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{localError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
