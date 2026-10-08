import type { AnalysisResult } from "./analyzer";

const key = (id: string) => `prd-doctor:result:${id}`;

export function saveResult(r: AnalysisResult) {
  try { localStorage.setItem(key(r.id), JSON.stringify(r)); } catch {}
}

export function loadResult(id: string): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}

/** Raw JSON string for useSyncExternalStore (stable between calls). */
export function readRaw(id: string): string | null {
  try { return localStorage.getItem(key(id)); } catch { return null; }
}
