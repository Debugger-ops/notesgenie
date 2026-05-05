/**
 * Multi-provider AI engine
 * Supports: Groq, Gemini, Ollama
 * Features: rate-limit retry with exponential backoff, provider fallback chain
 */

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ollama } from "ollama";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

export type AIProvider = "groq" | "gemini" | "ollama";

export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;       // required for groq / gemini
  model?: string;        // override default model
}

export interface SummaryResult {
  summary: string[];
  examNotes: string[];
  keyFormulas: string[];
}

export interface DeepAnalysisResult {
  summary: string[];
  examNotes: string[];
  keyFormulas: string[];
  topics: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedReadTime: number;        // minutes
  conceptMap: { concept: string; relatedConcepts: string[] }[];
  studyTips: string[];
}

export interface MCQ {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}

/* ─────────────────────────────────────────
   DEFAULT MODELS
───────────────────────────────────────── */

const GROQ_DEFAULT_MODEL  = "llama-3.1-8b-instant";   // free, very fast
const GEMINI_DEFAULT_MODEL = "gemini-1.5-flash";       // free tier
const OLLAMA_DEFAULT_MODEL = "llama3.1:8b-instruct";

/* ─────────────────────────────────────────
   RATE-LIMIT RETRY HELPER
───────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  baseDelay = 2000
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;

      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("rate_limit") ||
        msg.includes("RateLimitError") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED");

      if (!isRateLimit) throw err;          // not a rate-limit – bail immediately

      const delay = baseDelay * Math.pow(2, attempt);   // 2s → 4s → 8s → 16s
      console.warn(`[AI] Rate limit hit (attempt ${attempt + 1}). Waiting ${delay}ms…`);
      await sleep(delay);
    }
  }

  throw lastErr;
}

/* ─────────────────────────────────────────
   SAFE JSON PARSER
───────────────────────────────────────── */

function safeParse(text: string): unknown {
  if (!text) return null;

  // 1. direct parse
  try { return JSON.parse(text); } catch {}

  // 2. fenced code block
  const code = text.match(/```(?:json)?([\s\S]*?)```/i);
  if (code) { try { return JSON.parse(code[1]); } catch {} }

  // 3. first {...} or [...] block
  const raw = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (raw) { try { return JSON.parse(raw[1]); } catch {} }

  return null;
}

/* ─────────────────────────────────────────
   PROVIDER CALL WRAPPERS
───────────────────────────────────────── */

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  cfg: ProviderConfig
): Promise<string> {
  const client = new Groq({ apiKey: cfg.apiKey });
  const model  = cfg.model || GROQ_DEFAULT_MODEL;

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  return res.choices[0]?.message?.content || "";
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  cfg: ProviderConfig
): Promise<string> {
  const genAI = new GoogleGenerativeAI(cfg.apiKey!);
  const model  = genAI.getGenerativeModel({
    model: cfg.model || GEMINI_DEFAULT_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  cfg: ProviderConfig
): Promise<string> {
  const client = new Ollama({ host: "http://localhost:11434" });
  const model  = cfg.model || OLLAMA_DEFAULT_MODEL;

  const res = await client.chat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
    format: "json",
    options: { temperature: 0 },
  });

  return res.message.content;
}

/* ─────────────────────────────────────────
   UNIFIED CALL (with per-provider retry)
───────────────────────────────────────── */

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  cfg: ProviderConfig
): Promise<string> {
  const call = () => {
    switch (cfg.provider) {
      case "groq":   return callGroq(systemPrompt, userPrompt, cfg);
      case "gemini": return callGemini(systemPrompt, userPrompt, cfg);
      case "ollama": return callOllama(systemPrompt, userPrompt, cfg);
      default:       throw new Error(`Unknown provider: ${cfg.provider}`);
    }
  };

  return withRetry(call);
}

/* ─────────────────────────────────────────
   VALIDATORS
───────────────────────────────────────── */

function validateSummary(data: unknown): SummaryResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const summary    = Array.isArray(d.summary)    ? d.summary.map(String)    : [];
  const examNotes  = Array.isArray(d.examNotes)  ? d.examNotes.map(String)  : [];
  const keyFormulas = Array.isArray(d.keyFormulas) ? d.keyFormulas.map(String) : [];

  if (summary.length === 0 && examNotes.length === 0) return null;
  return { summary, examNotes, keyFormulas };
}

function fixMCQ(q: unknown): MCQ | null {
  if (!q || typeof q !== "object") return null;
  const raw = q as Record<string, unknown>;

  const question = String(raw.question || "").trim();
  if (!question) return null;

  let options = Array.isArray(raw.options) ? raw.options.map(String).slice(0, 4) : [];
  while (options.length < 4) options.push("N/A");

  let correctAnswer = Number(raw.correctAnswer);
  if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) correctAnswer = 0;

  return {
    question,
    options: options as [string, string, string, string],
    correctAnswer,
    explanation: String(raw.explanation || "Not provided"),
  };
}

function sanitizeMCQs(data: unknown): MCQ[] {
  let arr: unknown[] = [];
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === "object") {
    for (const k of Object.keys(data as Record<string, unknown>)) {
      const v = (data as Record<string, unknown>)[k];
      if (Array.isArray(v)) { arr = v; break; }
    }
  }
  return arr.map(fixMCQ).filter(Boolean) as MCQ[];
}

/* ─────────────────────────────────────────
   PUBLIC: SUMMARIZE
───────────────────────────────────────── */

