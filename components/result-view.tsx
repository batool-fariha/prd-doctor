"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Download, File, Minus, Pencil, Plus, Printer, Share } from "@/components/icons";
import { CATEGORY_ORDER, decodePayload, encodePayload, grade, shareMetrics, statusTone, toSharePayload, type AnalysisResult, type CategoryResult, type SharePayload } from "@/lib/analyzer";
import { clearDraft, parseDone, parseHistory, readDone, readHistoryRaw, readRaw, setDraft, subscribe, toggleDone } from "@/lib/storage";
import { downloadText, fixMarkdown, reportMarkdown } from "@/lib/report";
import { track } from "@/lib/analytics";
import { LogoMark } from "./logo";
import { RadarChart } from "./radar-chart";
import { Reveal } from "./reveal";
import { CountUp } from "./count-up";

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const QUOTE_LABEL = { found: "You wrote", anchor: "Nearest text in your PRD", vague: "Vague wording", empty: "Placeholder section" } as const;

function useFlash() {
  const [on, setOn] = useState(false);
  return [on, () => { setOn(true); setTimeout(() => setOn(false), 1800); }] as const;
}

export function ResultView({ id, shared }: { id: string; shared: string | null }) {
  // undefined on the server / first render, string|null once on the client
  const raw = useSyncExternalStore(subscribe, () => readRaw(id), () => undefined);
  const loaded = raw !== undefined;
  const result = useMemo<AnalysisResult | null>(() => {
    try { return raw ? (JSON.parse(raw) as AnalysisResult) : null; } catch { return null; }
  }, [raw]);
  const payload = useMemo(() => (result ? toSharePayload(result) : decodePayload(shared)), [result, shared]);

  useEffect(() => {
    if (loaded && payload) track("score_viewed", { score: payload.o, source: result ? "own" : "shared" });
  }, [loaded, payload, result]);

  if (!loaded) return null;
  if (!payload) return <Missing damaged={Boolean(shared)} />;
  const g = grade(payload.o);
  const stats = shareMetrics(payload);
  const delta = result?.prev ? payload.o - result.prev.overall : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="no-print sticky top-0 z-20 -mx-6 flex items-center justify-between border-b bg-background/70 px-6 py-4 backdrop-blur-md">
        <Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link>
        <Link href="/" onClick={clearDraft} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Analyze another</Link>
      </header>

      <section className="rise my-8 md:my-10" style={delay(0)}>
        <div className="panel grid items-center gap-8 p-6 md:grid-cols-[1fr_340px] md:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{result ? "Your PRD" : "Shared result"}</p>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em]" style={{ background: g.bg, color: g.color }}>{g.label}</span>
              {delta !== null && <DeltaChip delta={delta} />}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <CountUp value={payload.o} className="serif score-grad text-[6.5rem] leading-none tabular-nums sm:text-[8.5rem]" />
              <span className="serif text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="mt-2 max-w-md text-[15px] text-[#3B3650]">
              {result ? `${result.title} · ${result.words.toLocaleString()} words read across twelve categories.` : "A summary of scores. The PRD text itself is never shared."}
            </p>
            <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
              {stats.map((m) => (
                <div key={m.k} className="bg-white/90 px-4 py-3">
                  <dt className="eyebrow">{m.k}</dt>
                  <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{m.v}</dd>
                </div>
              ))}
            </dl>
            <ShareControls payload={payload} id={id} />
          </div>
          <RadarChart scores={payload.c} />
        </div>
      </section>

      {result ? <FullReport result={result} /> : <SharedBars scores={payload.c} />}
    </main>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const up = delta > 0, flat = delta === 0;
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]" style={{ background: flat ? "#F4F1FB" : up ? "#EDF3EC" : "#FDEBEC", color: flat ? "#565170" : up ? "#346538" : "#9F2F2D" }}>
      {flat ? "No change since last time" : `${up ? "+" : ""}${delta} since last time`}
    </span>
  );
}

function Missing({ damaged }: { damaged: boolean }) {
  const histRaw = useSyncExternalStore(subscribe, readHistoryRaw, () => "");
  const history = parseHistory(histRaw).slice(0, 4);
  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center border-b py-5"><Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link></header>
      <section className="rise max-w-xl py-24" style={delay(0)}>
        <p className="eyebrow mb-4">{damaged ? "Broken link" : "Report not found"}</p>
        <h1 className="serif text-5xl leading-[1.06]">{damaged ? "That share link looks damaged." : "We can't find that report."}</h1>
        <p className="mt-5 text-[15px] text-[#3B3650]">
          {damaged
            ? "Part of the link was cut off or changed, so the scores couldn't be read. Ask for the link again, or score your own PRD."
            : "Full reports are kept privately in the browser that made them, so they don't follow a link to another device or after clearing site data. Score the PRD again to get a fresh one."}
        </p>
        <Link href="/" className="btn-solid mt-8 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">Analyze a PRD <ArrowRight /></Link>
        {history.length > 0 && (
          <div className="mt-14">
            <h2 className="eyebrow mb-3">Your recent analyses</h2>
            <ul>{history.map((h) => (
              <li key={h.id} className="border-b"><Link href={`/result/${h.id}`} className="flex items-center justify-between py-3 hover:underline"><span className="serif truncate text-lg">{h.title}</span><span className="font-mono text-xs text-muted-foreground">{h.overall}/100</span></Link></li>
            ))}</ul>
          </div>
        )}
      </section>
    </main>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Reveal className="border-t pt-8 pb-14">
      <div className="mb-8 flex items-center justify-between gap-4"><h2 className="eyebrow">{title}</h2>{right}</div>
      {children}
    </Reveal>
  );
}

