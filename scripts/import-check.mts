/**
 * Checks importing from Notion (Markdown export, as a .md or the export .zip) against files shaped like Notion's
 * "Markdown & CSV" export. Run: node --experimental-strip-types scripts/import-check.mts
 * Zips are built here with node:zlib, so the zip reader in lib/notion.ts is tested against real deflate data.
 */
import { crc32, deflateRawSync } from "node:zlib";
const { listZip, isZip, pickNotionPage, cleanNotionMarkdown, notionTitle } = await import("../lib/notion.ts");
const { analyzePRD, normalizeText } = await import("../lib/analyzer.ts");

let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { failed++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`); }
};

function zip(files: [string, string | Uint8Array, ("store" | "deflate")?][]): Uint8Array {
  const enc = new TextEncoder(), local: Uint8Array[] = [], central: Uint8Array[] = [];
  let off = 0;
  for (const [name, content, how = "deflate"] of files) {
    const raw = typeof content === "string" ? enc.encode(content) : content;
    const data = how === "store" ? raw : new Uint8Array(deflateRawSync(raw));
    const n = enc.encode(name), crc = crc32(raw);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, how === "store" ? 0 : 8, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, raw.length, true); lh.setUint16(26, n.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(10, how === "store" ? 0 : 8, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, raw.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
    local.push(new Uint8Array(lh.buffer), n, data);
    central.push(new Uint8Array(ch.buffer), n);
    off += 30 + n.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const x of parts) { out.set(x, p); p += x.length; }
  return out;
}

// Shaped like a Notion page exported as Markdown: title, property lines, a callout as <aside>, a toggle as <details>.
const ID = "1a2b3c4d5e6f708192a3b4c5d6e7f809";
const PAGE = `# Checkout redesign

Owner: Sam Lee
Status: In review

<aside>
💡 Decision needed by Friday: one-page or two-step checkout.
</aside>

## Problem

Mobile checkout conversion is 2.1% against 3.4% on desktop. Users abandon at the payment step.

## Goals

- Raise mobile checkout conversion from 2.1% to 2.8% by the end of Q1.

<details>
<summary>Out of scope</summary>

Saved cards and wallets.

</details>

## Success metrics

Primary: mobile checkout conversion. Guardrail: payment error rate stays under 1%.
`;

console.log("notion import");

ok("file name loses Notion's id", notionTitle(`Export/Checkout redesign ${ID}.md`) === "Checkout redesign");
ok("a name without an id is kept", notionTitle("Plain PRD.md") === "Plain PRD");

const cleaned = cleanNotionMarkdown(PAGE);
ok("callout and toggle tags are removed, their text kept", !/<\/?(aside|details|summary)/i.test(cleaned) && cleaned.includes("Decision needed by Friday") && cleaned.includes("Out of scope\n"));

const z = zip([[`Checkout redesign ${ID}.md`, PAGE], [`Checkout redesign ${ID}/Research notes ${ID.replace("1", "2")}.md`, "# Research notes\n\nA longer sub-page. ".repeat(80)], [`Checkout redesign ${ID}/diagram.png`, new Uint8Array([137, 80, 78, 71]), "store"]]);
ok("zip signature is recognised", isZip(z));
ok("zip directory lists every file", listZip(z).length === 3);

const page = await pickNotionPage(z);
ok("the top-level page is picked, not the larger sub-page", page?.name === "Checkout redesign", JSON.stringify(page?.name));
ok("its text is inflated intact", page?.text === PAGE);
ok("all pages are counted", page?.pages === 2);

const stored = await pickNotionPage(zip([[`Stored ${ID}.md`, PAGE, "store"]]));
ok("stored (uncompressed) entries read too", stored?.text === PAGE);

const nested = await pickNotionPage(zip([["Export-abc-Part-1.zip", zip([[`Checkout redesign ${ID}.md`, PAGE]]), "store"]]));
ok("large exports with a nested Part-1.zip are opened", nested?.name === "Checkout redesign" && nested.text === PAGE);

ok("a zip with no Markdown gives null", (await pickNotionPage(zip([["a.csv", "x,y"]]))) === null);

let threw = false;
try { listZip(new Uint8Array([1, 2, 3, 4, 5])); } catch { threw = true; }
ok("a file that isn't a zip is rejected", threw);

// The cleaned export scores at least as well as the raw one, and no tag text reaches the analysis.
const raw = analyzePRD(normalizeText(PAGE)).overall, clean = analyzePRD(normalizeText(cleaned)).overall;
ok("cleaning never lowers the score", clean >= raw, `raw ${raw}, cleaned ${clean}`);

console.log("google docs import");

// Google Docs' File > Download > Microsoft Word (.docx) names its heading styles "heading 1", "heading 2" (lower case)
// and the document title "Title". This builds a .docx with those style names and runs it through the same
// mammoth + htmlToText path the app uses, to check headings survive.
const { DOMParser } = await import("linkedom");
(globalThis as unknown as { DOMParser: unknown }).DOMParser = DOMParser;
const { htmlToText } = await import("../lib/paste.ts");
const mammoth = (await import("mammoth")).default;
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const para = (style: string | null, text: string) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const styleDef = (id: string, name: string) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/></w:style>`;
const docx = zip([
  ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
  ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
  ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ["word/styles.xml", `<?xml version="1.0" encoding="UTF-8"?><w:styles ${W}>${styleDef("Title", "Title")}${styleDef("Heading1", "heading 1")}${styleDef("Heading2", "heading 2")}</w:styles>`],
  ["word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${para("Title", "Checkout redesign")}${para("Heading1", "Problem")}${para(null, "Mobile checkout conversion is 2.1% against 3.4% on desktop.")}${para("Heading2", "Goals")}${para(null, "Raise mobile conversion to 2.8% by the end of Q1.")}</w:body></w:document>`],
]);
const html = (await mammoth.convertToHtml({ buffer: Buffer.from(docx) })).value;
const text = htmlToText(`<!doctype html><html><body>${html}</body></html>`) ?? "";
ok("Google Docs heading styles become Markdown headings", /^# Problem$/m.test(text) && /^## Goals$/m.test(text), JSON.stringify(text));
ok("body text is kept", text.includes("Mobile checkout conversion is 2.1%"));

console.log(failed ? `\n${failed} check(s) failed` : "\nall import checks passed");
process.exit(failed ? 1 : 0);
