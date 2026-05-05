# 🧞 NoteGenie

A personalized AI-powered study tool that turns your PDFs and PowerPoint slides into summaries, exam notes, MCQ quizzes, and deep concept analysis — all saved to your own account.

Built with Next.js, MongoDB, and your choice of AI provider (Groq, Gemini, or Ollama).

---

## What it does

- **Upload any PDF or PPTX** — extracts the full text from your lecture slides or textbook chapters
- **AI-generated study notes** — auto-creates a summary, exam-focused bullet points, and key formulas
- **MCQ quiz** — generates 10 multiple choice questions with answers and explanations from your document
- **Deep Analysis** — produces a concept map, topic tags, difficulty rating, estimated read time, and personalized study tips
- **Edit & delete notes** — update any section of your notes or remove them from your dashboard
- **Persistent dashboard** — all your uploads, notes, and quizzes saved to your account

---

## AI Providers

You can use any of these — all have free tiers:

| Provider | Speed | Free Tier | Requires |
|----------|-------|-----------|----------|
| **Groq** | Ultra-fast | 14,400 req/day | API key from [console.groq.com](https://console.groq.com/keys) |
| **Google Gemini** | Fast | 1,500 req/day | API key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Ollama** | Local | Unlimited | [ollama.com](https://ollama.com) installed on your machine |

Rate limits are handled automatically — if a provider hits its limit, the app retries with exponential backoff.

Switch providers anytime from the **Settings** page in the app.

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd notegenie
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-studymate
# or use MongoDB Atlas: mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# AI Provider (optional — can also be set per-user in Settings)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Set which provider to use by default (groq | gemini | ollama)
AI_PROVIDER=groq
```

> **Tip:** `GROQ_API_KEY` or `GEMINI_API_KEY` in `.env.local` acts as a fallback for all users. Individual users can set their own keys in the Settings page which take priority.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. (Optional) Set up Ollama for local AI

If you want to run AI completely offline:

```bash
# Install Ollama from https://ollama.com
ollama pull llama3.1:8b-instruct
ollama serve
```

Then go to Settings in the app and switch your provider to **Ollama**.

---

## Project Structure

```
notegenie/
├── app/
│   ├── api/
│   │   ├── analyze-pdf/      # Deep PDF analysis endpoint
│   │   ├── health/           # AI provider health check
│   │   ├── notes/[id]/       # GET, PATCH, DELETE notes
│   │   ├── process-file/     # Main upload processing pipeline
│   │   ├── user-settings/    # AI provider config per user
│   │   └── ...
│   ├── dashboard/            # File history + stats
│   ├── notes/[id]/           # View, edit, delete notes
│   ├── settings/             # AI provider configuration
│   ├── upload/               # File upload page
│   └── mcq/[id]/             # MCQ quiz page
├── lib/
│   ├── ai-providers.ts       # Multi-provider AI engine (Groq/Gemini/Ollama)
│   ├── ai.ts                 # Unified AI entry point with provider resolution
│   ├── file-processor.ts     # PDF and PPTX text extraction
│   └── ...
├── models/
│   ├── Notes.ts              # Notes schema (includes deep analysis fields)
│   ├── UserSettings.ts       # Per-user AI provider settings
│   └── ...
└── components/
```

---

## Features in Detail

### Multi-provider AI with rate limit retry
`lib/ai-providers.ts` wraps Groq, Gemini, and Ollama behind a single interface. When a rate limit error (429) is hit, it automatically retries with exponential backoff (2s → 4s → 8s → 16s) before failing.

### Provider priority
1. User's saved settings in the database
2. Environment variables (`GROQ_API_KEY`, `GEMINI_API_KEY`, `AI_PROVIDER`)
3. Auto-detect from whichever key is present
4. Fallback to Ollama (local)

### Deep Analysis
Triggered by the "🔬 Deep Analysis" button on any notes page. Sends the full document text to the AI and returns:
- Enhanced summary (8–12 points)
- Concept map (key ideas and how they connect)
- Topic tags
- Difficulty level (beginner / intermediate / advanced)
- Estimated read time
- Personalized study tips

Results are saved back to the notes record in the database.

### Edit & Delete
- **Edit** — inline editing of title, summary, exam notes, formulas, and study tips. Each section editable as a text area (one item per line).
- **Delete** — available from both the notes page (modal confirmation) and the dashboard (inline confirmation row).

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB + Mongoose
- **Auth:** NextAuth v5
- **AI SDKs:** `groq-sdk`, `@google/generative-ai`, `ollama`
- **File parsing:** `pdf-parse`, `mammoth`, custom PPTX XML extractor
- **Styling:** CSS Modules

---

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```
