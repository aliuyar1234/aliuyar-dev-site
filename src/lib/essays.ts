import writing from "../content/writing.json";

export interface Essay { slug: string; title: string; date: string; summary: string; tags: string[]; content: string[] }
export type Block = { kind: "p"; text: string } | { kind: "h2"; text: string } | { kind: "ul"; items: string[] };

export const essays = (writing as Essay[]).slice().sort((a, b) => b.date.localeCompare(a.date));

// Essays are stored as lines: "## " starts a heading, "- " a list item, blank lines split paragraphs.
export function blocks(essay: Essay): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    if (list.length) out.push({ kind: "ul", items: list });
    para = [];
    list = [];
  };
  for (const raw of essay.content.length ? essay.content : [essay.summary]) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("## ")) { flush(); out.push({ kind: "h2", text: line.slice(3) }); }
    else if (line.startsWith("- ")) { if (para.length) flush(); list.push(line.slice(2)); }
    else { if (list.length) flush(); para.push(line); }
  }
  flush();
  return out;
}

export const words = (e: Essay) => e.content.join(" ").split(/\s+/).filter(Boolean).length;
export const readMinutes = (e: Essay) => Math.max(1, Math.round(words(e) / 230));
