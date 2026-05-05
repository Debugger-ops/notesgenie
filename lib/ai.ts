/**
 * lib/ai.ts — unified AI entry point
 *
 * Reads provider config from:
 *   1. Caller-supplied ProviderConfig (for per-request overrides)
 *   2. Environment variables: AI_PROVIDER, GROQ_API_KEY, GEMINI_API_KEY
 *   3. Default: groq (if GROQ_API_KEY set) → gemini → ollama
 */

import {
  summarizeText as _summarize,
  generateMCQs as _generateMCQs,
  deepAnalyzeText as _deepAnalyze,
  type ProviderConfig,
  type SummaryResult,
  type DeepAnalysisResult,
  type MCQ,
} from "./ai-providers";

import { connectDB } from "./db";
import UserSettings from "@/models/UserSettings";

export type { SummaryResult, DeepAnalysisResult, MCQ, ProviderConfig };

/* ─────────────────────────────────────────
   RESOLVE PROVIDER CONFIG
   Priority: per-request → DB (userId) → env → default
───────────────────────────────────────── */

export async function resolveProviderConfig(
  userId?: string,
  override?: Partial<ProviderConfig>
): Promise<ProviderConfig> {
  // 1. Try user DB settings
  if (userId) {
    try {
      await connectDB();
      const settings = await UserSettings.findOne({ userId });

      if (settings) {
        const provider = override?.provider || settings.aiProvider;

        if (provider === "groq" && settings.groqApiKey) {
          return {
            provider: "groq",
            apiKey: settings.groqApiKey,
            model: override?.model || settings.groqModel || "llama-3.1-8b-instant",
          };
        }
        if (provider === "gemini" && settings.geminiApiKey) {
          return {
            provider: "gemini",
            apiKey: settings.geminiApiKey,
            model: override?.model || settings.geminiModel || "gemini-1.5-flash",
          };
        }
        if (provider === "ollama") {
          return {
            provider: "ollama",
            model: override?.model || settings.ollamaModel || "llama3.1:8b-instruct",
          };
        }
      }
    } catch { /* fallthrough to env */ }
  }

  // 2. Env variables fallback
  const envProvider = (process.env.AI_PROVIDER || "").toLowerCase() as ProviderConfig["provider"];

  if (envProvider === "groq" && process.env.GROQ_API_KEY) {
    return { provider: "groq", apiKey: process.env.GROQ_API_KEY };
  }
  if (envProvider === "gemini" && process.env.GEMINI_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY };
  }

  // 3. Auto-detect from env keys
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", apiKey: process.env.GROQ_API_KEY };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY };
  }

  // 4. Final fallback: Ollama local
  return { provider: "ollama" };
}

/* ─────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────── */

export async function summarizeText(
  text: string,
  userId?: string
): Promise<SummaryResult> {
  const cfg = await resolveProviderConfig(userId);
  return _summarize(text, cfg);
}

export async function generateMCQs(
  text: string,
  userId?: string,
  count = 10
): Promise<MCQ[]> {
  const cfg = await resolveProviderConfig(userId);
  return _generateMCQs(text, cfg, count);
}

export async function deepAnalyzeText(
  text: string,
  userId?: string
): Promise<DeepAnalysisResult> {
  const cfg = await resolveProviderConfig(userId);
  return _deepAnalyze(text, cfg);
}
