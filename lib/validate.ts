import { countWords, MIN_WORDS } from "./analyzer";

export const MAX_CHARS = 60_000;

/** Returns a human-readable problem with the input, or null when it is fine to analyze. */
export function validatePRD(text: string): string | null {
  const words = countWords(text);
  if (words < MIN_WORDS) return `Needs at least ${MIN_WORDS} words to say anything useful. You have ${words}.`;
  if (text.length > MAX_CHARS) {
    return `That is about ${words.toLocaleString()} words, over the ${MAX_CHARS.toLocaleString()}-character limit. Trim it to the sections that matter, or run it in two parts.`;
  }
  const visible = text.replace(/\s/g, "");
  const letters = (visible.match(/\p{L}/gu) ?? []).length;
  if (letters / Math.max(1, visible.length) < 0.55) {
    return "This looks like code, data or symbols rather than a written document. Paste the PRD text itself.";
  }
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 10 && new Set(lines).size / lines.length < 0.3) {
    return "Most lines are repeated, so there is little to analyze. Check that you pasted the right document.";
  }
  return null;
}
