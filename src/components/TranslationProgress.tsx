import React from "react";
import { Loader2, CheckCircle2, FileText, Sparkles, Download } from "lucide-react";
import { ProcessingStatus } from "../types";

interface TranslationProgressProps {
  status: ProcessingStatus;
  progressPercent: number;
  currentMessage: string;
}

export const TranslationProgress: React.FC<TranslationProgressProps> = ({
  status,
  progressPercent,
  currentMessage,
}) => {
  if (status === "idle" || status === "error") return null;

  const steps = [
    { key: "extracting", label: "Extracting document", icon: FileText },
    { key: "translating", label: "Translating with Gemini", icon: Sparkles },
    { key: "preparing", label: "Preparing document", icon: Download },
  ];

  const getStepStatus = (stepKey: string) => {
    if (status === "completed") return "done";
    if (status === stepKey) return "current";
    if (stepKey === "extracting" && (status === "translating" || status === "preparing")) {
      return "done";
    }
    if (stepKey === "translating" && status === "preparing") {
      return "done";
    }
    return "pending";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
          )}
          <span className="text-sm font-semibold text-slate-800">
            {currentMessage || (status === "completed" ? "Translation complete" : "Processing...")}
          </span>
        </div>
        <span className="text-xs font-bold text-orange-600">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
        <div
          className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {steps.map((s) => {
          const stepStatus = getStepStatus(s.key);
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={`p-2 rounded-lg border transition-all ${
                stepStatus === "done"
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                  : stepStatus === "current"
                  ? "bg-orange-50 border-orange-300 text-orange-900 font-semibold"
                  : "bg-slate-50/50 border-slate-200 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {stepStatus === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : stepStatus === "current" ? (
                  <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
