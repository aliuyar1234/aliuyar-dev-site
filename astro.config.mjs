import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import research from "./src/content/research.json" with { type: "json" };
import writing from "./src/content/writing.json" with { type: "json" };

const SITE = "https://aliuyar.dev";

// lastmod per URL, so search engines see when a paper or essay was published.
const latest = (dates) => dates.filter(Boolean).sort().at(-1);
const lastmod = new Map([
  ...research.filter((p) => p.slug && p.date).map((p) => [`${SITE}/research/${p.slug}/`, p.date]),
  ...writing.map((a) => [`${SITE}/articles/${a.slug}/`, a.date]),
  [`${SITE}/research/`, latest(research.map((p) => p.date))],
  [`${SITE}/articles/`, latest(writing.map((a) => a.date))],
]);

export default defineConfig({
  site: SITE,
  output: "static",
  // Cloudflare Pages serves every page as a directory with a trailing slash.
  trailingSlash: "always",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/404"),
      serialize(item) {
        const date = lastmod.get(item.url);
        return date ? { ...item, lastmod: new Date(date).toISOString() } : item;
      },
    }),
  ],
});
