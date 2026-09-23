import React, { useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import {
  SingleTranslationResult,
  MultiLanguageResult,
  SUPPORTED_LANGUAGES,
} from "../types";
import { DownloadButtons } from "./DownloadButtons";
import { getBaseFileName, downloadAllAsZip } from "../utils/documentGenerator";

interface TranslationResultProps {
  originalText: string;
  originalFileName?: string | null;
  singleResult: SingleTranslationResult | null;
  multiResult: MultiLanguageResult | null;
  onTranslateAgain: () => void;
  onClear: () => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({
  originalText,
  originalFileName,
  singleResult,
  multiResult,
  onTranslateAgain,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<string>("te");
  const [copied, setCopied] = useState(false);

  const baseFileName = getBaseFileName(originalFileName);

  const isMulti = !!multiResult;

  // Compute active target details
  let currentTargetLangName = "";
  let currentTranslatedText = "";
  let currentWordCount = 0;
  let currentCharCount = 0;
  let sourceLangDisplay = "";

  if (isMulti && multiResult) {
    sourceLangDisplay = multiResult.detectedSourceLanguage || "Auto-detected";
    const currentTranslation = multiResult.translations[activeTab];
    if (currentTranslation) {
      currentTargetLangName = currentTranslation.languageName;
      currentTranslatedText = currentTranslation.translatedText;
      currentWordCount = currentTranslation.wordCount;
      currentCharCount = currentTranslation.charCount;
    }
  } else if (singleResult) {
    sourceLangDisplay = singleResult.sourceLang;
    currentTargetLangName = singleResult.targetLang;
    currentTranslatedText = singleResult.translatedText;
    currentWordCount = singleResult.wordCount;
    currentCharCount = singleResult.charCount;
  }

  const origWordCount = originalText.trim().split(/\s+/).filter(Boolean).length;
  const origCharCount = originalText.length;

  const handleCopy = () => {
    if (!currentTranslatedText) return;
    navigator.clipboard.writeText(currentTranslatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAllZip = () => {
    if (!multiResult) return;
    downloadAllAsZip(baseFileName, multiResult.translations);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: Status, Languages & Global Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Translation Complete</span>
            </span>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              <span className="text-slate-400">Source:</span>
              <strong className="text-slate-800">{sourceLangDisplay}</strong>
            </div>

            {!isMulti && (
              <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg">
                <span className="text-orange-500">Target:</span>
                <strong className="text-orange-900">{currentTargetLangName}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="translate-again-btn"
              onClick={onTranslateAgain}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Translate Again</span>
            </button>

            <button
              type="button"
              id="clear-result-btn"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
            >
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Multi-Language Tabs (if "Translate to All 6 Languages" was chosen) */}
        {isMulti && multiResult && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Languages:</span>
              </span>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = activeTab === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveTab(lang.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {lang.name} ({lang.nativeName})
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <span>Download All 6 Documents (.ZIP)</span>
            </button>
          </div>
        )}
      </div>

      {/* Two-Panel Interface on Desktop, Stacked Vertically on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT PANEL: Original Content */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Original Content
              </h3>
            </div>
            <div className="flex items-center gap-2 text-2xs text-slate-500 font-medium">
              <span>{origWordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{origCharCount.toLocaleString()} chars</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex-1 max-h-[500px] overflow-y-auto font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
            {originalText}
          </div>
        </div>

        {/* RIGHT PANEL: Translated Content */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="bg-orange-50/60 border-b border-orange-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                <span>{currentTargetLangName} Translation</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs text-orange-800/80 font-medium">
                {currentWordCount.toLocaleString()} words •{" "}
                {currentCharCount.toLocaleString()} chars
              </span>

              <button
                type="button"
                id="copy-translated-content-btn"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                title="Copy translated content"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex-1 max-h-[500px] overflow-y-auto font-indic text-sm sm:text-base text-slate-900 leading-relaxed whitespace-pre-wrap select-text bg-white">
            {currentTranslatedText || (
              <span className="text-slate-400 italic">No translation available.</span>
            )}
          </div>

          {/* Download Action Footer */}
          <div className="bg-slate-50/80 border-t border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">
              Download complete document in native script:
            </span>

            <DownloadButtons
              baseName={baseFileName}
              languageName={currentTargetLangName}
              content={currentTranslatedText}
              isAllView={isMulti}
              onDownloadAllZip={handleDownloadAllZip}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
