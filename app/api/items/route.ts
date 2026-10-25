import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Wrong or missing password." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sourceFile: string | null = body?.sourceFile ? String(body.sourceFile) : null;
  const incoming: { action?: string; owner?: string; due_date?: string }[] = Array.isArray(body?.items) ? body.items : [];

  // Blank cells are saved as empty (null); rows with no action text are skipped.
  const rows = incoming
    .map((i) => ({
      action: (i.action ?? "").trim(),
      owner: (i.owner ?? "").trim() || null,
      due_date: DATE_RE.test(i.due_date ?? "") ? (i.due_date as string) : null,
      source_file: sourceFile,
    }))
    .filter((r) => r.action);

  if (rows.length === 0) {
    return NextResponse.json({ error: "There are no rows to save." }, { status: 400 });
  }

  const { error } = await getSupabase().from("action_items").insert(rows);
  if (error) {
    console.error("save failed:", error.message);
    return NextResponse.json({ error: "Could not save to the database." }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
