import type { AnalysisResult } from "./analyzer";

const key = (id: string) => `prd-doctor:result:${id}`;
const HKEY = "prd-doctor:history";
const DKEY = "prd-doctor:draft";

export interface HistoryItem { id: string; title: string; overall: number; words: number; createdAt: number }

// Tiny external store so useSyncExternalStore sees same-tab writes too.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
export function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
}

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

function readHistory(): HistoryItem[] {
  try { const a = JSON.parse(get(HKEY) ?? "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
}

/** Saves the result, links it to the previous run of the same PRD (same title), and updates history. */
export function saveResult(r: AnalysisResult) {
  try {
    const hist = readHistory();
    const prev = hist.find((h) => h.title === r.title);
    if (prev) r.prev = { id: prev.id, overall: prev.overall, createdAt: prev.createdAt };
    localStorage.setItem(key(r.id), JSON.stringify(r));
    const next: HistoryItem[] = [{ id: r.id, title: r.title, overall: r.overall, words: r.words, createdAt: r.createdAt }, ...hist];
    next.slice(30).forEach((h) => localStorage.removeItem(key(h.id)));
    localStorage.setItem(HKEY, JSON.stringify(next.slice(0, 30)));
  } catch {
    /* storage full or blocked: the result still renders for this session via navigation */
  }
  notify();
}

export const readRaw = (id: string) => get(key(id));
export const readHistoryRaw = () => get(HKEY) ?? "";
export const readDraft = () => get(DKEY) ?? "";
export const parseHistory = (raw: string): HistoryItem[] => { try { const a = JSON.parse(raw || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };

export function setDraft(text: string) { try { localStorage.setItem(DKEY, text); } catch {} notify(); }
export function clearDraft() { try { localStorage.removeItem(DKEY); } catch {} notify(); }
export function clearHistory() {
  try { readHistory().forEach((h) => localStorage.removeItem(key(h.id))); localStorage.removeItem(HKEY); } catch {}
  notify();
}

// "Addressed" fixes per result (the user ticks them off while editing their PRD).
const dkey = (id: string) => `prd-doctor:done:${id}`;
export const readDone = (id: string) => get(dkey(id)) ?? "";
export const parseDone = (raw: string): string[] => { try { const a = JSON.parse(raw || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
export function toggleDone(id: string, cat: string) {
  const cur = parseDone(readDone(id));
  const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat];
  try { localStorage.setItem(dkey(id), JSON.stringify(next)); } catch {}
  notify();
}
