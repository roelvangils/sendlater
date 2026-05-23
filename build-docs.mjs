#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "docs-src");
const outDir = resolve(here, "docs");

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
const template = readFileSync(resolve(srcDir, "template.html"), "utf8");

const pages = [
  {
    src: "en.md",
    out: "index.html",
    lang: "en",
    title: "sendlater — User guide",
    current: "en",
  },
  {
    src: "nl.md",
    out: "handleiding.html",
    lang: "nl",
    title: "sendlater — Handleiding",
    current: "nl",
  },
];

mkdirSync(outDir, { recursive: true });

for (const page of pages) {
  const markdown = readFileSync(resolve(srcDir, page.src), "utf8");
  const content = md.render(markdown);
  const html = template
    .replace("{{lang}}", page.lang)
    .replace("{{title}}", page.title)
    .replace("{{content}}", content)
    .replace("{{nav_en_current}}", page.current === "en" ? ' aria-current="page"' : "")
    .replace("{{nav_nl_current}}", page.current === "nl" ? ' aria-current="page"' : "");
  writeFileSync(resolve(outDir, page.out), html);
  console.log(`wrote ${page.out}`);
}
