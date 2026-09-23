import React from "react";
import { Sparkles, Trash2, Copy, Check } from "lucide-react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

const SAMPLE_TEXT = `GOVERNMENT OF INDIA
MINISTRY OF SKILL DEVELOPMENT AND ENTREPRENEURSHIP
New Delhi - 110001

Subject: National Digital Literacy and Vocational Training Initiative for 2026.

Dear Citizens and Partners,

We are pleased to announce the nationwide launch of the Multilingual Skill Development Program across all primary districts. This initiative aims to equip over 1,500,000 youth with specialized digital engineering, artisanal craftsmanship, and modern agricultural logistics skills.

Key Program Highlights:
1. Free certified foundation courses in regional technical academies.
2. Full accessibility in state languages: Hindi, Kannada, Telugu, Tamil, and Malayalam.
3. Industry internships with a monthly stipend of ₹12,000 for verified participants.
4. Direct placement assistance through our unified national career portal (www.skillindia.gov.in).

Important Dates:
- Online registration opens: October 15, 2026
- Orientation webinars: November 1 - November 10, 2026
- Batch commencement: December 1, 2026

For queries, please contact the helpdesk at contact@skillindia.gov.in or call toll-free 1800-11-2026.

Sincerely,
Director of Technical Training & Regional Implementation
Government of India`;

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onClear,
  disabled = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadSample = () => {
    onChange(SAMPLE_TEXT);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Source Text Input
          </span>
          <button
            type="button"
            id="load-sample-text-btn"
            onClick={handleLoadSample}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Load Sample Document</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {value && (
            <>
              <button
                type="button"
                id="copy-source-text-btn"
                onClick={handleCopy}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 p-1 rounded-md transition-colors cursor-pointer"
                title="Copy text"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                id="clear-source-text-btn"
                onClick={onClear}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 p-1 rounded-md transition-colors cursor-pointer"
                title="Clear text"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 bg-white shadow-2xs">
        <textarea
          id="source-text-area"
          rows={7}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste or type content here in English, Hindi, Kannada, Telugu, Tamil, Malayalam or any language..."
          className="w-full p-4 text-sm text-slate-800 placeholder-slate-400 border-none outline-none resize-y leading-relaxed font-sans"
        />

        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <strong>{wordCount.toLocaleString()}</strong> words
            </span>
            <span>•</span>
            <span>
              <strong>{charCount.toLocaleString()}</strong> characters
            </span>
          </div>
          <span className="text-slate-400 text-2xs">
            Complete translation preserving headings & format
          </span>
        </div>
      </div>
    </div>
  );
};
