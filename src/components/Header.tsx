import React from "react";
import { Languages, Sparkles } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Indian Language Translator
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3" />
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Translate documents and text into Indian languages with AI
              </p>
            </div>
          </div>

          {/* Supported Indian Languages Badges */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-600">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
              English
            </span>
            <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100 font-medium">
              हिंदी (Hindi)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-100 font-medium">
              ಕನ್ನಡ (Kannada)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium">
              తెలుగు (Telugu)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 font-medium">
              தமிழ் (Tamil)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 font-medium">
              മലയാളം (Malayalam)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
