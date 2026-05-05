import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";

export async function GET() {
  // Try to get current user's AI provider
  let providerInfo = { provider: "groq", configured: false };

  try {
    const session = await auth();
    if (session?.user) {
      const userId = (session.user as unknown as { id: string }).id;
      await connectDB();
      const settings = await UserSettings.findOne({ userId });

      if (settings) {
        const provider = settings.aiProvider;
        const configured =
          (provider === "groq" && !!settings.groqApiKey) ||
          (provider === "gemini" && !!settings.geminiApiKey) ||
          provider === "ollama";
        providerInfo = { provider, configured };
      } else {
        // Check env vars
        if (process.env.GROQ_API_KEY) {
          providerInfo = { provider: "groq", configured: true };
        } else if (process.env.GEMINI_API_KEY) {
          providerInfo = { provider: "gemini", configured: true };
        }
      }
    }
  } catch {
    // No session or DB error — check env vars
    if (process.env.GROQ_API_KEY) {
      providerInfo = { provider: "groq", configured: true };
    } else if (process.env.GEMINI_API_KEY) {
      providerInfo = { provider: "gemini", configured: true };
    }
  }

  // For Ollama, also check if it's actually running
  if (providerInfo.provider === "ollama") {
    try {
      const res = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return Response.json({
          status: "error",
          message: "Ollama not responding. Run: ollama serve",
          provider: "ollama",
          configured: false,
        }, { status: 503 });
      }

      const data = await res.json();
      const models = (data.models || []).map((m: { name: string }) => m.name);

      return Response.json({
        status: "ok",
        provider: "ollama",
        configured: true,
        models,
        hasLlama3: models.some((n: string) => n.startsWith("llama3")),
      });
    } catch {
      return Response.json({
        status: "error",
        message: "Cannot connect to Ollama. Run: ollama serve",
        provider: "ollama",
        configured: false,
      }, { status: 503 });
    }
  }

  // For cloud providers (Groq / Gemini)
  if (!providerInfo.configured) {
    return Response.json({
      status: "error",
      message: `No API key configured for ${providerInfo.provider}. Go to Settings to add one.`,
      provider: providerInfo.provider,
      configured: false,
    }, { status: 503 });
  }

  return Response.json({
    status: "ok",
    provider: providerInfo.provider,
    configured: true,
    message: `${providerInfo.provider} is configured and ready`,
  });
}