const SUMMARY_SYSTEM = `You are a strict JSON API for academic note summarization.
Output ONLY valid JSON with this exact schema:
{
  "summary": string[],
  "examNotes": string[],
  "keyFormulas": string[]
}
- summary: 5-10 concise bullet-point summaries
- examNotes: exam-focused key points and definitions
- keyFormulas: important equations/formulas with brief explanations
No extra keys, no markdown, no explanations outside the JSON.`;

export async function summarizeText(
  text: string,
  cfg: ProviderConfig
): Promise<SummaryResult> {
  const userPrompt = `Summarize the following text into study notes:\n\n${text.slice(0, 14000)}`;

  const MAX = 3;
  for (let i = 0; i < MAX; i++) {
    try {
      const raw = await callAI(SUMMARY_SYSTEM, userPrompt, cfg);
      const parsed = safeParse(raw);
      const result = validateSummary(parsed);
      if (result) return result;
    } catch (e) {
      if (i === MAX - 1) throw e;
    }
  }

  throw new Error("Failed to generate summary after multiple attempts");
}

/* ─────────────────────────────────────────
   PUBLIC: GENERATE MCQs
───────────────────────────────────────── */

const MCQ_SYSTEM = `You are a strict JSON API that generates multiple-choice questions.
Output ONLY a valid JSON array with this exact schema:
[
  {
    "question": string,
    "options": [string, string, string, string],
    "correctAnswer": number (0-3),
    "explanation": string
  }
]
No extra keys, no markdown, no text outside the JSON array.`;

export async function generateMCQs(
  text: string,
  cfg: ProviderConfig,
  count = 10
): Promise<MCQ[]> {
  const userPrompt = `Generate ${count} multiple-choice questions from this text:\n\n${text.slice(0, 14000)}`;

  const MAX = 3;
  for (let i = 0; i < MAX; i++) {
    try {
      const raw    = await callAI(MCQ_SYSTEM, userPrompt, cfg);
      const parsed = safeParse(raw);
      const clean  = sanitizeMCQs(parsed);
      if (clean.length > 0) return clean;
    } catch (e) {
      if (i === MAX - 1) throw e;
    }
  }

  throw new Error("Failed to generate MCQs after multiple attempts");
}

/* ─────────────────────────────────────────
   PUBLIC: DEEP PDF ANALYSIS
───────────────────────────────────────── */

const DEEP_SYSTEM = `You are a strict JSON API for deep academic document analysis.
Output ONLY valid JSON with this exact schema:
{
  "summary": string[],
  "examNotes": string[],
  "keyFormulas": string[],
  "topics": string[],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedReadTime": number,
  "conceptMap": [{ "concept": string, "relatedConcepts": string[] }],
  "studyTips": string[]
}
- summary: 8-12 detailed bullet points
- examNotes: comprehensive exam preparation notes
- keyFormulas: all equations with explanations
- topics: main topic tags (5-10 topics)
- difficulty: overall difficulty level
- estimatedReadTime: minutes to read the full document
- conceptMap: 5-8 key concepts with their related concepts
- studyTips: 3-5 personalized study recommendations
No extra keys, no markdown outside JSON.`;

export async function deepAnalyzeText(
  text: string,
  cfg: ProviderConfig
): Promise<DeepAnalysisResult> {
  const userPrompt = `Perform a deep academic analysis of this document:\n\n${text.slice(0, 16000)}`;

  const MAX = 3;
  for (let i = 0; i < MAX; i++) {
    try {
      const raw    = await callAI(DEEP_SYSTEM, userPrompt, cfg);
      const parsed = safeParse(raw) as Record<string, unknown> | null;

      if (parsed && typeof parsed === "object") {
        return {
          summary:       Array.isArray(parsed.summary)    ? parsed.summary.map(String)    : [],
          examNotes:     Array.isArray(parsed.examNotes)  ? parsed.examNotes.map(String)  : [],
          keyFormulas:   Array.isArray(parsed.keyFormulas)? parsed.keyFormulas.map(String): [],
          topics:        Array.isArray(parsed.topics)     ? parsed.topics.map(String)     : [],
          difficulty:    (["beginner","intermediate","advanced"].includes(parsed.difficulty as string)
                          ? parsed.difficulty : "intermediate") as DeepAnalysisResult["difficulty"],
          estimatedReadTime: Number(parsed.estimatedReadTime) || 5,
          conceptMap:    Array.isArray(parsed.conceptMap)
                          ? (parsed.conceptMap as unknown[]).map((c) => {
                              const cm = c as Record<string, unknown>;
                              return {
                                concept: String(cm.concept || ""),
                                relatedConcepts: Array.isArray(cm.relatedConcepts)
                                  ? cm.relatedConcepts.map(String) : [],
                              };
                            })
                          : [],
          studyTips:     Array.isArray(parsed.studyTips)  ? parsed.studyTips.map(String) : [],
        };
      }
    } catch (e) {
      if (i === MAX - 1) throw e;
    }
  }

  throw new Error("Deep analysis failed after multiple attempts");
}

/* ─────────────────────────────────────────
   PROVIDER HEALTH CHECK
───────────────────────────────────────── */

export async function checkProvider(cfg: ProviderConfig): Promise<{ ok: boolean; message: string }> {
  try {
    await callAI(
      "You are a JSON API. Return only: {\"ok\":true}",
      "Return {\"ok\":true}",
      cfg
    );
    return { ok: true, message: `${cfg.provider} is connected and working` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}
