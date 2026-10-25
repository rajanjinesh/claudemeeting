import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { EXTRACT_TOOL, SYSTEM_PROMPT } from "@/lib/prompt";

const MAX_CHARS = 100_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Wrong or missing password." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const transcript: string = body?.transcript ?? "";
  const meetingDate: string = body?.meetingDate ?? "";

  if (!transcript.trim()) {
    return NextResponse.json({ error: "The transcript is empty." }, { status: 400 });
  }
  if (transcript.length > MAX_CHARS) {
    return NextResponse.json({ error: "The transcript is too long (limit about 100,000 characters)." }, { status: 413 });
  }
  if (!DATE_RE.test(meetingDate)) {
    return NextResponse.json({ error: "Please provide a valid meeting date." }, { status: 400 });
  }

  const weekday = new Date(`${meetingDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      messages: [
        {
          role: "user",
          content: `Meeting date: ${meetingDate} (${weekday})\n\n<transcript>\n${transcript}\n</transcript>`,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const raw = (toolUse && toolUse.type === "tool_use" ? (toolUse.input as { items?: unknown[] }).items : []) ?? [];

    const items = raw.map((item) => {
      const i = item as { action?: string; owner?: string; due_date?: string };
      return {
        action: (i.action ?? "").trim(),
        owner: (i.owner ?? "").trim(),
        due_date: DATE_RE.test(i.due_date ?? "") ? (i.due_date as string) : "",
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("extract failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "The AI could not process this transcript. Please try again." }, { status: 502 });
  }
}
