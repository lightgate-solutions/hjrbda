import { upstashIndex } from "@/lib/upstash-client";
import { v4 } from "uuid";

export async function POST() {
  await upstashIndex.upsert([
    {
      id: v4(),
      content: {
        title: "2025 Annual reps-0",
        description: "All reports done and dusted",
        tags: ["finance", "personal"],
      },
      metadata: { department: "admin", documentId: "1" },
    },
  ]);

  return new Response("OK");
}
