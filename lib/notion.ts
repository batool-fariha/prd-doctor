/**
 * A minimal zip reader for Notion's export, built on the browser's own DecompressionStream, so no
 * dependency and nothing leaves the page. Reads the central directory, then inflates only the entries
 * asked for. Supports stored and deflated entries, which is all Notion and Google Takeout produce.
 */
export interface ZipEntry { name: string; size: number; read(): Promise<Uint8Array> }

const SIG_EOCD = 0x06054b50, SIG_CEN = 0x02014b50, SIG_LOC = 0x04034b50;

export function isZip(b: Uint8Array): boolean {
  return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export function listZip(bytes: Uint8Array): ZipEntry[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record is in the last 64 KB + 22 bytes (it may be followed by a comment).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === SIG_EOCD) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip file");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== SIG_CEN) throw new Error("zip directory is damaged");
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const loc = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue;
    out.push({
      name,
      size: usize,
      async read() {
        if (dv.getUint32(loc, true) !== SIG_LOC) throw new Error("zip entry is damaged");
        const start = loc + 30 + dv.getUint16(loc + 26, true) + dv.getUint16(loc + 28, true);
        const data = bytes.subarray(start, start + csize);
        if (method === 0) return data.slice();
        if (method !== 8) throw new Error(`unsupported zip compression (${method})`);
        const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      },
    });
  }
  return out;
}

/** Notion appends a 32-character id to exported file names: "Checkout PRD 1a2b...ef.md" -> "Checkout PRD". */
export function notionTitle(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.(md|markdown)$/i, "").replace(/\s+[0-9a-f]{32}$/i, "").trim() || base;
}

/**
 * Notion's Markdown export keeps a few HTML tags for blocks Markdown has no syntax for. Callouts come out as
 * <aside>…</aside>, and toggles can come out as <details><summary>. Keep their text and drop the tags, so they
 * don't land in the analysis as stray words. Only tags are removed; nothing is ever rendered as HTML.
 */
export function cleanNotionMarkdown(md: string): string {
  return md
    .replace(/<\/?(aside|details)\s*>/gi, "\n")
    .replace(/<summary>\s*([\s\S]*?)\s*<\/summary>/gi, "$1\n")
    .replace(/\n{3,}/g, "\n\n");
}

const isMd = (n: string) => /\.(md|markdown)$/i.test(n) && !/(^|\/)__MACOSX\//.test(n);
const depth = (n: string) => n.split("/").length;

/**
 * Picks the page to analyse from a Notion "Markdown & CSV" export zip: the top-level page (fewest folders deep),
 * and the largest one if there are several at that level. Large exports wrap the pages in "Part-1.zip" files,
 * so one level of nested zip is opened too. Returns null when there is no Markdown page.
 */
export async function pickNotionPage(bytes: Uint8Array): Promise<{ name: string; text: string; pages: number } | null> {
  let entries: ZipEntry[] = listZip(bytes);
  if (!entries.some((e) => isMd(e.name))) {
    const inner = entries.filter((e) => /\.zip$/i.test(e.name));
    const nested: ZipEntry[] = [];
    for (const z of inner) {
      const b = await z.read();
      if (isZip(b)) nested.push(...listZip(b));
    }
    entries = nested;
  }
  const md = entries.filter((e) => isMd(e.name));
  if (!md.length) return null;
  const top = Math.min(...md.map((e) => depth(e.name)));
  const page = md.filter((e) => depth(e.name) === top).sort((a, b) => b.size - a.size)[0];
  const text = new TextDecoder().decode(await page.read());
  return { name: notionTitle(page.name), text, pages: md.length };
}
