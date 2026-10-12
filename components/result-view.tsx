"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Download, File, Linkedin, Minus, Pencil, Plus, Printer, Share, XLogo } from "@/components/icons";
import { CATEGORY_ORDER, decodePayload, encodePayload, encodePrev, encodeShort, grade, shareMetrics, statusTone, toSharePayload, type AnalysisResult, type CategoryResult, type PrevPayload, type SharePayload } from "@/lib/analyzer";
import { clearDraft, parseDone, parseHistory, readDone, readHistoryRaw, readRaw, setDraft, subscribe, toggleDone } from "@/lib/storage";
import { copyText } from "@/lib/clipboard";
import { downloadText, fixMarkdown, reportMarkdown } from "@/lib/report";
import { track } from "@/lib/analytics";
import { Burst } from "./burst";
import { Feedback } from "./feedback";
import { CountUp } from "./count-up";
import { LogoMark } from "./logo";
import { RadarChart } from "./radar-chart";
import { Reveal } from "./reveal";
import { ThemeToggle } from "./theme-toggle";

const smooth = (): ScrollBehavior => (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const QUOTE_LABEL = { found: "You wrote", anchor: "Nearest text in your PRD", vague: "Vague wording", empty: "Placeholder section" } as const;

function useFlash() {
  const [on, setOn] = useState(false);
  return [on, () => { setOn(true); setTimeout(() => setOn(false), 1800); }] as const;
}

/** Puts the user's text back in the editor so they can fix the PRD and score it again. */
function useRescore(result: AnalysisResult) {
  const router = useRouter();
  return () => { if (result.text) { setDraft(result.text); router.push("/"); } };
}

export function ResultView({ id, shared }: { id: string; shared: string | null }) {
  // undefined on the server / first render, string|null once on the client
  const raw = useSyncExternalStore(subscribe, () => readRaw(id), () => undefined);
  const loaded = raw !== undefined;
  const result = useMemo<AnalysisResult | null>(() => {
    try { return raw ? (JSON.parse(raw) as AnalysisResult) : null; } catch { return null; }
  }, [raw]);
  const payload = useMemo(() => (result ? toSharePayload(result) : decodePayload(shared)), [result, shared]);

  const [active, setActive] = useState<number | null>(null);
  const [mini, setMini] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (loaded && payload) track("score_viewed", { score: payload.o, source: result ? "own" : "shared" });
  }, [loaded, payload, result]);

  // Show a compact score in the header once the hero scrolls out of view.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMini(!e.isIntersecting), { rootMargin: "-70px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loaded, payload]);

  if (!loaded) return null;
  if (!payload) return <Missing damaged={Boolean(shared)} />;

  const g = grade(payload.o);
  const stats = shareMetrics(payload);
  const prev: PrevPayload | null = result?.prev ? { o: result.prev.overall, c: result.prev.c } : null;
  const delta = prev ? payload.o - prev.o : null;

  /** Radar click: open the matching fix and scroll to it. */
  function select(i: number) {
    const el = document.getElementById(`fix-${CATEGORY_ORDER[i].id}`) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: smooth(), block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24">
      <h1 className="sr-only">PRD Doctor result: {payload.o} out of 100, {g.label}</h1>
      <header className="no-print sticky top-0 z-20 -mx-6 flex items-center justify-between gap-4 border-b bg-background/70 px-6 py-3.5 backdrop-blur-md">
        <Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link>
        <div aria-hidden={!mini} className={`flex min-w-0 items-center gap-2.5 transition-all duration-300 ${mini ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}>
          <span className="serif score-grad text-2xl leading-none tabular-nums">{payload.o}</span>
          <span className="hidden rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em] sm:inline" style={{ background: g.bg, color: g.color }}>{g.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" onClick={clearDraft} className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:block">Analyze another</Link>
          <ThemeToggle />
        </div>
      </header>

      <section ref={heroRef} className="rise my-8 md:my-10" style={delay(0)}>
        <div className="panel grid items-center gap-8 p-6 md:grid-cols-[1fr_340px] md:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{result ? "Your PRD" : "Shared result"}</p>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em]" style={{ background: g.bg, color: g.color }}>{g.label}</span>
              {delta !== null && <DeltaChip delta={delta} />}
            </div>
            <div className="relative mt-2 flex items-baseline gap-2">
              <CountUp value={payload.o} className="serif score-grad text-[6.5rem] leading-none tabular-nums sm:text-[8.5rem]" />
              <span className="serif text-2xl text-muted-foreground">/100</span>
              {result && delta !== null && delta > 0 && <Celebrate id={result.id} />}
            </div>
            <p className="serif mt-3 max-w-md text-xl italic leading-snug">{g.verdict}</p>
            <p className="mt-2 max-w-md text-sm text-ink3">
              {result ? `${result.title} · ${result.words.toLocaleString()} words read across twelve categories.` : "A summary of scores. The PRD text itself is never shared."}
            </p>
            <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
              {stats.map((m) => (
                <div key={m.k} className="bg-surface/90 px-4 py-3">
                  <dt className="eyebrow">{m.k}</dt>
                  <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{m.v}</dd>
                </div>
              ))}
            </dl>
            {result && <FixFirst result={result} select={select} />}
            <ShareControls payload={payload} id={id} prev={delta !== null && delta > 0 ? prev : null} />
            <p className="no-print mt-5 max-w-md text-xs leading-relaxed text-ink3">
              This score checks structure and specifics, not whether the idea is good.{" "}
              <Link href="/how-scoring-works" className="underline underline-offset-4 hover:text-foreground">How scoring works</Link>
            </p>
          </div>
          <RadarChart scores={payload.c} active={active} onActive={setActive} onSelect={result ? select : undefined} />
        </div>
      </section>

      {result
        ? <FullReport result={result} active={active} setActive={setActive} select={select} />
        : <SharedBars scores={payload.c} active={active} setActive={setActive} />}
    </main>
  );
}

/** Jumps to the weakest category's fix, so the first screen ends in an obvious next step. */
function FixFirst({ result, select }: { result: AnalysisResult; select: (i: number) => void }) {
  const first = result.categories.filter((c) => c.status !== "strong").sort((a, b) => a.score - b.score)[0];
  if (!first) return null;
  const i = CATEGORY_ORDER.findIndex((m) => m.id === first.id);
  return (
    <button type="button" onClick={() => select(i)} className="btn-solid no-print mt-6 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">
      Fix this first: {first.label} <ArrowRight />
    </button>
  );
}

/** Lavender burst once per visit when a re-score improved. */
function Celebrate({ id }: { id: string }) {
  const key = `prd-doctor:burst:${id}`;
  const [show] = useState(() => { try { return !sessionStorage.getItem(key); } catch { return true; } });
  useEffect(() => { try { sessionStorage.setItem(key, "1"); } catch {} }, [key]);
  return show ? <Burst /> : null;
}

function DeltaChip({ delta }: { delta: number }) {
  const up = delta > 0, flat = delta === 0;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] ${up ? "pop" : ""}`} style={{ background: flat ? "#F4F1FB" : up ? "#EDF3EC" : "#FDEBEC", color: flat ? "#565170" : up ? "#346538" : "#9F2F2D" }}>
      {flat ? "No change since last time" : `${up ? "+" : ""}${delta} since last time`}
    </span>
  );
}

