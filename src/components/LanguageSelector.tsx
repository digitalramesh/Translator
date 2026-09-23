import React from "react";
import { ArrowLeftRight, Check, Globe2 } from "lucide-react";
import { LanguageCode, SUPPORTED_LANGUAGES } from "../types";

interface LanguageSelectorProps {
  sourceLang: LanguageCode;
  onSourceLangChange: (lang: LanguageCode) => void;
  destinationLang: LanguageCode;
  onDestinationLangChange: (lang: LanguageCode) => void;
  translateToAll: boolean;
  onTranslateToAllChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLang,
  onSourceLangChange,
  destinationLang,
  onDestinationLangChange,
  translateToAll,
  onTranslateToAllChange,
  disabled = false,
}) => {
  const handleSwap = () => {
    if (sourceLang === "auto" || disabled) return;
    const oldSource = sourceLang;
    const oldDest = destinationLang;
    onSourceLangChange(oldDest);
    onDestinationLangChange(oldSource);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Source & Destination Dropdowns */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Source Language */}
          <div>
            <label
              htmlFor="source-language-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Source Language
            </label>
            <div className="relative">
              <select
                id="source-language-select"
                value={sourceLang}
                onChange={(e) => onSourceLangChange(e.target.value as LanguageCode)}
                disabled={disabled}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer disabled:opacity-50"
              >
                <option value="auto">✨ Auto Detect (Any Language)</option>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    disabled={lang.code === destinationLang}
                  >
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center sm:pt-5">
            <button
              type="button"
              id="swap-language-btn"
              onClick={handleSwap}
              disabled={disabled || sourceLang === "auto"}
              title={
                sourceLang === "auto"
                  ? "Cannot swap with Auto Detect"
                  : "Swap languages"
              }
              className={`p-2 rounded-full border border-slate-200 text-slate-500 transition-colors ${
                sourceLang === "auto" || disabled
                  ? "opacity-30 cursor-not-allowed bg-slate-50"
                  : "hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Language */}
          <div>
            <label
              htmlFor="destination-language-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Destination Language <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="destination-language-select"
                value={destinationLang}
                onChange={(e) => onDestinationLangChange(e.target.value as LanguageCode)}
                disabled={disabled || translateToAll}
                className={`w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer disabled:opacity-50 ${
                  translateToAll ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""
                }`}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    disabled={lang.code === sourceLang}
                  >
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Translate to All Languages Switch */}
        <div className="md:border-l md:border-slate-200 md:pl-5 flex items-center">
          <label
            htmlFor="translate-all-checkbox"
            className="flex items-center gap-3 p-2 rounded-lg bg-orange-50/50 hover:bg-orange-50 border border-orange-200/60 cursor-pointer transition-colors"
          >
            <input
              id="translate-all-checkbox"
              type="checkbox"
              checked={translateToAll}
              onChange={(e) => onTranslateToAllChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-orange-600 rounded-sm border-slate-300 focus:ring-orange-500 cursor-pointer"
            />
            <div className="select-none">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Globe2 className="w-3.5 h-3.5 text-orange-600" />
                <span>Translate to All 6 Languages</span>
              </div>
              <p className="text-2xs text-slate-500">
                Generate English, Hindi, Kannada, Telugu, Tamil & Malayalam
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
