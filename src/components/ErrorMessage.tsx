import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorMessageProps {
  message: string | null;
  onDismiss: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-2xs">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-0.5">
            Translation Error
          </h4>
          <p className="text-sm text-rose-700 leading-normal">{message}</p>
        </div>
      </div>

      <button
        type="button"
        id="dismiss-error-btn"
        onClick={onDismiss}
        className="text-rose-500 hover:text-rose-700 p-1 rounded-md transition-colors cursor-pointer shrink-0"
        title="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
