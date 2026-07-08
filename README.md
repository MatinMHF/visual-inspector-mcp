**English** | [فارسی](./README.fa.md)

# visual-inspector-mcp

An [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that lets Claude Code — or any MCP-compatible client — **visually inspect rendered web pages** through a persistent headless Chromium browser powered by [Playwright](https://playwright.dev).

Instead of guessing UI state from source code alone, your AI assistant can navigate to a URL, take a screenshot, click elements, resize the viewport, and read browser console logs — all over a single persistent page session.

## Table of Contents

- [Why this exists](#why-this-exists)
- [Tools](#tools)
  - [navigate](#navigate)
  - [screenshot](#screenshot)
  - [click](#click)
  - [resize](#resize)
  - [console_logs](#console_logs)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Clone and install dependencies](#clone-and-install-dependencies)
- [Usage](#usage)
  - [Run directly](#run-directly)
  - [Register with Claude Code](#register-with-claude-code)
  - [Register with Claude Desktop](#register-with-claude-desktop-or-any-mcp-compatible-client)
  - [Example workflow](#example-workflow)
- [Running the smoke test](#running-the-smoke-test)
- [Security notes](#security-notes)
- [License](#license)

## Why this exists

Most AI coding assistants only read your source files. `visual-inspector-mcp` gives your assistant a real browser window so it can:

- **See** what the page actually looks like (not just what the HTML says)
- **Interact** with the UI — open menus, navigate tabs, trigger modals — before screenshotting
- **Debug visually** by correlating a broken layout with console errors in the same session
- **Check responsive breakpoints** by resizing the viewport on the fly

All through a single, lightweight MCP server — no Docker, no additional services.

## Tools

| Tool | Description | Side-effects? |
| --- | --- | --- |
| `navigate` | Load a URL in the persistent headless page | Opens network connections |
| `screenshot` | Capture the viewport, full page, or a CSS selector | Read-only |
| `click` | Click an element by CSS selector or Playwright locator | Modifies page state |
| `resize` | Resize the browser viewport | Modifies page state |
| `console_logs` | Return recent browser console messages and page errors | Read-only |

Each tool is annotated with `readOnlyHint`, `destructiveHint`, and `openWorldHint` metadata so MCP clients can surface appropriate confirmation prompts.

### `navigate`

Load a URL in the persistent browser page. The page stays open for later `click`, `screenshot`, or `console_logs` calls.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | URL to load (supports `http://`, `https://`, `file://`, and `data:` URIs) |
| `waitForSelector` | string | no | Wait for this CSS/Playwright selector before returning — useful for SPAs |

Returns the resolved URL and page title on one line: `https://example.com — "Example Domain"`.

### `screenshot`

Screenshot the current page and return it as a base64-encoded image block.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `selector` | string | no | Capture only this element (cheapest); CSS selector or Playwright locator |
| `fullPage` | boolean | no | Capture the full scrollable page (most expensive); defaults to viewport |
| `format` | `"png"` \| `"jpeg"` | no | `png` (default, lossless) or `jpeg` (smaller; fine for layout checks) |
| `quality` | number 1–100 | no | JPEG quality (default 80); ignored for PNG |

Requires `navigate` to have been called first.

### `click`

Click an element to reach a UI state (open a menu, modal, or tab) before screenshotting it.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `selector` | string | yes | CSS selector or Playwright locator of the element to click |

### `resize`

Resize the browser viewport to check a responsive breakpoint.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `width` | number | yes | Viewport width in pixels |
| `height` | number | yes | Viewport height in pixels |

### `console_logs`

Return recent browser console messages and page errors — useful for correlating a visual glitch with a JavaScript error.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `limit` | number | no | Max entries to return, most recent first (default 30) |
| `level` | `"all"` \| `"error"` | no | `"all"` (default) or errors/warnings only |
| `clear` | boolean | no | Clear the log buffer after reading |
| `withTimestamps` | boolean | no | Prepend ISO timestamps to each entry (default false) |

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for native `fetch` and ESM support)
- A terminal / shell

### Clone and install dependencies

```bash
git clone https://github.com/MatinMHF/visual-inspector-mcp.git
cd visual-inspector-mcp
npm install          # also runs `playwright install chromium` via postinstall
```

If Chromium is not installed automatically, run:

```bash
npx playwright install chromium
```

## Usage

### Run directly

```bash
node index.js
```

The server communicates over **stdio**, so it is meant to be launched by an MCP client, not run interactively on its own.

### Register with Claude Code

```bash
claude mcp add visual-inspector -s user -- node /path/to/visual-inspector-mcp/index.js
```

On Windows PowerShell, quote the `--` separator to prevent PowerShell from silently stripping it:

```powershell
claude mcp add visual-inspector -s user "--" node "C:/path/to/visual-inspector-mcp/index.js"
```

### Register with Claude Desktop (or any MCP-compatible client)

Add an entry to your client's MCP server config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "visual-inspector": {
      "command": "node",
      "args": ["C:/path/to/visual-inspector-mcp/index.js"]
    }
  }
}
```

### Example workflow

A typical session once the server is registered with your MCP client:

1. **"Navigate to my dev server"** → calls `navigate` with `http://localhost:3000`
2. **"Take a screenshot"** → calls `screenshot` to see the current rendered UI
3. **"Click the hamburger menu"** → calls `click` with the selector, then `screenshot` again
4. **"Check it at mobile width"** → calls `resize` with `{ width: 375, height: 667 }`, then `screenshot`
5. **"Any JS errors?"** → calls `console_logs` with `{ level: "error" }`

## Running the smoke test

A self-contained end-to-end smoke test spins up the server as a subprocess, speaks MCP over stdio, and exercises all five tools:

```bash
npm test
```

The test writes `test-full.png` and `test-element.png` to the working directory as proof that screenshots are working. Both files can be deleted afterwards.

## Security notes

- The server launches a **headless** Chromium instance; it has access to your local network and filesystem via `file://` URLs.
- Only register it with MCP clients and sessions you trust.
- `click` is marked `destructiveHint: true` — well-behaved clients should confirm before invoking it on production pages.
- Because every tool has `openWorldHint: true` (real network calls), avoid pointing it at sensitive internal services without understanding the risk.

## License

MIT — see [LICENSE](./LICENSE) for details.
