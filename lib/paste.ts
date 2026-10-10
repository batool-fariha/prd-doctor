/**
 * Turns copied rich text (Google Docs, Notion, Confluence) into plain markdown-ish text so headings and
 * lists survive. Returns null when the HTML has no structure worth keeping. Only reads textContent:
 * nothing from the pasted HTML is ever inserted into the page.
 */
export function htmlToText(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.querySelector("h1,h2,h3,h4,h5,h6,li")) return null;
  const out: string[] = [];
  doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,pre,tr,blockquote").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "p" && el.closest("li,td,th,blockquote")) return;
    let text: string;
    if (tag === "li") {
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll("ul,ol").forEach((n) => n.remove());
      text = clone.textContent ?? "";
    } else if (tag === "tr") {
      text = [...el.querySelectorAll("td,th")].map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
    } else text = el.textContent ?? "";
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return;
    if (/^h[1-6]$/.test(tag)) out.push("", `${"#".repeat(Number(tag[1]))} ${text}`);
    else if (tag === "li") out.push(`${"  ".repeat(listDepth(el))}- ${text}`);
    else out.push(text);
  });
  return out.join("\n");
}

function listDepth(el: Element): number {
  let d = 0;
  for (let p = el.parentElement; p; p = p.parentElement) if (/^(ul|ol)$/i.test(p.tagName)) d++;
  return Math.max(0, d - 1);
}
