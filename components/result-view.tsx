"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, Minus, Plus, Share } from "@/components/icons";
import { CATEGORY_ORDER, decodePayload, encodePayload, grade, shareMetrics, statusTone, toSharePayload, type AnalysisResult, type CategoryResult, type SharePayload } from "@/lib/analyzer";
import { readRaw } from "@/lib/storage";
import { track } from "@/lib/analytics";
import { RadarChart } from "./radar-chart";
import { Reveal } from "./reveal";
import { CountUp } from "./count-up";

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function ResultView({ id, shared }: { id: string; shared: string | null }) {
  // undefined on the server / first render, string|null once on the client
  const raw = useSyncExternalStore(() => () => {}, () => readRaw(id), () => undefined);
  const loaded = raw !== undefined;
  const result = useMemo<AnalysisResult | null>(() => {
    try { return raw ? (JSON.parse(raw) as AnalysisResult) : null; } catch { return null; }
  }, [raw]);
  const payload = useMemo(() => (result ? toSharePayload(result) : decodePayload(shared)), [result, shared]);

  useEffect(() => {
    if (loaded && payload) track("score_viewed", { score: payload.o, source: result ? "own" : "shared" });
  }, [loaded, payload, result]);

  if (!loaded) return null;
  if (!payload) return <Missing />;
  const g = grade(payload.o);
  const stats = shareMetrics(payload);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="sticky top-0 z-20 -mx-6 flex items-baseline justify-between border-b bg-background/70 px-6 py-5 backdrop-blur-md">
        <Link href="/" className="serif flex items-center gap-2 text-xl"><span className="size-2.5 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#6D4AFF]" />PRD Doctor</Link>
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Analyze another</Link>
      </header>

      <section className="rise my-8 md:my-10" style={delay(0)}>
        <div className="panel grid items-center gap-8 p-6 md:grid-cols-[1fr_340px] md:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{result ? "Your PRD" : "Shared result"}</p>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em]" style={{ background: g.bg, color: g.color }}>{g.label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <CountUp value={payload.o} className="serif score-grad text-[6.5rem] leading-none tabular-nums sm:text-[8.5rem]" />
              <span className="serif text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="mt-2 max-w-md text-[15px] text-[#3B3650]">
              {result ? `${result.words} words read across twelve categories.` : "A summary of scores. The PRD text itself is never shared."}
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

function Missing() {
  return (
    <main className="mx-auto max-w-md px-6 py-32">
      <h1 className="serif text-4xl">Result not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">Reports are stored privately in the browser that created them. Run a new analysis to get one.</p>
      <Link href="/" className="btn-solid mt-8 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">Analyze a PRD <ArrowRight /></Link>
    </main>
  );
}

function Section({ title, children, i = 0 }: { title: string; children: React.ReactNode; i?: number }) {
  return (
    <Reveal delay={i > 3 ? 0 : 0} className="border-t pt-8 pb-14">
      <h2 className="eyebrow mb-8">{title}</h2>
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
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/result/${id}?s=${encodePayload(payload)}`;
  const text = `My PRD scored ${payload.o}/100 on PRD Doctor`;

  async function share() {
    track("share_clicked", { score: payload.o, method: typeof navigator.share === "function" ? "native" : "copy" });
    const u = url();
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: text, text, url: u }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(`${text}\n${u}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
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
    <div className="mt-8 flex flex-wrap gap-3">
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

function FullReport({ result }: { result: AnalysisResult }) {
  const by = (id: string) => result.categories.find((c) => c.id === id)!;
  const strongest = by(result.strongest);
  const fixes = result.categories.filter((c) => c.status !== "strong").sort((a, b) => a.score - b.score);

  return (
    <>
      <Section title="Where to start" i={3}>
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

      <Section title="Strongest section" i={4}>
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

      <Section title="All categories" i={5}><Bars scores={CATEGORY_ORDER.map((m) => by(m.id).score)} /></Section>

      <Section title={`Fixes · ${fixes.length}`} i={6}>
        {fixes.length === 0 ? <p className="text-sm text-muted-foreground">Every category scored 70 or higher.</p> : (
          <div className="border-t">{fixes.map((c, i) => <Fix key={c.id} c={c} open={i < 2} />)}</div>
        )}
      </Section>

      <Rewrite text={result.rewrite} />
    </>
  );
}

function Fix({ c, open }: { c: CategoryResult; open: boolean }) {
  const label = { found: "You wrote", anchor: "Closest text in your PRD", vague: "Vague wording" }[c.quote?.kind ?? "anchor"];
  return (
    <details open={open} className="group border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-4">
          <span className="serif text-2xl">{c.label}</span><Tag status={c.status} />
        </span>
        <span className="flex items-center gap-4 text-muted-foreground">
          <span className="font-mono text-xs">{c.score}</span>
          <Plus className="group-open:hidden" /><Minus className="hidden group-open:block" />
        </span>
      </summary>
      <div className="grid gap-x-10 gap-y-5 pb-8 text-[15px] leading-relaxed text-[#2A2640] md:grid-cols-[180px_1fr]">
        {c.quote && <Row k={label}><blockquote className="serif text-lg italic leading-snug">“{c.quote.text}”</blockquote></Row>}
        <Row k="What is missing">{c.missing.length ? c.missing.join("; ") : "Nothing structural, but the signals found are thin."}</Row>
        <Row k="Why it matters">{c.why}</Row>
        <Row k="What to add">{c.add}</Row>
        <Row k="Question"><span className="serif text-lg">{c.question}</span></Row>
      </div>
    </details>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (<><div className="eyebrow pt-1">{k}</div><div className="max-w-2xl">{children}</div></>);
}

function Rewrite({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Section title="Suggested rewrite" i={7}>
      <div className="rounded-xl border bg-[#F4F1FB]/80 p-6">
        <div className="mb-4 flex justify-end">
          <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-line inline-flex h-8 items-center gap-2 bg-white px-3 text-xs">
            {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}</pre>
      </div>
    </Section>
  );
}
