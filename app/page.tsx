"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, File, Spinner, Upload, X } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { Diagnosis } from "@/components/diagnosis";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tilt } from "@/components/tilt";
import { analyzePRD, CATEGORY_ORDER, countWords, grade, MIN_WORDS, normalizeText } from "@/lib/analyzer";
import { ACCEPT, readFile, type LoadedFile } from "@/lib/files";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [source, setSource] = useState<Pick<LoadedFile, "name" | "kind" | "pages"> | null>(null);

  // "Edit and re-score" leaves the previous text as a draft; typing takes over from there.
  const draft = useSyncExternalStore(subscribe, readDraft, () => "");
  const histRaw = useSyncExternalStore(subscribe, readHistoryRaw, () => "");
  const history = useMemo(() => parseHistory(histRaw), [histRaw]);
  const text = typed ?? draft;
  const words = countWords(text);

  function set(v: string) { setTyped(v); setError(""); }
  function reset() { set(""); setSource(null); }

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
    setScanning(result.id); // the diagnosis overlay navigates when it finishes
  }

  async function loadFile(f: File) {
    setError("");
    setBusy(f.name);
    try {
      const loaded = await readFile(f);
      set(loaded.text);
      setSource({ name: loaded.name, kind: loaded.kind, pages: loaded.pages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file couldn't be read.");
    } finally {
      setBusy(null);
    }
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
      {scanning && <Diagnosis onDone={() => router.push(`/result/${scanning}`)} />}
      <header className="flex items-center justify-between border-b py-5">
        <span className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</span>
        <div className="flex items-center gap-4"><span className="hidden font-mono text-xs text-muted-foreground sm:block">Private · runs in your browser</span><ThemeToggle /></div>
      </header>

      <section className="grid items-center gap-14 py-14 md:grid-cols-[1.15fr_1fr] md:py-24">
        <div>
          <p className="eyebrow rise mb-5" style={delay(0)}>A second reader for your spec</p>
          <h1 className="serif rise text-[2.6rem] leading-[1.06] sm:text-6xl" style={delay(1)}>
            Is your PRD <em className="mark">ready</em> for review?
          </h1>
          <p className="rise mt-6 max-w-md text-[15px] text-ink2" style={delay(2)}>
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
            <span key={i} className="whitespace-nowrap rounded-full border bg-surface/70 px-4 py-1.5 text-sm">{c.label}</span>
          ))}
        </div>
      </div>

      <section
        id="paste"
        className="rise scroll-mt-8 pb-14"
        style={delay(6)}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
        onDrop={(e) => {
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) { e.preventDefault(); void loadFile(f); }
        }}
      >
        <div className={`editor panel overflow-hidden ${dragging ? "dragging" : ""} ${error ? "has-error" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface/60 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="eyebrow">Your PRD</span>
              {source && (
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full border bg-surface py-1 pl-3 pr-1.5 text-xs">
                  <File className="size-3.5 shrink-0 text-violet2" />
                  <span className="truncate">{source.name}</span>
                  {source.pages ? <span className="shrink-0 font-mono text-muted-foreground">{source.pages} p</span> : null}
                  <button type="button" onClick={reset} aria-label="Remove file and clear text" className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface2"><X className="size-3" /></button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button type="button" onClick={() => fileRef.current?.click()} className="chip-btn"><Upload className="size-3.5" />Upload</button>
              <button type="button" onClick={() => { set(SAMPLE); setSource(null); }} className="chip-btn">Sample</button>
              {text && <button type="button" onClick={reset} className="chip-btn">Clear</button>}
              <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }} />
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => { set(e.target.value); if (source) setSource(null); }}
              onPaste={onPaste}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze(); }}
              className="bare min-h-[380px] resize-y rounded-none border-0 bg-transparent p-6 text-[15px] leading-relaxed shadow-none"
              aria-label="PRD text"
              aria-invalid={Boolean(error)}
            />
            {!text && !busy && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                <div className="max-w-sm text-center">
                  <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border bg-surface text-violet2"><File className="size-5" /></span>
                  <p className="serif text-3xl leading-tight">Paste your PRD</p>
                  <p className="mt-2 text-sm text-ink3">or drop a file anywhere in this box</p>
                  <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-line inline-flex h-9 items-center gap-2 bg-surface px-3.5 text-[13px]"><Upload />Upload a file</button>
                    <button type="button" onClick={() => { set(SAMPLE); setSource(null); }} className="btn-line inline-flex h-9 items-center px-3.5 text-[13px]">Try a sample</button>
                  </div>
                  <p className="mt-5 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    {[".pdf", ".docx", ".md", ".txt"].map((x) => <span key={x} className="rounded border bg-surface/70 px-1.5 py-0.5">{x}</span>)}
                  </p>
                </div>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-surface/80 backdrop-blur-[2px]" role="status">
                <p className="flex items-center gap-3 text-sm"><Spinner className="text-violet2" />Reading {busy}…</p>
              </div>
            )}
            {dragging && (
              <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-[#A78BFA] bg-surface2/90">
                <p className="serif text-3xl">Drop to load</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-surface/60 px-5 py-3.5">
            <WordMeter words={words} />
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <kbd className="rounded border bg-surface2 px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>
                <kbd className="rounded border bg-surface2 px-1.5 py-0.5 font-mono text-[11px]">↵</kbd>
              </span>
              <button type="button" onClick={analyze} disabled={Boolean(busy)} className="btn-solid inline-flex h-10 items-center gap-2 px-5 text-sm font-medium disabled:opacity-60">
                {draft && typed === null ? "Re-score" : "Analyze PRD"} <ArrowRight />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ background: "#FDEBEC", borderColor: "#F3C9CB", color: "#7A2220" }}>
            {error}
          </div>
        )}
      </section>

      <Reveal className="grid gap-px overflow-hidden rounded-2xl border bg-border pb-0 sm:grid-cols-3">
        {[
          ["01", "Quotes, never invents", "Every fix points at a sentence you wrote. If something is missing, it says so."],
          ["02", "Stays on your device", "Scoring runs in your browser. Files and text are never uploaded."],
          ["03", "Free, no account", "No sign-up and no limits. Paste, score, fix, and score again."],
        ].map(([n, t, d]) => (
          <div key={n} className="glow bg-surface/80 p-6">
            <span className="font-mono text-xs text-violet2">{n}</span>
            <h3 className="serif mt-3 text-xl">{t}</h3>
            <p className="mt-2 text-sm text-ink2">{d}</p>
          </div>
        ))}
      </Reveal>
      <div className="h-16" />

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
    <Tilt className="mx-auto w-full max-w-sm">
    <div className="float panel relative p-6" aria-hidden>
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
            <div className="h-[3px] rounded-full bg-track"><div className="bar-fill now h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF]" style={{ "--w": `${v}%`, transitionDelay: `${400 + i * 120}ms` } as React.CSSProperties} /></div>
          </div>
        ))}
      </div>
    </div>
    </Tilt>
  );
}

function WordMeter({ words }: { words: number }) {
  const ready = words >= MIN_WORDS;
  return (
    <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground" aria-live="polite">
      <span className="h-[4px] w-24 overflow-hidden rounded-full bg-track" aria-hidden>
        <span className="block h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF] transition-[width] duration-500" style={{ width: `${Math.min(100, (words / MIN_WORDS) * 100)}%` }} />
      </span>
      <span>{ready ? `${words.toLocaleString()} words` : `${words} of ${MIN_WORDS} words needed`}</span>
    </div>
  );
}
