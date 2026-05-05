import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { plan } = await request.json();

    if (!plan || !["free", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Must be 'free' or 'pro'" },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {
      "subscription.plan": plan,
    };

    if (plan === "pro") {
      updateData["subscription.uploadsLimit"] = 999999;
    } else {
      updateData["subscription.uploadsLimit"] = 3;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return Response.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
