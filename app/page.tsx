"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Upload } from "@/components/icons";
import { CountUp } from "@/components/count-up";
import { LogoMark } from "@/components/logo";
import { analyzePRD, CATEGORY_ORDER, countWords, grade, normalizeText } from "@/lib/analyzer";
import { track } from "@/lib/analytics";
import { clearDraft, clearHistory, parseHistory, readDraft, readHistoryRaw, saveResult, subscribe } from "@/lib/storage";
import { htmlToText } from "@/lib/paste";
import { validatePRD } from "@/lib/validate";

const SAMPLE = `# Saved Filters for Reports
Problem: Support managers struggle to re-create the same report filters every morning because filters reset on each visit. In 6 of 9 interviews last month, managers said they spend about 10 minutes a day rebuilding them.
Users: Support managers at mid-size teams (20-100 agents).
Goals: Let users save and reuse filters. Out of scope: sharing filters between users.
Success metrics: Reduce time to first report from 10 minutes to 2 minutes within 60 days of launch.
Acceptance criteria: Given a saved filter, when the manager opens Reports, then the filter is applied automatically.
Dependencies: Requires the Reports API from the platform team.`;

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function Home() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // "Edit and re-score" leaves the previous text as a draft; typing takes over from there.
  const draft = useSyncExternalStore(subscribe, readDraft, () => "");
  const histRaw = useSyncExternalStore(subscribe, readHistoryRaw, () => "");
  const history = useMemo(() => parseHistory(histRaw), [histRaw]);
  const text = typed ?? draft;
  const words = countWords(text);

  function set(v: string) { setTyped(v); setError(""); }

  function analyze() {
    const problem = validatePRD(text);
    if (problem) { setError(problem); return; }
    const t0 = performance.now();
    track("analysis_started", { words, chars: text.length });
    const result = analyzePRD(text);
    saveResult(result);
    clearDraft();
    track("analysis_completed", {
      score: result.overall,
      words,
      duration_ms: Math.round(performance.now() - t0),
      weak_categories: result.categories.filter((c) => c.status === "weak").length,
      is_rescore: Boolean(result.prev),
    });
    router.push(`/result/${result.id}`);
  }

  async function loadFile(f: File) {
    if (f.size > 1_000_000) return setError("That file is over 1 MB. Paste the relevant sections instead.");
    if (!/\.(md|markdown|txt)$/i.test(f.name) && !f.type.startsWith("text/")) {
      return setError(`“${f.name}” can't be read here. Use a .md or .txt file, or copy and paste from Word, Google Docs or Notion.`);
    }
    set(normalizeText(await f.text()));
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const plain = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");
    const converted = html ? htmlToText(html) : null;
    const clean = normalizeText(converted ?? plain);
    if (!clean || clean === plain) return; // nothing to fix: let the browser paste normally
    e.preventDefault();
    const el = e.currentTarget;
    set(text.slice(0, el.selectionStart) + clean + text.slice(el.selectionEnd));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center justify-between border-b py-5">
        <span className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</span>
        <span className="hidden font-mono text-xs text-muted-foreground sm:block">Private · runs in your browser</span>
      </header>

      <section className="grid items-center gap-14 py-14 md:grid-cols-[1.15fr_1fr] md:py-24">
        <div>
          <p className="eyebrow rise mb-5" style={delay(0)}>A second reader for your spec</p>
          <h1 className="serif rise text-[2.6rem] leading-[1.06] sm:text-6xl" style={delay(1)}>
            Is your PRD <em className="mark">ready</em> for review?
          </h1>
          <p className="rise mt-6 max-w-md text-[15px] text-[#3B3650]" style={delay(2)}>
            Paste it in. You get a score out of 100 across twelve categories, and every fix quotes the sentence it is about. Nothing is invented on your behalf.
          </p>
          <a href="#paste" className="btn-solid rise mt-8 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium" style={delay(3)}>
            Paste a PRD <ArrowRight />
          </a>
        </div>
        <Specimen />
      </section>

      <div className="rise -mx-6 mb-16 overflow-hidden border-y py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" style={delay(5)} aria-hidden>
        <div className="marquee gap-3 pr-3">
          {[...CATEGORY_ORDER, ...CATEGORY_ORDER].map((c, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border bg-white/70 px-4 py-1.5 text-sm">{c.label}</span>
          ))}
        </div>
      </div>

      <section
        id="paste"
        className="rise scroll-mt-8 pb-16"
        style={delay(6)}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) { e.preventDefault(); void loadFile(f); }
        }}
      >
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => set(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze(); }}
            placeholder="Paste your PRD here, or drop a .md / .txt file."
            className={`min-h-[340px] resize-y rounded-xl border bg-white/90 p-6 text-[15px] leading-relaxed shadow-none transition-colors ${dragging ? "!border-[#A78BFA] bg-[#F4F1FB]" : ""}`}
            aria-label="PRD text"
            aria-invalid={Boolean(error)}
          />
          {dragging && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl border-2 border-dashed border-[#A78BFA] bg-[#F4F1FB]/80">
              <p className="serif text-2xl">Drop to load</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
            <span>{words.toLocaleString()} words</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"><Upload />Upload .md / .txt</button>
            <button type="button" onClick={() => set(SAMPLE)} className="underline-offset-4 hover:text-foreground hover:underline">Use a sample</button>
            {text && <button type="button" onClick={() => set("")} className="underline-offset-4 hover:text-foreground hover:underline">Clear</button>}
            <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <kbd className="rounded border bg-[#F4F1FB] px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>
              <kbd className="rounded border bg-[#F4F1FB] px-1.5 py-0.5 font-mono text-[11px]">↵</kbd>
            </span>
            <button type="button" onClick={analyze} className="btn-solid inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">
              {draft && typed === null ? "Re-score" : "Analyze PRD"} <ArrowRight />
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ background: "#FDEBEC", borderColor: "#F3C9CB", color: "#7A2220" }}>
            {error}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="rise border-t pb-24 pt-8" style={delay(7)}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">Recent analyses · on this device</h2>
            <button type="button" onClick={clearHistory} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear history</button>
          </div>
          <ul>
            {history.slice(0, 6).map((h) => (
              <li key={h.id} className="border-b">
                <a href={`/result/${h.id}`} className="group flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="serif block truncate text-lg group-hover:underline">{h.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()} · {h.words} words</span>
                  </span>
                  <span className="rounded-full px-2.5 py-1 font-mono text-xs" style={{ background: grade(h.overall).bg, color: grade(h.overall).color }}>{h.overall}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Illustrative sample only: not computed from anything the visitor typed. */
function Specimen() {
  const rows: [string, number][] = [["Problem clarity", 92], ["Success metrics", 74], ["Edge cases", 38], ["Risks", 16]];
  return (
    <div className="float panel relative mx-auto w-full max-w-sm p-6" aria-hidden>
      <div className="mb-5 flex items-center justify-between">
        <span className="eyebrow">Sample reading</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]" style={{ background: "#FBF3DB", color: "#956400" }}>Needs work</span>
      </div>
      <div className="flex items-start gap-2">
        <CountUp value={61} className="serif score-grad text-7xl leading-none tabular-nums" />
        <span className="serif mt-2 text-lg text-muted-foreground">/100</span>
      </div>
      <div className="mt-6 space-y-3">
        {rows.map(([k, v], i) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-xs"><span>{k}</span><span className="font-mono text-muted-foreground">{v}</span></div>
            <div className="h-[3px] rounded-full bg-[#E7E1F7]"><div className="bar-fill now h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF]" style={{ "--w": `${v}%`, transitionDelay: `${400 + i * 120}ms` } as React.CSSProperties} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