function Missing({ damaged }: { damaged: boolean }) {
  const histRaw = useSyncExternalStore(subscribe, readHistoryRaw, () => "");
  const history = parseHistory(histRaw).slice(0, 4);
  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center justify-between border-b py-4">
        <Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link>
        <ThemeToggle />
      </header>
      <section className="rise max-w-xl py-24" style={delay(0)}>
        <p className="eyebrow mb-4">{damaged ? "Broken link" : "Report not found"}</p>
        <h1 className="serif text-5xl leading-[1.06]">{damaged ? "That share link looks damaged." : "We can't find that report."}</h1>
        <p className="mt-5 text-[15px] text-ink2">
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h2 className="eyebrow">{title}</h2>{right}</div>
      {children}
    </Reveal>
  );
}

interface LinkProps { active: number | null; setActive: (i: number | null) => void }

function Bars({ scores, active, setActive, select, selectable }: LinkProps & { scores: number[]; select?: (i: number) => void; selectable?: (i: number) => boolean }) {
  return (
    <div className="grid gap-x-12 sm:grid-cols-2">
      {CATEGORY_ORDER.map((c, i) => {
        const sel = Boolean(select && selectable?.(i));
        return (
          <div
            key={c.id}
            role={sel ? "button" : undefined}
            tabIndex={sel ? 0 : undefined}
            aria-label={sel ? `${c.label}, ${scores[i]}. Jump to its fix` : undefined}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)} onBlur={() => setActive(null)}
            onClick={() => sel && select?.(i)}
            onKeyDown={(e) => { if (sel && e.key === "Enter") select?.(i); }}
            className={`-mx-3 rounded-md border-b border-transparent px-3 py-3 transition-colors ${active === i ? "bg-surface2/80" : ""} ${sel ? "cursor-pointer" : ""}`}
            style={{ borderBottomColor: "var(--border)" }}
          >
            <div className="mb-2 flex justify-between text-sm"><span>{c.label}</span><span className="font-mono text-xs text-muted-foreground">{scores[i]}</span></div>
            <div className="h-[3px] rounded-full bg-track" role="progressbar" aria-valuenow={scores[i]} aria-valuemin={0} aria-valuemax={100} aria-label={c.label}>
              <div className="bar-fill h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF]" style={{ "--w": `${scores[i]}%`, transitionDelay: `${(i % 6) * 70}ms` } as React.CSSProperties} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SharedBars({ scores, active, setActive }: LinkProps & { scores: number[] }) {
  return (
    <Section title="Category scores">
      <Bars scores={scores} active={active} setActive={setActive} />
      <Link href="/" className="btn-solid mt-10 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">Score your own PRD <ArrowRight /></Link>
    </Section>
  );
}

type CardMode = "score" | "progress";

function ShareControls({ payload, id, prev }: { payload: SharePayload; id: string; prev: PrevPayload | null }) {
  const [copied, flash] = useFlash();
  const [mode, setMode] = useState<CardMode>("score");
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    if (!preview) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [preview]);
  const progress = Boolean(prev) && mode === "progress";
  const kind = progress ? "progress" : "score";
  const q = `s=${encodePayload(payload)}${progress && prev ? `&p=${encodePrev(prev)}` : ""}`;
  // Plain score: short public link. Before and after: long link carrying the previous scores too.
  const url = () => (progress ? `${window.location.origin}/result/${id}?${q}` : `${window.location.origin}/r/${encodeShort(payload)}`);
  const text = progress && prev ? `My PRD went from ${prev.o} to ${payload.o} on PRD Doctor` : `My PRD scored ${payload.o}/100 on PRD Doctor`;

  async function share() {
    setProblem("");
    const method = typeof navigator.share === "function" ? "native" : "copy";
    track("share_clicked", { score: payload.o, method, kind });
    const u = url();
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: text, text, url: u }); return; } catch { /* cancelled */ }
    }
    if (await copyText(`${text}\n${u}`)) flash();
    else window.prompt("Copy this link", u);
  }

  function post(network: "linkedin" | "x") {
    track("share_clicked", { score: payload.o, method: network, kind });
    const u = encodeURIComponent(url());
    const href = network === "linkedin"
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${u}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function download() {
    setProblem("");
    track("share_clicked", { score: payload.o, method: "download", kind });
    try {
      const res = await fetch(`/api/og?${q}`);
      if (!res.ok) throw new Error("card failed");
      const href = URL.createObjectURL(await res.blob());
      // Phones and in-app browsers (LinkedIn, Instagram) often block file downloads: show the image to long-press instead.
      if (window.matchMedia("(hover: none)").matches) { setPreview(href); return; }
      const a = document.createElement("a");
      a.href = href;
      a.download = progress ? `prd-progress-${prev?.o}-to-${payload.o}.png` : `prd-score-${payload.o}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
    } catch {
      setProblem("Couldn't create the card. Check your connection and try again.");
    }
  }

  const round = "btn-line grid size-10 place-items-center text-ink2 hover:text-foreground";
  return (
    <div className="no-print mt-8">
      {prev && (
        <div role="group" aria-label="Share card style" className="mb-3 inline-flex max-w-full flex-wrap rounded-lg border bg-surface/70 p-0.5 text-xs">
          {(["score", "progress"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-ink2 hover:text-foreground"}`}>
              {m === "score" ? "My score" : `Before and after (${prev.o} to ${payload.o})`}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={share} className="btn-solid inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">
          {copied ? <Check /> : <Share />}{copied ? "Link copied" : progress ? "Share my progress" : "Share my PRD score"}
        </button>
        <button onClick={download} className="btn-line inline-flex h-10 items-center gap-2 px-4 text-sm"><Download />Download card</button>
        <button onClick={() => post("linkedin")} className="btn-line inline-flex h-10 items-center gap-2 px-4 text-sm" aria-label="Post on LinkedIn" title="Post on LinkedIn">
          <Linkedin className="size-[18px] text-[#0A66C2]" />Post on LinkedIn
        </button>
        <span className="flex items-center gap-2">
          <button onClick={() => post("x")} className={round} aria-label="Post on X" title="Post on X"><XLogo className="size-[16px]" /></button>
        </span>
      </div>
      {problem && <p role="alert" className="mt-3 text-sm text-danger">{problem}</p>}
      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Share card" className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-5 backdrop-blur-md" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg text-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`PRD Doctor share card, score ${payload.o} out of 100`} className="w-full rounded-xl border" />
            <p className="mt-3 text-sm text-ink2">Press and hold the image to save it, then add it to your post.</p>
            <button onClick={() => setPreview(null)} className="btn-solid mt-4 inline-flex h-10 items-center px-6 text-sm font-medium">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ status }: { status: CategoryResult["status"] }) {
  const t = statusTone(status);
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]" style={{ background: t.bg, color: t.color }}>{t.label}</span>;
}

