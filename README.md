# visual-inspector-mcp

[![npm version](https://img.shields.io/badge/version-1.1.0-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

**English** | [فارسی](README.fa.md)

An [MCP](https://modelcontextprotocol.io) server that lets Claude Code — or any
MCP-compatible client — **actually see and interact with** the web pages it's
working on, instead of only reading the source. It runs a persistent headless
Chromium browser (via [Playwright](https://playwright.dev)) and returns
screenshots as inline images the model can view directly in the tool result.

> "This icon looks wrong" → the agent screenshots the icon and looks at it,
> instead of guessing from the CSS.

## Why

Coding agents are excellent at reading and writing code, but blind to what
that code actually renders as. A misaligned icon, a color that doesn't match
the design, a responsive layout that breaks at a certain width, a modal that
overlaps its own close button — none of these are visible from source alone.
This server closes that gap with a set of small, composable tools built around
a single persistent browser session — including full form interaction, so the
agent can fill inputs, type keystrokes, and submit forms before looking at the
result.

## Tools

| Tool | Description |
|---|---|
| `navigate` | Load a URL (dev server, `file://`, or any public site) in a persistent page. Stays open for subsequent calls. Returns the *resolved* URL + title, so silent redirects are visible. |
| `screenshot` | Screenshot the current page, or a single element by CSS selector / Playwright locator syntax (e.g. `text=Submit`). Supports viewport, full-page, and element-scoped capture. Defaults to lossless PNG; JPEG is an opt-in for large, photo-heavy full-page captures. |
| `click` | Click an element to reach a UI state (open a modal, menu, tab) before screenshotting it. |
| `fill` | Set the value of an input/textarea/select by selector (`locator.fill` — clears then types, dispatching the input/change events React controlled components need). Pass `fields` to fill several inputs in one call. |
| `type` | Type into a field one key at a time (`locator.pressSequentially`), firing a keydown/keypress/keyup per character — for inputs whose handlers need real keystrokes and don't react to `fill`. Optional `clear` and per-keystroke `delay`. |
| `press` | Press a keyboard key such as `Enter` (submit a form), `Tab`, or `Escape`, against a given `selector` or the focused element. Supports Playwright key syntax (e.g. `Control+A`). |
| `resize` | Change the viewport size to check a responsive breakpoint, independent of navigating or screenshotting — so you can resize → click → screenshot without reloading the page (and losing client-side state). |
| `console_logs` | Recent browser console messages and page errors, to correlate a visual issue with a JS error. Supports `limit` and an `error`-only filter. |

Full parameter reference is in the tool descriptions themselves (visible to
any MCP client) and in [`index.js`](index.js).

## Requirements

- [Node.js](https://nodejs.org) 18 or later
- ~200 MB free disk space (Playwright downloads a Chromium build on install)

## Installation

```bash
git clone https://github.com/MatinMHF/visual-inspector-mcp.git
cd visual-inspector-mcp
npm install        # installs dependencies and downloads Chromium via postinstall
```

## Configuration

### Claude Code

```bash
claude mcp add --scope user visual-inspector -- node /absolute/path/to/visual-inspector-mcp/index.js
```

`--scope user` registers it for every project. Use `--scope project` instead
to scope it to the current repo, or omit `--scope` for the current session
only. Restart Claude Code (or start a new session) after adding it — a
running session won't pick up a newly registered server.

On **Windows PowerShell**, quote the `--` separator:

```powershell
claude mcp add --scope user visual-inspector "--" node "C:/path/to/visual-inspector-mcp/index.js"
```

Verify it's connected:

```bash
claude mcp list
```

### Claude Desktop (or any client using `claude_desktop_config.json`)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "visual-inspector": {
      "command": "node",
      "args": ["/absolute/path/to/visual-inspector-mcp/index.js"]
    }
  }
}
```

### Other MCP clients

This is a standard stdio MCP server — `node index.js` speaks MCP over
stdin/stdout. Any client that supports stdio-transport MCP servers can run it
the same way.

## Usage

Once configured, just ask naturally:

> "Navigate to localhost:3000/settings and screenshot the save icon in the
> toolbar — does it look right?"

> "Resize to 375x667 and check what the mobile nav looks like after I click
> the hamburger menu."

> "Fill in the signup form with test data and submit it — any errors?"

> "Any console errors on the checkout page?"

Typical tool sequences:

```js
// Visual inspection
navigate({ url: "http://localhost:3000/settings" })
screenshot({ selector: "#save-icon" })   // isolate just the element
console_logs({ level: "error" })         // check for related JS errors

// Form interaction
navigate({ url: "http://localhost:3000/signup" })
fill({ fields: [{ selector: "#name", value: "Ada" }, { selector: "#email", value: "ada@example.com" }] })
press({ key: "Enter", selector: "[type=submit]" })
screenshot({})                           // see the result

// Responsive check
resize({ width: 375, height: 667 })
screenshot({ fullPage: true })
```

## Design notes

- **One persistent page per server process.** `navigate` doesn't spin up a
  new browser each call — it reuses the same page/context so state (login,
  scroll position, SPA client state) survives across `click` → `fill` →
  `screenshot` sequences.
- **`fill` vs `type`.** `fill` is almost always the right choice — it clears
  the field, sets the value atomically, and fires the input/change events
  React's controlled components need. Use `type` only when the input's handler
  specifically reacts to individual keystrokes (e.g. an autocomplete that
  fires on `keydown`).
- **Cheapest-capture-first.** `screenshot`'s tool description actively steers
  the calling model toward `selector` (one element) over the default
  viewport, and viewport over `fullPage` (most expensive in image tokens).
- **Lossless by default.** Screenshots are PNG unless you explicitly opt into
  `format: "jpeg"`. On flat-color UI (icons, buttons), JPEG is often no
  smaller — so PNG stays the default; on photo-heavy full-page captures,
  JPEG at quality 80 measured ~75–80% smaller in testing.
- **Bounded log output.** `console_logs` defaults to the last 30 entries with
  no timestamps — pass `limit`/`withTimestamps` for more.

## Security note

This server gives the connected AI client the ability to navigate a real
(headless) browser to any URL it's given — including `localhost` and other
addresses on your local network. It's designed to run locally over stdio for
trusted development use, the same way you'd trust any other local dev
tooling. Don't expose it over a network transport or hand it to an untrusted
client.

## Development

```bash
npm test        # runs smoke-test.mjs: spins up the server as a subprocess and
                # exercises every tool + parameter over the real MCP protocol
```

`smoke-test.mjs` is also run in CI on every push/PR (see
`.github/workflows/test.yml`).

## Changelog

### v1.1.0
- Added `fill` tool — set input/textarea/select values (supports batch `fields[]`)
- Added `type` tool — per-keystroke typing for inputs needing real keydown events
- Added `press` tool — send keyboard keys (`Enter`, `Tab`, `Escape`, `Control+A`, …)
- Extended smoke test with full form interaction coverage

### v1.0.0
- Initial release: `navigate`, `screenshot`, `click`, `resize`, `console_logs`

## License

[MIT](LICENSE)
