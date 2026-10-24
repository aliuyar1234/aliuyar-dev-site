import { SITE } from "../lib/site";
import { essays } from "../lib/essays";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function GET() {
  const items = essays
    .map((e) => {
      const url = `${SITE.url}/articles/${e.slug}/`;
      return `<item><title>${esc(e.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><description>${esc(e.summary)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Ali Uyar: writing</title><link>${SITE.url}/articles/</link><description>Essays on trusting AI decisions in real companies.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
