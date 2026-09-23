import React, { useState } from "react";
import {
  FileUp,
  FileText,
  Languages,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { Header } from "./components/Header";
import { FileUploader } from "./components/FileUploader";
import { TextInput } from "./components/TextInput";
import { LanguageSelector } from "./components/LanguageSelector";
import { TranslationControls } from "./components/TranslationControls";
import { TranslationProgress } from "./components/TranslationProgress";
import { TranslationResult } from "./components/TranslationResult";
import { ErrorMessage } from "./components/ErrorMessage";
import {
  LanguageCode,
  DocumentInfo,
  ProcessingStatus,
  SingleTranslationResult,
  MultiLanguageResult,
  SUPPORTED_LANGUAGES,
} from "./types";

export default function App() {
  // Input mode: 'upload' | 'paste'
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");

  // Document state
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Pasted text state
  const [pastedText, setPastedText] = useState("");

  // Languages
  const [sourceLang, setSourceLang] = useState<LanguageCode>("auto");
  const [destinationLang, setDestinationLang] = useState<LanguageCode>("te"); // Default to Telugu
  const [translateToAll, setTranslateToAll] = useState(false);

  // Translation status & results
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [singleResult, setSingleResult] = useState<SingleTranslationResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiLanguageResult | null>(null);

  // Active source content based on mode
  const activeContent =
    inputMode === "upload" ? documentInfo?.rawText || "" : pastedText;
  const hasContent = activeContent.trim().length > 0;

  // Destination language full name
  const destLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === destinationLang);
  const destLangName = destLangObj
    ? `${destLangObj.name} (${destLangObj.nativeName})`
    : "Indian Language";

  // Handle file selection and extract text via server API
  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setIsExtracting(true);
    setStatusMessage("Extracting document content...");

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file from browser."));
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to extract text from this document. Please check the file and try again."
        );
      }

      setDocumentInfo({
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop() || "unknown",
        fileSize: file.size,
        rawText: data.text,
        wordCount: data.wordCount,
        charCount: data.charCount,
      });
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMessage(
        err.message || "Failed to process the document. Please try another file or paste text directly."
      );
    } finally {
      setIsExtracting(false);
      setStatusMessage("");
    }
  };

  const handleRemoveFile = () => {
    setDocumentInfo(null);
    setSingleResult(null);
    setMultiResult(null);
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleClearPastedText = () => {
    setPastedText("");
    setSingleResult(null);
    setMultiResult(null);
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleClearAll = () => {
    setDocumentInfo(null);
    setPastedText("");
    setSingleResult(null);
    setMultiResult(null);
    setStatus("idle");
    setProgressPercent(0);
    setStatusMessage("");
    setErrorMessage(null);
  };

  // Perform translation
  const handleTranslate = async () => {
    setErrorMessage(null);

    if (!hasContent) {
      setErrorMessage("No content provided. Please upload a document or paste text to translate.");
      return;
    }

    if (!translateToAll && sourceLang !== "auto" && sourceLang === destinationLang) {
      setErrorMessage("Source language and destination language cannot be the same.");
      return;
    }

    // Step 1: Extracting / verifying document
    setStatus("extracting");
    setProgressPercent(20);
    setStatusMessage("Extracting and verifying document content...");

    await new Promise((r) => setTimeout(r, 400));

    // Step 2: Translating
    setStatus("translating");
    setProgressPercent(45);
    setStatusMessage(
      translateToAll
        ? "Translating with Gemini into all 6 Indian languages..."
        : `Translating with Gemini into ${destLangName}...`
    );

    try {
      if (translateToAll) {
        const response = await fetch("/api/translate-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: activeContent,
            sourceLang,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Translation failed. Please try again.");
        }

        // Step 3: Preparing
        setStatus("preparing");
        setProgressPercent(85);
        setStatusMessage("Preparing multi-language documents and native font previews...");
        await new Promise((r) => setTimeout(r, 400));

        setMultiResult(data);
        setSingleResult(null);
      } else {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: activeContent,
            sourceLang,
            targetLang: destinationLang,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Translation failed. Please try again.");
        }

        // Step 3: Preparing
        setStatus("preparing");
        setProgressPercent(85);
        setStatusMessage("Preparing document and typography formatting...");
        await new Promise((r) => setTimeout(r, 300));

        setSingleResult(data);
        setMultiResult(null);
      }

      // Step 4: Complete
      setStatus("completed");
      setProgressPercent(100);
      setStatusMessage("Translation complete.");
    } catch (err: any) {
      console.error("Translation execution error:", err);
      setStatus("error");
      setErrorMessage(
        err.message ||
          "Unable to translate this document. Please check the network, API key, and content, then try again."
      );
    }
  };

  const isCompleted = status === "completed" && (singleResult || multiResult);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-orange-100 selection:text-orange-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error message alert */}
        <ErrorMessage
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />

        {/* Translation Progress Indicator (during translation) */}
        {(status === "extracting" ||
          status === "translating" ||
          status === "preparing") && (
          <TranslationProgress
            status={status}
            progressPercent={progressPercent}
            currentMessage={statusMessage}
          />
        )}

        {/* Translation Result View (if completed) */}
        {isCompleted && (
          <TranslationResult
            originalText={activeContent}
            originalFileName={documentInfo?.fileName}
            singleResult={singleResult}
            multiResult={multiResult}
            onTranslateAgain={handleTranslate}
            onClear={handleClearAll}
          />
        )}

        {/* Document Input Section (hidden or secondary when result is shown, or collapsible) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Step 1: Provide Content</span>
                <span className="text-xs font-normal text-slate-500">
                  (Choose document upload or paste text)
                </span>
              </h2>
            </div>

            {/* Input Mode Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
              <button
                type="button"
                id="mode-upload-tab"
                onClick={() => setInputMode("upload")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  inputMode === "upload"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileUp className="w-3.5 h-3.5 text-orange-600" />
                <span>Upload Document</span>
                {documentInfo?.fileName && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>

              <button
                type="button"
                id="mode-paste-tab"
                onClick={() => setInputMode("paste")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  inputMode === "paste"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Paste Text</span>
                {pastedText.trim() && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
            </div>
          </div>

          {/* Active Input Component */}
          {inputMode === "upload" ? (
            <FileUploader
              documentInfo={documentInfo}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              isExtracting={isExtracting}
              disabled={status === "translating" || status === "preparing"}
            />
          ) : (
            <TextInput
              value={pastedText}
              onChange={(val) => {
                setPastedText(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onClear={handleClearPastedText}
              disabled={status === "translating" || status === "preparing"}
            />
          )}

          {/* Step 2: Language Selection */}
          <div className="pt-2">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>Step 2: Select Languages</span>
            </h2>
            <LanguageSelector
              sourceLang={sourceLang}
              onSourceLangChange={setSourceLang}
              destinationLang={destinationLang}
              onDestinationLangChange={setDestinationLang}
              translateToAll={translateToAll}
              onTranslateToAllChange={setTranslateToAll}
              disabled={status === "translating" || status === "preparing"}
            />
          </div>

          {/* Step 3: Action Controls */}
          <div className="border-t border-slate-100 pt-4">
            <TranslationControls
              onTranslate={handleTranslate}
              onClearAll={handleClearAll}
              status={status}
              hasContent={hasContent}
              translateToAll={translateToAll}
              targetLangName={destLangName}
            />
          </div>
        </div>

        {/* Quality & Security Features Callout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600 shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Authentic Native Scripts
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generates proper Devanagari, Telugu, Kannada, Tamil & Malayalam scripts without transliteration clichés.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Complete Content Fidelity
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Preserves headings, lists, tables, numerical figures, currency, and entire multi-page document structure.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Private & Session-Safe
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Documents are processed in memory exclusively for the translation session; no files are permanently retained.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          Indian Language Translator • Complete Document Translation into Hindi, Kannada, Telugu, Tamil, Malayalam & English with Gemini
        </p>
      </footer>
    </div>
  );
}
