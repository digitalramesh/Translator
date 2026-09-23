import React from "react";
import { Sparkles, RotateCcw, Loader2, ArrowRight } from "lucide-react";
import { ProcessingStatus } from "../types";

interface TranslationControlsProps {
  onTranslate: () => void;
  onClearAll: () => void;
  status: ProcessingStatus;
  hasContent: boolean;
  translateToAll: boolean;
  targetLangName: string;
}

export const TranslationControls: React.FC<TranslationControlsProps> = ({
  onTranslate,
  onClearAll,
  status,
  hasContent,
  translateToAll,
  targetLangName,
}) => {
  const isProcessing =
    status === "extracting" ||
    status === "translating" ||
    status === "preparing";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>
          Translation powered by Google Gemini • Preserves complete structure & native scripts
        </span>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <button
          type="button"
          id="clear-all-data-btn"
          onClick={onClearAll}
          disabled={isProcessing || !hasContent}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <button
          type="button"
          id="translate-document-btn"
          onClick={onTranslate}
          disabled={isProcessing || !hasContent}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {translateToAll
                  ? "Translate to All 6 Languages"
                  : `Translate Document to ${targetLangName}`}
              </span>
              <ArrowRight className="w-4 h-4 opacity-75" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
