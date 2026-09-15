#!/usr/bin/env node
// playwright-fold.mjs — drive the Fold's browser UI with Playwright.
//
// The Fold's runtime (chat, folds, the sandboxed terminal) lives in the
// page; serve.mjs deliberately has no control surface (P18). So the browser
// IS the API, and this module is the client.
//
// Library:
//   import { openFold } from "./playwright-fold.mjs";
//   const fold = await openFold();                 // headless by default
//   await fold.model("gemma2:2b");                 // pick via the real picker
//   const res = await fold.ask("What river is Nashville on?");
//   console.log(res.turns.at(-1).body);
//   await fold.close();
//
// CLI:
//   node playwright-fold.mjs "prompt" [--model NAME] [--headed] [--out FILE]
//   node playwright-fold.mjs --list-models
//   node playwright-fold.mjs --prompt-file prompt.md --model gemma2:2b
//
// Env: FOLD_URL (default http://localhost:8812).

import { chromium } from "playwright";

const FOLD_URL = process.env.FOLD_URL || "http://localhost:8812";

export async function openFold({ headless = true, url = FOLD_URL, width = 1400, height = 900 } = {}) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width, height } });
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGE: ${e.message}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#input", { state: "visible", timeout: 30000 });
  const notServed = await page.locator("#not-served").isVisible().catch(() => false);
  if (notServed) {
    throw new Error(`The Fold was not served (${url}). Console:\n${consoleErrors.join("\n") || "(none)"}`);
  }
  return new FoldClient(browser, page, consoleErrors);
}

export class FoldClient {
  constructor(browser, page, consoleErrors) {
    this.browser = browser;
    this.page = page;
    this.consoleErrors = consoleErrors;
  }

  async model(name) {
    const page = this.page;
    await page.locator("#model-pick").click();
    await page.locator("#model-menu").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#model-search").fill(name);
    const row = page.locator("#model-rows .model-row").filter({ hasText: name }).first();
    await row.waitFor({ state: "visible", timeout: 15000 }).catch(async () => {
      const empty = await page.locator("#model-rows .empty").innerText().catch(() => "");
      throw new Error(`No model row for "${name}"${empty ? ` — menu says: ${empty}` : ""}`);
    });
    await row.click();
    await page.locator("#model-menu").waitFor({ state: "hidden", timeout: 15000 });
    await page.locator("#send").waitFor({ state: "visible", timeout: 15000 });
    await this.#waitEnabled("#send", 30000);
    const pick = await page.locator("#model-name").innerText();
    return pick;
  }

  async listModels() {
    const page = this.page;
    await page.locator("#model-pick").click();
    await page.locator("#model-menu").waitFor({ state: "visible", timeout: 15000 });
    const rows = await page.locator("#model-rows .model-row").allInnerTexts();
    await this.#closeDialog();
    return rows.map((t) => t.replace(/\s+/g, " ").trim());
  }

  async ask(text, { timeoutMs = 300000, settleMs = 4000 } = {}) {
    const page = this.page;
    const input = page.locator("#input");
    await input.fill(text);
    await this.#waitEnabled("#send", 10000);

    const before = await page.locator(".msg").count();
    await page.locator("#send").click();

    await page.waitForFunction(
      (n) => document.querySelectorAll(".msg").length > n,
      before,
      { timeout: 60000 }
    );

    await page.waitForFunction(
      () => document.querySelector("#model-pick")?.dataset.working === "yes",
      { timeout: timeoutMs }
    ).catch(() => {});
    await page.waitForFunction(
      () => {
        const w = document.querySelector("#model-pick")?.dataset.working;
        return w === "no" || w === undefined;
      },
      { timeout: timeoutMs }
    );
    await new Promise((r) => setTimeout(r, settleMs));

    return {
      turns: await this.transcript(),
      folds: await this.folds(),
      consoleErrors: [...this.consoleErrors],
    };
  }

  async transcript() {
    const page = this.page;
    return page.locator(".msg").evaluateAll((msgs) =>
      msgs.map((m) => ({
        role: m.classList.contains("user") ? "user" : "assistant",
        body: m.querySelector(".body")?.innerText ?? m.innerText,
        disclosure: m.querySelector(".turn-meta details.fold")?.innerText ?? null,
      }))
    );
  }

  async folds() {
    const page = this.page;
    return page
      .locator(".turn-meta details.fold")
      .evaluateAll((ds) => ds.map((d) => d.innerText));
  }

  async close() {
    await this.browser.close();
  }

  async #waitEnabled(sel, ms) {
    await this.page.waitForFunction(
      (s) => {
        const el = document.querySelector(s);
        return el && !el.disabled;
      },
      sel,
      { timeout: ms }
    );
  }

  async #closeDialog() {
    const page = this.page;
    const x = page.locator("#model-menu .sheet-close");
    if (await x.count().then((n) => n > 0)) {
      await x.first().click().catch(() => {});
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
}

function usage() {
  console.error(
    [
      "usage: node playwright-fold.mjs <prompt> [--model NAME] [--headed] [--out FILE]",
      "       node playwright-fold.mjs --prompt-file FILE [--model NAME] [--headed] [--out FILE]",
      "       node playwright-fold.mjs --list-models [--headed]",
    ].join("\n")
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = { model: null, headed: false, out: null, promptFile: null, listModels: false };
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--model": opts.model = argv[++i]; break;
      case "--headed": opts.headed = true; break;
      case "--out": opts.out = argv[++i]; break;
      case "--prompt-file": opts.promptFile = argv[++i]; break;
      case "--list-models": opts.listModels = true; break;
      case "-h": case "--help": return usage();
      default: args.push(argv[i]);
    }
  }

  let prompt = args.join(" ");
  if (opts.promptFile) {
    const { readFileSync } = await import("node:fs");
    prompt = readFileSync(opts.promptFile, "utf8");
  }
  if (!opts.listModels && !prompt.trim()) return usage();

  const fold = await openFold({ headless: !opts.headed });
  try {
    if (opts.listModels) {
      const models = await fold.listModels();
      console.log(models.join("\n"));
      return;
    }
    const picked = opts.model ? await fold.model(opts.model) : await fold.page.locator("#model-name").innerText();
    console.log(`[fold] model: ${picked}`);
    console.log(`[fold] sending ${prompt.length} chars…`);

    const res = await fold.ask(prompt);
    const markdown = [
      "# Fold — Playwright run",
      `Model: ${picked}`,
      `Time: ${new Date().toISOString()}`,
      "",
      "## Transcript",
      ...res.turns.map((t, i) => `--- ${t.role.toUpperCase()} ${i + 1} ---\n${t.body}`),
      "",
      "## Disclosures",
      res.folds.length ? res.folds.join("\n===\n") : "(none)",
      "",
      "## Console errors",
      res.consoleErrors.length ? res.consoleErrors.join("\n") : "(none)",
    ].join("\n");

    if (opts.out) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(opts.out, markdown);
      console.log(`[fold] wrote ${opts.out}`);
    } else {
      console.log(markdown);
    }
  } finally {
    await fold.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`[fold] fatal: ${e.message}`);
    process.exit(1);
  });
}