function Bars({ scores }: { scores: number[] }) {
  return (
    <div className="grid gap-x-12 sm:grid-cols-2">
      {CATEGORY_ORDER.map((c, i) => (
        <div key={c.id} className="border-b py-3">
          <div className="mb-2 flex justify-between text-sm"><span>{c.label}</span><span className="font-mono text-xs text-muted-foreground">{scores[i]}</span></div>
          <div className="h-[3px] rounded-full bg-[#E7E1F7]" role="progressbar" aria-valuenow={scores[i]} aria-valuemin={0} aria-valuemax={100} aria-label={c.label}>
            <div className="bar-fill h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF]" style={{ "--w": `${scores[i]}%`, transitionDelay: `${(i % 6) * 70}ms` } as React.CSSProperties} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SharedBars({ scores }: { scores: number[] }) {
  return (
    <Section title="Category scores">
      <Bars scores={scores} />
      <Link href="/" className="btn-solid mt-10 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">Score your own PRD <ArrowRight /></Link>
    </Section>
  );
}

function ShareControls({ payload, id }: { payload: SharePayload; id: string }) {
  const [copied, flash] = useFlash();
  const url = () => `${window.location.origin}/result/${id}?s=${encodePayload(payload)}`;
  const text = `My PRD scored ${payload.o}/100 on PRD Doctor`;

  async function share() {
    track("share_clicked", { score: payload.o, method: typeof navigator.share === "function" ? "native" : "copy" });
    const u = url();
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: text, text, url: u }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(`${text}\n${u}`); flash(); } catch {}
  }

  async function download() {
    track("share_clicked", { score: payload.o, method: "download" });
    const res = await fetch(`/api/og?s=${encodePayload(payload)}&id=${id}`);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = `prd-score-${payload.o}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="no-print mt-8 flex flex-wrap gap-3">
      <button onClick={share} className="btn-solid inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">
        {copied ? <Check /> : <Share />}{copied ? "Link copied" : "Share my PRD score"}
      </button>
      <button onClick={download} className="btn-line inline-flex h-10 items-center gap-2 px-4 text-sm"><Download />Download card</button>
    </div>
  );
}

function Tag({ status }: { status: CategoryResult["status"] }) {
  const t = statusTone(status);
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]" style={{ background: t.bg, color: t.color }}>{t.label}</span>;
}

function Toolbar({ result }: { result: AnalysisResult }) {
  const router = useRouter();
  const [copied, flash] = useFlash();
  const btn = "btn-line inline-flex h-9 items-center gap-2 px-3.5 text-[13px]";
  return (
    <div className="no-print rise mb-10 flex flex-wrap gap-2" style={delay(2)}>
      {result.text && (
        <button className={btn} onClick={() => { setDraft(result.text!); router.push("/"); }}><Pencil />Edit and re-score</button>
      )}
      <button className={btn} onClick={async () => { await navigator.clipboard.writeText(reportMarkdown(result)); flash(); }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy as Markdown"}</button>
      <button className={btn} onClick={() => downloadText(`prd-report-${result.overall}.md`, reportMarkdown(result))}><File />Download .md</button>
      <button className={btn} onClick={() => { document.querySelectorAll("details").forEach((d) => (d.open = true)); setTimeout(() => window.print(), 60); }}><Printer />Print or save PDF</button>
    </div>
  );
}

function FullReport({ result }: { result: AnalysisResult }) {
  const by = (id: string) => result.categories.find((c) => c.id === id)!;
  const strongest = by(result.strongest);
  const fixes = result.categories.filter((c) => c.status !== "strong").sort((a, b) => a.score - b.score);
  const doneRaw = useSyncExternalStore(subscribe, () => readDone(result.id), () => "");
  const done = useMemo(() => new Set(parseDone(doneRaw)), [doneRaw]);
  const doneCount = fixes.filter((f) => done.has(f.id)).length;

  return (
    <>
      <Toolbar result={result} />

      <Section title="Where to start">
        <div className="grid gap-4 md:grid-cols-3">
          {result.weakest.map((id, i) => {
            const c = by(id);
            return (
              <div key={id} className="lift rounded-xl border bg-white p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="grid size-6 place-items-center rounded-full bg-[#ECE6FF] font-mono text-[11px] text-[#5B3FD6]">{i + 1}</span><Tag status={c.status} />
                </div>
                <h3 className="serif text-2xl leading-tight">{c.label}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{c.score} / 100</p>
                <p className="mt-4 text-sm text-[#3B3650]">{c.missing[0] ? `No sign of ${c.missing[0]}.` : c.why}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Strongest section">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <div>
            <h3 className="serif text-3xl leading-tight">{strongest.label}</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{strongest.score} / 100</p>
          </div>
          <div>
            {strongest.quote?.kind === "found" && <blockquote className="serif border-l-2 border-[#A78BFA] pl-5 text-xl italic leading-snug">“{strongest.quote.text}”</blockquote>}
            <p className="mt-4 text-sm text-[#3B3650]">Found: {strongest.found.length ? strongest.found.join("; ") : "very little. This is simply your best section in an early draft"}.</p>
          </div>
        </div>
      </Section>

      <Section title="All categories"><Bars scores={CATEGORY_ORDER.map((m) => by(m.id).score)} /></Section>

      <Section title={`Fixes · ${fixes.length}`} right={fixes.length > 0 ? <AddressedMeter done={doneCount} total={fixes.length} /> : null}>
        {fixes.length === 0 ? <p className="text-sm text-[#3B3650]">Every category scored 70 or higher. Nothing to fix.</p> : (
          <div className="border-t">{fixes.map((c, i) => <Fix key={c.id} c={c} resultId={result.id} open={i < 2} addressed={done.has(c.id)} />)}</div>
        )}
        {fixes.length > 0 && <p className="no-print mt-5 text-xs text-muted-foreground">Mark a fix as addressed once you have updated your PRD, then use “Edit and re-score” to see the real change.</p>}
      </Section>

      <Rewrite text={result.rewrite} />
    </>
  );
}

function AddressedMeter({ done, total }: { done: number; total: number }) {
  return (
    <div className="no-print flex items-center gap-3" aria-label={`${done} of ${total} fixes addressed`}>
      <span className="font-mono text-xs text-muted-foreground">{done} of {total} addressed</span>
      <span className="h-[5px] w-28 overflow-hidden rounded-full bg-[#E7E1F7]">
        <span className="block h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF] transition-[width] duration-700" style={{ width: `${(done / total) * 100}%` }} />
      </span>
    </div>
  );
}

function Fix({ c, open, addressed, resultId }: { c: CategoryResult; open: boolean; addressed: boolean; resultId: string }) {
  const [copied, flash] = useFlash();
  return (
    <details open={open} className={`group border-b transition-opacity ${addressed ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="serif flex items-center gap-2 text-2xl">{addressed && <Check className="text-[#346538]" />}{c.label}</span>
          {addressed ? <span className="rounded-full bg-[#EDF3EC] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-[#346538]">Addressed</span> : <Tag status={c.status} />}
        </span>
        <span className="flex items-center gap-4 text-muted-foreground">
          <span className="font-mono text-xs">{c.score}</span>
          <Plus className="group-open:hidden" /><Minus className="hidden group-open:block" />
        </span>
      </summary>
      <div className="grid gap-x-10 gap-y-5 pb-8 text-[15px] leading-relaxed text-[#2A2640] md:grid-cols-[180px_1fr]">
        <Row k={c.quote ? QUOTE_LABEL[c.quote.kind] : "Nearest text"}>
          {c.quote
            ? <blockquote className="serif text-lg italic leading-snug">“{c.quote.text}”</blockquote>
            : <span className="text-[#565170]">No mention found in your PRD.</span>}
        </Row>
        <Row k="What is missing">{c.missing.length ? c.missing.join("; ") : "Nothing structural, but the signals found are thin."}</Row>
        <Row k="Why it matters">{c.why}</Row>
        <Row k="What to add">{c.add}</Row>
        <Row k="Question"><span className="serif text-lg">{c.question}</span></Row>
        <div className="no-print flex flex-wrap gap-2 md:col-start-2">
          <button className="btn-line inline-flex h-8 items-center gap-2 px-3 text-xs" onClick={async () => { await navigator.clipboard.writeText(fixMarkdown(c)); flash(); }}>
            {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy this fix"}
          </button>
          <button className="btn-line inline-flex h-8 items-center gap-2 px-3 text-xs" onClick={() => toggleDone(resultId, c.id)}>
            <Check />{addressed ? "Mark as open" : "Mark as addressed"}
          </button>
        </div>
      </div>
    </details>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (<><div className="eyebrow pt-1">{k}</div><div className="max-w-2xl">{children}</div></>);
}

function Rewrite({ text }: { text: string }) {
  const [copied, flash] = useFlash();
  return (
    <Section title="Suggested rewrite">
      <div className="rounded-xl border bg-[#F4F1FB]/80 p-6">
        <div className="no-print mb-4 flex justify-end">
          <button onClick={async () => { await navigator.clipboard.writeText(text); flash(); }} className="btn-line inline-flex h-8 items-center gap-2 bg-white px-3 text-xs">
            {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}</pre>
      </div>
    </Section>
  );
}
