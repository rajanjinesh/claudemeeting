"use client";

import { useEffect, useState } from "react";

type Row = { action: string; owner: string; due_date: string };

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none";

export default function Home() {
  const [password, setPassword] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  // Default the meeting date to today, set in the browser so it uses the user's own date.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMeetingDate(today()), []);
  const [fileName, setFileName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<"extract" | "save" | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    setMessage(null);
    setRows(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setMessage({ kind: "error", text: "Please choose a .txt file." });
      return;
    }
    setFileName(file.name);
    setTranscript(await file.text());
  }

  async function call(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-password": password },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  async function extract() {
    setBusy("extract");
    setMessage(null);
    try {
      const data = await call("/api/extract", { transcript, meetingDate });
      setRows(data.items);
      if (data.items.length === 0) setMessage({ kind: "ok", text: "No action items were found in this transcript." });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const data = await call("/api/items", { items: rows, sourceFile: fileName });
      setMessage({ kind: "ok", text: `Saved ${data.saved} action item${data.saved === 1 ? "" : "s"}.` });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const update = (index: number, field: keyof Row, value: string) =>
    setRows((r) => r!.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 text-zinc-900">
      <h1 className="text-2xl font-semibold">Meeting Action Items</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Upload a meeting transcript, review the action items the AI finds, fix anything, then save.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Password
          <input type="password" className={`${inputClass} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Meeting date
          <input type="date" className={`${inputClass} mt-1`} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Transcript (.txt)
          <input type="file" accept=".txt,text/plain" className="mt-1 block w-full text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </section>

      <button
        onClick={extract}
        disabled={!transcript || !password || !meetingDate || busy !== null}
        className="mt-5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === "extract" ? "Reading transcript…" : "Extract action items"}
      </button>

      {message && (
        <p className={`mt-4 rounded px-3 py-2 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message.text}
        </p>
      )}

      {rows && rows.length > 0 && (
        <section className="mt-6">
          <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
                <tr>
                  <th className="px-2 py-2">Action</th>
                  <th className="w-40 px-2 py-2">Owner</th>
                  <th className="w-44 px-2 py-2">Due date</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-200">
                    <td className="p-1.5"><input className={inputClass} value={row.action} onChange={(e) => update(i, "action", e.target.value)} /></td>
                    <td className="p-1.5"><input className={inputClass} value={row.owner} onChange={(e) => update(i, "owner", e.target.value)} /></td>
                    <td className="p-1.5"><input type="date" className={inputClass} value={row.due_date} onChange={(e) => update(i, "due_date", e.target.value)} /></td>
                    <td className="p-1.5 text-center">
                      <button aria-label="Delete row" title="Delete row" className="text-zinc-500 hover:text-red-600" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button className="rounded border border-zinc-300 px-4 py-2 text-sm" onClick={() => setRows([...rows, { action: "", owner: "", due_date: "" }])}>
              Add row
            </button>
            <button
              onClick={save}
              disabled={busy !== null}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
