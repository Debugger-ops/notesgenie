import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Progress from "@/models/Progress";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { mcqId, answers, knownCards, unknownCards, score, totalQuestions } =
      await request.json();

    if (!mcqId) {
      return Response.json({ error: "mcqId is required" }, { status: 400 });
    }

    await connectDB();

    const progress = await Progress.create({
      userId,
      mcqId,
      answers: answers ?? [],
      knownCards: knownCards ?? [],
      unknownCards: unknownCards ?? [],
      score: score ?? 0,
      totalQuestions: totalQuestions ?? 0,
      completedAt: new Date(),
    });

    return Response.json({ success: true, progress }, { status: 201 });
  } catch (error) {
    console.error("Save progress error:", error);
    return Response.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const mcqId = searchParams.get("mcqId");

    await connectDB();

    const query: Record<string, string> = { userId };
    if (mcqId) {
      query.mcqId = mcqId;
    }

    const progress = await Progress.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ success: true, progress });
  } catch (error) {
    console.error("Get progress error:", error);
    return Response.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
