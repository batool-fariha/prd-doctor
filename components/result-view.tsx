"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Copy, Download, Share2, Trophy, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ORDER, decodePayload, encodePayload, grade, shareMetrics, toSharePayload, type AnalysisResult, type CategoryResult } from "@/lib/analyzer";
import { readRaw } from "@/lib/storage";
import { track } from "@/lib/analytics";
import { RadarChart } from "./radar-chart";
import { ScoreRing } from "./score-ring";

const tone = (s: number) => (s >= 70 ? "bg-green-500" : s >= 40 ? "bg-amber-500" : "bg-red-500");

export function ResultView({ id, shared }: { id: string; shared: string | null }) {
  // undefined on the server / first render, string|null once on the client
  const raw = useSyncExternalStore(
    () => () => {},
    () => readRaw(id),
    () => undefined,
  );
  const loaded = raw !== undefined;
  const result = useMemo<AnalysisResult | null>(() => {
    try { return raw ? (JSON.parse(raw) as AnalysisResult) : null; } catch { return null; }
  }, [raw]);

  const payload = useMemo(
    () => (result ? toSharePayload(result) : decodePayload(shared)),
    [result, shared],
  );

  useEffect(() => {
    if (loaded && payload) track("score_viewed", { score: payload.o, source: result ? "own" : "shared" });
  }, [loaded, payload, result]);

  if (!loaded) return null;
  if (!payload) return <Missing />;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-semibold">PRD Doctor</Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Analyze another PRD</Link>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-8 pt-6 md:flex-row">
          <ScoreRing score={payload.o} />
          <div className="flex-1 text-center md:text-left">
            <Badge style={{ background: grade(payload.o).color }} className="text-white">{grade(payload.o).label}</Badge>
            <h1 className="mt-2 text-3xl font-semibold">{result ? "Your PRD scored" : "This PRD scored"} {payload.o}/100</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {result ? `${result.words} words analysed across 12 categories.` : "Shared summary. The PRD text itself is private and never shared."}
            </p>
            <ShareControls payload={payload} id={id} />
          </div>
          <RadarChart scores={payload.c} />
        </CardContent>
      </Card>

      {result ? <FullReport result={result} /> : <SharedBars scores={payload.c} />}
    </main>
  );
}

function Missing() {
  return (
    <main className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-2xl font-semibold">Result not found</h1>
      <p className="mt-2 text-muted-foreground">Results are stored privately in the browser that created them. Run a new analysis to get one.</p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>Analyze a PRD</Link>
    </main>
  );
}

function SharedBars({ scores }: { scores: number[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Category scores</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {CATEGORY_ORDER.map((c, i) => <Bar key={c.id} label={c.label} score={scores[i]} />)}
        <Link href="/" className={cn(buttonVariants(), "mt-4")}>Score your own PRD</Link>
      </CardContent>
    </Card>
  );
}

function Bar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-muted-foreground">{score}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><div className={cn("h-full rounded-full", tone(score))} style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function ShareControls({ payload, id }: { payload: ReturnType<typeof toSharePayload>; id: string }) {
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
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prd-score-${payload.o}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
      <Button onClick={share}>{copied ? <Check /> : <Share2 />}{copied ? "Link copied" : "Share my PRD score"}</Button>
      <Button variant="outline" onClick={download}><Download />Download card</Button>
    </div>
  );
}

function FullReport({ result }: { result: AnalysisResult }) {
  const by = (id: string) => result.categories.find((c) => c.id === id)!;
  const strongest = by(result.strongest);
  const [copied, setCopied] = useState(false);
  const metrics = shareMetrics(toSharePayload(result));

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TriangleAlert className="size-4 text-amber-600" />Top 3 weaknesses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {result.weakest.map((id, i) => {
              const c = by(id);
              return (
                <div key={id} className="rounded-lg border p-3">
                  <div className="flex justify-between text-sm font-medium"><span>{i + 1}. {c.label}</span><span className="tabular-nums">{c.score}</span></div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.missing[0] ? `Missing ${c.missing[0]}.` : c.why}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-green-600" />Strongest section</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{strongest.label} <span className="tabular-nums text-muted-foreground">· {strongest.score}</span></div>
            {strongest.quote?.kind === "found" && <blockquote className="mt-2 border-l-2 pl-3 text-sm italic">“{strongest.quote.text}”</blockquote>}
            <p className="mt-3 text-sm text-muted-foreground">Found: {strongest.found.length ? strongest.found.join("; ") : "very little. This is your best section in a draft that needs work."}.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Category scores</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {result.categories.map((c) => <Bar key={c.id} label={c.label} score={c.score} />)}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Fixes for weak categories</h2>
        {result.categories.filter((c) => c.status !== "strong").sort((a, b) => a.score - b.score).map((c) => <Fix key={c.id} c={c} />)}
        {result.categories.every((c) => c.status === "strong") && <p className="text-muted-foreground">Every category scored 70 or higher. Nice.</p>}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Suggested rewrite</CardTitle>
          <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(result.rewrite); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>
        <CardContent><pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">{result.rewrite}</pre></CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">Share card shows: {metrics.map((m) => `${m.k}: ${m.v}`).join(" · ")}</p>
    </>
  );
}

function Fix({ c }: { c: CategoryResult }) {
  const label = { found: "You wrote", anchor: "Closest text in your PRD", vague: "Vague wording" }[c.quote?.kind ?? "anchor"];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{c.label}</CardTitle>
        <Badge variant="outline" className="tabular-nums">{c.score}/100</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {c.quote && <blockquote className="border-l-2 pl-3 italic"><span className="not-italic text-xs uppercase tracking-wide text-muted-foreground">{label}: </span>“{c.quote.text}”</blockquote>}
        <Row k="What's missing">{c.missing.length ? c.missing.join("; ") : "Nothing structural, but the signals found are thin."}</Row>
        <Row k="Why it matters">{c.why}</Row>
        <Row k="Exactly what to add">{c.add}</Row>
        <Row k="Question to answer"><span className="font-medium">{c.question}</span></Row>
      </CardContent>
    </Card>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</div><div>{children}</div></div>;
}
