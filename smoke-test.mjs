// Quick end-to-end smoke test: spins up the MCP server as a subprocess,
// speaks MCP over stdio, and exercises navigate + screenshot + screenshot(selector).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["index.js"],
});

const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log(
  "Tools registered:",
  tools.tools.map((t) => t.name).join(", ")
);

// Simple self-contained HTML page with a distinct "icon" element to screenshot.
const html = `data:text/html,${encodeURIComponent(`
  <html><body style="margin:0;padding:40px;font-family:sans-serif;background:#fff">
    <h1>Test Page</h1>
    <button id="save-icon" style="width:64px;height:64px;background:crimson;border-radius:12px;border:none;color:white;font-size:12px">SAVE</button>
  </body></html>
`)}`;

const navResult = await client.callTool({
  name: "navigate",
  arguments: { url: html },
});
console.log("navigate ->", navResult.content[0].text);

const fullShot = await client.callTool({
  name: "screenshot",
  arguments: {},
});
const fullImg = fullShot.content.find((c) => c.type === "image");
if (!fullImg) throw new Error("Full-page screenshot did not return an image block");
fs.writeFileSync("test-full.png", Buffer.from(fullImg.data, "base64"));
console.log("Full screenshot OK, bytes:", Buffer.from(fullImg.data, "base64").length);

const elShot = await client.callTool({
  name: "screenshot",
  arguments: { selector: "#save-icon" },
});
const elImg = elShot.content.find((c) => c.type === "image");
if (!elImg) throw new Error("Element screenshot did not return an image block");
fs.writeFileSync("test-element.png", Buffer.from(elImg.data, "base64"));
console.log("Element screenshot OK, bytes:", Buffer.from(elImg.data, "base64").length);

const logs = await client.callTool({ name: "console_logs", arguments: {} });
console.log("console_logs ->", logs.content[0].text);

// --- Regression coverage for the token-optimization changes ---

// resize still works standalone (not merged away)
const resizeResult = await client.callTool({ name: "resize", arguments: { width: 375, height: 667 } });
console.log("resize ->", resizeResult.content[0].text);

// jpeg format + quality opt-in on screenshot
const jpegShot = await client.callTool({
  name: "screenshot",
  arguments: { selector: "#save-icon", format: "jpeg", quality: 70 },
});
const jpegImg = jpegShot.content.find((c) => c.type === "image");
if (!jpegImg) throw new Error("JPEG screenshot did not return an image block");
if (jpegImg.mimeType !== "image/jpeg") throw new Error(`Expected image/jpeg mimeType, got ${jpegImg.mimeType}`);
console.log("JPEG screenshot OK, mimeType:", jpegImg.mimeType, "bytes:", Buffer.from(jpegImg.data, "base64").length);

// default png still lossless-format
if (elImg.mimeType !== "image/png") throw new Error(`Expected default image/png mimeType, got ${elImg.mimeType}`);
console.log("Default PNG mimeType confirmed:", elImg.mimeType);

// console_logs limit + level filter + no-timestamp-by-default format
const limitedLogs = await client.callTool({ name: "console_logs", arguments: { limit: 5, level: "all" } });
console.log("console_logs(limit=5) ->", limitedLogs.content[0].text);
if (/\d{4}-\d{2}-\d{2}T/.test(limitedLogs.content[0].text)) {
  throw new Error("Expected no ISO timestamp in default console_logs output");
}

// navigate now reports resolved URL + title compactly (single line, no "Navigated to" prefix)
if (!navResult.content[0].text.includes(" — ")) {
  throw new Error("Expected compact 'url — \"title\"' navigate response format");
}
console.log("navigate response format OK");

await client.close();
console.log("SMOKE TEST PASSED");
process.exit(0);
