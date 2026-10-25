/**
 * Turns copied rich text (Google Docs, Notion, Confluence) into plain markdown-ish text so headings and
 * lists survive. Returns null when the HTML has no structure worth keeping. Only reads textContent:
 * nothing from the pasted HTML is ever inserted into the page.
 */
export function htmlToText(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.querySelector("h1,h2,h3,h4,h5,h6,li")) return null;
  // A soft line break (Shift+Enter in Docs, Confluence) must stay a break, or "Problem<br>Users leave" fuses into one word.
  doc.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  const out: string[] = [];
  doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,pre,tr,blockquote").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "p" && el.closest("li,td,th,blockquote")) return;
    if (tag === "li" && el.closest("td,th")) return; // already part of its table row
    let text: string;
    if (tag === "li") {
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll("ul,ol").forEach((n) => n.remove());
      text = clone.textContent ?? "";
    } else if (tag === "tr") {
      text = [...el.querySelectorAll("td,th")].map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
    } else text = el.textContent ?? "";
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!lines.length) return;
    const text1 = lines.join(" ");
    if (/^h[1-6]$/.test(tag)) out.push("", `${"#".repeat(Number(tag[1]))} ${text1}`);
    else if (tag === "li") out.push(`${"  ".repeat(listDepth(el))}- ${text1}`);
    else if (tag === "tr") out.push(text1);
    else out.push(...lines);
  });
  return out.join("\n");
}

function listDepth(el: Element): number {
  let d = 0;
  for (let p = el.parentElement; p; p = p.parentElement) if (/^(ul|ol)$/i.test(p.tagName)) d++;
  return Math.max(0, d - 1);
}
