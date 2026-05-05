import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscription: {
        plan: "free" | "pro";
        uploadsUsed: number;
        uploadsLimit: number;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        currentPeriodEnd?: Date;
      };
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscription: {
      plan: "free" | "pro";
      uploadsUsed: number;
      uploadsLimit: number;
    };
  }
}