function Toolbar({ result }: { result: AnalysisResult }) {
  const rescore = useRescore(result);
  const [copied, flash] = useFlash();
  const btn = "btn-line inline-flex h-9 items-center gap-2 px-3.5 text-[13px]";
  return (
    <div className="no-print rise mb-10 flex flex-wrap gap-2" style={delay(2)}>
      {result.text && <button className={btn} onClick={rescore}><Pencil />Edit and re-score</button>}
      <button className={btn} onClick={async () => { if (await copyText(reportMarkdown(result))) flash(); }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy as Markdown"}</button>
      <button className={btn} onClick={() => downloadText(`prd-report-${result.overall}.md`, reportMarkdown(result))}><File />Download .md</button>
      <button className={btn} onClick={() => { document.querySelectorAll("details").forEach((d) => (d.open = true)); setTimeout(() => window.print(), 60); }}><Printer />Print or save PDF</button>
    </div>
  );
}

function FullReport({ result, active, setActive, select }: LinkProps & { result: AnalysisResult; select: (i: number) => void }) {
  const by = (id: string) => result.categories.find((c) => c.id === id)!;
  const strongest = by(result.strongest);
  const fixes = result.categories.filter((c) => c.status !== "strong").sort((a, b) => a.score - b.score);
  const fixIds = new Set(fixes.map((f) => f.id));
  const doneRaw = useSyncExternalStore(subscribe, () => readDone(result.id), () => "");
  const done = useMemo(() => new Set(parseDone(doneRaw)), [doneRaw]);
  const doneCount = fixes.filter((f) => done.has(f.id)).length;
  const rescore = useRescore(result);

  return (
    <>
      <Toolbar result={result} />
      <Feedback id={result.id} score={result.overall} />

      <Section title="Prescription · where to start">
        <div className="grid gap-4 md:grid-cols-3">
          {result.weakest.map((id, i) => {
            const c = by(id);
            return (
              <div key={id} className="lift rounded-xl border bg-surface p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="rounded-full bg-softlav px-2.5 py-1 font-mono text-[11px] text-violet2">Rx {i + 1}</span><Tag status={c.status} />
                </div>
                <h3 className="serif text-2xl leading-tight">{c.label}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{c.score} / 100</p>
                <p className="mt-4 text-sm text-ink2">{c.missing[0] ? `No sign of ${c.missing[0]}.` : c.why}</p>
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
            <p className="mt-4 text-sm text-ink2">Found: {strongest.found.length ? strongest.found.join("; ") : "very little. This is simply your best section in an early draft"}.</p>
          </div>
        </div>
      </Section>

      <Section title="All categories" right={<span className="no-print text-xs text-muted-foreground">Hover to link with the chart. Click to jump to a fix.</span>}>
        <Bars scores={CATEGORY_ORDER.map((m) => by(m.id).score)} active={active} setActive={setActive} select={select} selectable={(i) => fixIds.has(CATEGORY_ORDER[i].id)} />
      </Section>

      <Section title={`Fixes · ${fixes.length}`} right={fixes.length > 0 ? <div className="flex flex-wrap items-center gap-4"><CopyAll fixes={fixes} /><AddressedMeter done={doneCount} total={fixes.length} onRescore={result.text ? rescore : undefined} /></div> : null}>
        {fixes.length === 0 ? <p className="text-sm text-ink2">Every category scored 70 or higher. Nothing to fix.</p> : (
          <div className="border-t">{fixes.map((c, i) => <Fix key={c.id} c={c} resultId={result.id} open={i < 2} addressed={done.has(c.id)} />)}</div>
        )}
        {fixes.length > 0 && <p className="no-print mt-5 text-xs text-muted-foreground">Mark a fix as addressed once you have updated your PRD, then use “Edit and re-score” to see the real change.</p>}
      </Section>

      <Rewrite text={result.rewrite} />
    </>
  );
}

function CopyAll({ fixes }: { fixes: CategoryResult[] }) {
  const [copied, flash] = useFlash();
  return (
    <button type="button" className="btn-line no-print inline-flex h-8 items-center gap-2 px-3 text-xs" onClick={async () => { if (await copyText(fixes.map(fixMarkdown).join("\n\n"))) flash(); }}>
      {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy all fixes"}
    </button>
  );
}

function AddressedMeter({ done, total, onRescore }: { done: number; total: number; onRescore?: () => void }) {
  const all = done === total;
  return (
    <div className="no-print flex items-center gap-3" aria-label={`${done} of ${total} fixes addressed`}>
      {all && onRescore && (
        <button onClick={onRescore} className="btn-solid pop inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium"><Pencil />Re-score now</button>
      )}
      <span className="font-mono text-xs text-muted-foreground">{all ? "All addressed" : `${done} of ${total} addressed`}</span>
      <span className="h-[5px] w-28 overflow-hidden rounded-full bg-track">
        <span className="block h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF] transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{ width: `${(done / total) * 100}%` }} />
      </span>
    </div>
  );
}

function Fix({ c, open, addressed, resultId }: { c: CategoryResult; open: boolean; addressed: boolean; resultId: string }) {
  const [copied, flash] = useFlash();
  return (
    <details id={`fix-${c.id}`} open={open} className={`group scroll-mt-24 border-b transition-opacity ${addressed ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="serif flex items-center gap-2 text-2xl">{addressed && <Check className="pop text-[#346538]" />}{c.label}</span>
          {addressed ? <span className="pop rounded-full bg-[#EDF3EC] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-[#346538]">Addressed</span> : <Tag status={c.status} />}
        </span>
        <span className="flex items-center gap-4 text-muted-foreground">
          <span className="font-mono text-xs">{c.score}</span>
          <Plus className="group-open:hidden" /><Minus className="hidden group-open:block" />
        </span>
      </summary>
      <div className="grid gap-x-10 gap-y-5 pb-8 text-[15px] leading-relaxed text-ink2 md:grid-cols-[180px_1fr]">
        <Row k={c.quote ? QUOTE_LABEL[c.quote.kind] : "Nearest text"}>
          {c.quote
            ? <blockquote className="serif text-lg italic leading-snug text-foreground">“{c.quote.text}”</blockquote>
            : <span className="text-ink3">No mention found in your PRD.</span>}
        </Row>
        <Row k="What is missing">{c.missing.length ? c.missing.join("; ") : "Nothing structural, but the signals found are thin."}</Row>
        <Row k="Why it matters">{c.why}</Row>
        <Row k="What to add">{c.add}</Row>
        <Row k="Question"><span className="serif text-lg text-foreground">{c.question}</span></Row>
        <div className="no-print flex flex-wrap gap-2 md:col-start-2">
          <button className="btn-line inline-flex h-8 items-center gap-2 px-3 text-xs" onClick={async () => { if (await copyText(fixMarkdown(c))) flash(); }}>
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
      <div className="rounded-xl border bg-surface2/80 p-6">
        <div className="no-print mb-4 flex justify-end">
          <button onClick={async () => { if (await copyText(text)) flash(); }} className="btn-line inline-flex h-8 items-center gap-2 px-3 text-xs">
            {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}</pre>
      </div>
    </Section>
  );
}
