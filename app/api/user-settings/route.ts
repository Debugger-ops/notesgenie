import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { checkProvider, type ProviderConfig } from "@/lib/ai-providers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    await connectDB();

    let settings = await UserSettings.findOne({ userId });

    // Return defaults if no settings saved yet
    if (!settings) {
      return Response.json({
        aiProvider: "groq",
        groqApiKey: "",
        geminiApiKey: "",
        groqModel: "llama-3.1-8b-instant",
        geminiModel: "gemini-1.5-flash",
        ollamaModel: "llama3.1:8b-instruct",
      });
    }

    return Response.json({
      aiProvider: settings.aiProvider,
      groqApiKey: settings.groqApiKey ? "••••••••" + settings.groqApiKey.slice(-4) : "",
      geminiApiKey: settings.geminiApiKey ? "••••••••" + settings.geminiApiKey.slice(-4) : "",
      groqModel: settings.groqModel,
      geminiModel: settings.geminiModel,
      ollamaModel: settings.ollamaModel,
      hasGroqKey: !!settings.groqApiKey,
      hasGeminiKey: !!settings.geminiApiKey,
    });
  } catch (error) {
    console.error("GET user-settings error:", error);
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const body = await request.json();
    const { aiProvider, groqApiKey, geminiApiKey, groqModel, geminiModel, ollamaModel } = body;

    await connectDB();

    const update: Record<string, unknown> = {};
    if (aiProvider) update.aiProvider = aiProvider;
    if (groqModel) update.groqModel = groqModel;
    if (geminiModel) update.geminiModel = geminiModel;
    if (ollamaModel) update.ollamaModel = ollamaModel;
    // Only update keys if a real value was submitted (not the masked "••••••••xxxx")
    if (groqApiKey && !groqApiKey.startsWith("••••")) update.groqApiKey = groqApiKey.trim();
    if (geminiApiKey && !geminiApiKey.startsWith("••••")) update.geminiApiKey = geminiApiKey.trim();

    await UserSettings.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST user-settings error:", error);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Test connection for the given provider config
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { provider } = await request.json();

    await connectDB();
    const settings = await UserSettings.findOne({ userId });

    let cfg: ProviderConfig;

    if (provider === "groq") {
      const key = settings?.groqApiKey || process.env.GROQ_API_KEY || "";
      if (!key) return Response.json({ ok: false, message: "No Groq API key set" });
      cfg = { provider: "groq", apiKey: key, model: settings?.groqModel };
    } else if (provider === "gemini") {
      const key = settings?.geminiApiKey || process.env.GEMINI_API_KEY || "";
      if (!key) return Response.json({ ok: false, message: "No Gemini API key set" });
      cfg = { provider: "gemini", apiKey: key, model: settings?.geminiModel };
    } else {
      cfg = { provider: "ollama", model: settings?.ollamaModel };
    }

    const result = await checkProvider(cfg);
    return Response.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Test failed";
    return Response.json({ ok: false, message: msg });
  }
}
