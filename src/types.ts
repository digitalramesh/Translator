export type LanguageCode = "auto" | "en" | "hi" | "kn" | "te" | "ta" | "ml";

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", script: "Latin" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", script: "Devanagari" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam" },
];

export type ProcessingStatus =
  | "idle"
  | "extracting"
  | "translating"
  | "preparing"
  | "completed"
  | "error";

export interface DocumentInfo {
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  rawText: string;
  wordCount: number;
  charCount: number;
}

export interface SingleTranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  targetLangCode: string;
  wordCount: number;
  charCount: number;
  chunksCount?: number;
}

export interface MultiLanguageResult {
  detectedSourceLanguage: string;
  translations: Record<
    string,
    {
      translatedText: string;
      wordCount: number;
      charCount: number;
      languageName: string;
    }
  >;
}
