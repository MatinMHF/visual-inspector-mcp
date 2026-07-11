#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium } from "playwright";

let browser = null;
let page = null;
const consoleLogs = [];
const MAX_LOGS = 300;
const DEFAULT_LOG_LIMIT = 30;

async function ensurePage() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  if (!page || page.isClosed()) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
    page.on("console", (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), time: Date.now() });
      if (consoleLogs.length > MAX_LOGS) consoleLogs.shift();
    });
    page.on("pageerror", (err) => {
      consoleLogs.push({ type: "pageerror", text: err.message, time: Date.now() });
      if (consoleLogs.length > MAX_LOGS) consoleLogs.shift();
    });
  }
  return page;
}

const server = new McpServer({
  name: "visual-inspector",
  version: "1.0.0",
});

server.registerTool(
  "navigate",
  {
    title: "Navigate",
    description:
      "Load a URL in a persistent headless browser page (dev server, file://, or public site). Stays open for later click/screenshot calls.",
    inputSchema: {
      url: z.string().describe("URL to load"),
      waitForSelector: z.string().optional().describe("Wait for this selector before returning (SPAs)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  async ({ url, waitForSelector }) => {
    const p = await ensurePage();
    await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (waitForSelector) {
      await p.locator(waitForSelector).first().waitFor({ timeout: 10000 });
    }
    const title = await p.title();
    // Report the resolved URL, not the input — catches silent redirects.
    return { content: [{ type: "text", text: `${p.url()} — "${title}"` }] };
  }
);

server.registerTool(
  "screenshot",
  {
    title: "Screenshot",
    description:
      "Screenshot the current page and return it as a viewable image — see the actual rendered UI instead of guessing from code. " +
      "Prefer selector (one element, cheapest) over the default viewport, and viewport over fullPage (priciest); use the smallest capture " +
      "that answers the question. Requires navigate first.",
    inputSchema: {
      selector: z
        .string()
        .optional()
        .describe("CSS selector or Playwright locator (e.g. 'text=Submit') to capture one element only"),
      fullPage: z
        .boolean()
        .optional()
        .describe("Capture the full scrollable page, not just the viewport (more expensive — use only when the full layout matters)"),
      format: z
        .enum(["png", "jpeg"])
        .optional()
        .describe("png (default, lossless) or jpeg (smaller payload; fine for whole-page layout checks, not pixel-level detail)"),
      quality: z.number().min(1).max(100).optional().describe("JPEG quality 1-100 (default 80); ignored for png"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ selector, fullPage, format, quality }) => {
    const p = await ensurePage();
    if (p.url() === "about:blank") {
      throw new Error("No page loaded yet — call 'navigate' first with a URL.");
    }
    const type = format ?? "png";
    const shotOpts = type === "jpeg" ? { type, quality: quality ?? 80 } : { type };
    let buffer;
    if (selector) {
      const locator = p.locator(selector).first();
      await locator.waitFor({ state: "visible", timeout: 10000 });
      buffer = await locator.screenshot(shotOpts);
    } else {
      buffer = await p.screenshot({ ...shotOpts, fullPage: !!fullPage });
    }
    return {
      content: [
        { type: "image", data: buffer.toString("base64"), mimeType: type === "jpeg" ? "image/jpeg" : "image/png" },
      ],
    };
  }
);

server.registerTool(
  "click",
  {
    title: "Click",
    description: "Click an element by selector to reach a UI state (open a menu/modal/tab) before screenshotting it.",
    inputSchema: {
      selector: z.string().describe("CSS selector or Playwright locator of the element to click"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ selector }) => {
    const p = await ensurePage();
    await p.locator(selector).first().click({ timeout: 10000 });
    return { content: [{ type: "text", text: `Clicked: ${selector}` }] };
  }
);

server.registerTool(
  "fill",
  {
    title: "Fill form field",
    description:
      "Set the value of an input/textarea/select by selector (Playwright locator.fill — clears then types, and dispatches the input/change " +
      "events React controlled components need). Pass `fields` to fill several inputs in one call. Use `type` instead only for inputs that " +
      "require per-keystroke keydown events.",
    inputSchema: {
      selector: z.string().optional().describe("CSS selector or Playwright locator of a single field to fill"),
      value: z.string().optional().describe("Value to set for `selector`"),
      fields: z
        .array(z.object({ selector: z.string(), value: z.string() }))
        .optional()
        .describe("Fill multiple fields in order, e.g. [{selector, value}, ...]"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ selector, value, fields }) => {
    const p = await ensurePage();
    const toFill = fields && fields.length ? fields : [];
    if (selector != null) toFill.push({ selector, value: value ?? "" });
    if (!toFill.length) throw new Error("Provide `selector`+`value` or a non-empty `fields` array.");
    for (const f of toFill) {
      const loc = p.locator(f.selector).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      await loc.fill(f.value);
    }
    return { content: [{ type: "text", text: `Filled ${toFill.length} field(s): ${toFill.map((f) => f.selector).join(", ")}` }] };
  }
);

server.registerTool(
  "type",
  {
    title: "Type text (per-keystroke)",
    description:
      "Type into a field one key at a time (Playwright locator.pressSequentially), firing a keydown/keypress/keyup per character — for " +
      "inputs whose handlers need real keystrokes and don't react to `fill`. Set `clear` to empty the field first.",
    inputSchema: {
      selector: z.string().describe("CSS selector or Playwright locator of the field"),
      text: z.string().describe("Text to type"),
      clear: z.boolean().optional().describe("Clear the field before typing (default false)"),
      delay: z.number().optional().describe("Delay in ms between keystrokes (default 20)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ selector, text, clear, delay }) => {
    const p = await ensurePage();
    const loc = p.locator(selector).first();
    await loc.waitFor({ state: "visible", timeout: 10000 });
    if (clear) await loc.fill("");
    await loc.pressSequentially(text, { delay: delay ?? 20 });
    return { content: [{ type: "text", text: `Typed into ${selector}` }] };
  }
);

server.registerTool(
  "press",
  {
    title: "Press key",
    description:
      "Press a keyboard key such as 'Enter' (submit a form), 'Tab', or 'Escape'. With `selector` the key is sent to that element; without " +
      "it, to the focused element. Supports Playwright key syntax (e.g. 'Control+A').",
    inputSchema: {
      key: z.string().describe("Key to press, e.g. 'Enter', 'Tab', 'Escape', 'Control+A'"),
      selector: z.string().optional().describe("Element to focus + press against; omit to press the focused element"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ key, selector }) => {
    const p = await ensurePage();
    if (selector) {
      await p.locator(selector).first().press(key, { timeout: 10000 });
    } else {
      await p.keyboard.press(key);
    }
    return { content: [{ type: "text", text: `Pressed: ${key}${selector ? ` on ${selector}` : ""}` }] };
  }
);

server.registerTool(
  "resize",
  {
    title: "Resize viewport",
    description: "Resize the viewport, e.g. to check a responsive breakpoint before screenshotting.",
    inputSchema: {
      width: z.number().describe("Viewport width in px"),
      height: z.number().describe("Viewport height in px"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ width, height }) => {
    const p = await ensurePage();
    await p.setViewportSize({ width, height });
    return { content: [{ type: "text", text: `Viewport resized to ${width}x${height}` }] };
  }
);

server.registerTool(
  "console_logs",
  {
    title: "Console logs",
    description: "Recent browser console messages and page errors — correlate a visual issue with a JS error.",
    inputSchema: {
      limit: z.number().optional().describe(`Max entries to return, most recent first (default ${DEFAULT_LOG_LIMIT})`),
      level: z.enum(["all", "error"]).optional().describe("'all' (default) or 'error' (errors, page errors, and warnings only)"),
      clear: z.boolean().optional().describe("Clear the buffer after reading"),
      withTimestamps: z.boolean().optional().describe("Include timestamps in the output (default false)"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ limit, level, clear, withTimestamps }) => {
    const filtered =
      level === "error"
        ? consoleLogs.filter((l) => l.type === "error" || l.type === "pageerror" || l.type === "warning")
        : consoleLogs;
    const slice = filtered.slice(-(limit ?? DEFAULT_LOG_LIMIT));
    const text = slice.length
      ? slice
          .map((l) => (withTimestamps ? `[${new Date(l.time).toISOString()}] [${l.type}] ${l.text}` : `[${l.type}] ${l.text}`))
          .join("\n")
      : "(no matching console output captured)";
    if (clear) consoleLogs.length = 0;
    return { content: [{ type: "text", text }] };
  }
);

async function shutdown() {
  try {
    if (browser) await browser.close();
  } catch {
    // ignore
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
