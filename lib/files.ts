import { normalizeText } from "./analyzer";
import { htmlToText } from "./paste";

export type FileKind = "md" | "txt" | "docx" | "pdf";
export interface LoadedFile { text: string; name: string; kind: FileKind; pages?: number }

export const ACCEPT =
  ".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const MB = 1024 * 1024;

interface Mammoth {
  convertToHtml(i: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
  extractRawText(i: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}

function kindOf(f: File): FileKind | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || f.type === "application/pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt" || f.type.startsWith("text/")) return "txt";
  return null;
}

/** PDF text arrives hard-wrapped. Re-join a line onto the previous one when it clearly continues it. */
function unwrap(text: string): string {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const prev = out[out.length - 1];
    if (prev && line && /^[a-z(]/.test(line) && !/[.!?:;]$/.test(prev)) {
      out[out.length - 1] = prev.endsWith("-") ? prev.slice(0, -1) + line : `${prev} ${line}`;
    } else out.push(line);
  }
  return out.join("\n");
}

/**
 * Reads a PDF, Word (.docx), Markdown or text file entirely in the browser. The file is never uploaded.
 * The PDF and Word parsers are loaded on demand so they don't weigh down the first page load.
 */
export async function readFile(f: File): Promise<LoadedFile> {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "doc") throw new Error("Old .doc files can't be read here. In Word choose File, Save As, .docx, or copy and paste the text.");
  const kind = kindOf(f);
  if (!kind) throw new Error(`“${f.name}” can't be read here. Use a PDF, Word (.docx), Markdown or text file, or paste the text.`);
  const limit = kind === "pdf" || kind === "docx" ? 15 * MB : MB;
  if (f.size > limit) throw new Error(`That file is over ${limit / MB} MB. Paste the relevant sections instead.`);

  if (kind === "md" || kind === "txt") return { text: normalizeText(await f.text()), name: f.name, kind };

  const buf = await f.arrayBuffer();

  if (kind === "docx") {
    try {
      const mod = (await import("mammoth/mammoth.browser")) as unknown as { default?: Mammoth } & Mammoth;
      const m = mod.default ?? mod;
      // HTML keeps Word's heading styles and lists, so sections are detected just like pasted text.
      const html = (await m.convertToHtml({ arrayBuffer: buf })).value;
      const text = htmlToText(html) ?? (await m.extractRawText({ arrayBuffer: buf })).value;
      if (text.trim().length < 20) throw new Error("empty");
      return { text: normalizeText(text), name: f.name, kind };
    } catch {
      throw new Error("That Word file couldn't be read. It may be empty, corrupted or password-protected. Copy and paste the text instead.");
    }
  }

  try {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    if (text.trim().length < 30) {
      throw new Error("This PDF has no selectable text. It may be a scan or images. PRD Doctor can't read pictures of text, so export a text PDF or paste the content.");
    }
    return { text: normalizeText(unwrap(text)), name: f.name, kind, pages: totalPages };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("This PDF has no")) throw e;
    if (e instanceof Error && /password/i.test(`${e.name} ${e.message}`)) throw new Error("That PDF is password-protected. Remove the password, or paste the text.");
    throw new Error("That PDF couldn't be read. It may be corrupted. Try exporting it again, or paste the text.");
  }
}
