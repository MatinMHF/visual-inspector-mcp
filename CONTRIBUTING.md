# Contributing to visual-inspector-mcp

Thank you for your interest in contributing!

## How to contribute

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** — keep each PR focused on a single concern.
3. **Run the smoke test** before opening a PR:
   ```bash
   npm test
   ```
   The test spins up the full server as a subprocess and exercises every tool
   over the real MCP protocol. All tools must pass.
4. **Open a pull request** against `main` with a clear description of what
   changed and why.

## Adding a new tool

All tools live in `index.js` and follow the same pattern:

```js
server.registerTool(
  "tool_name",
  {
    title: "Human-readable title",
    description: "What the tool does and when to use it (shown to the model).",
    inputSchema: {
      param: z.string().describe("What this parameter does"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ param }) => {
    const p = await ensurePage();
    // ... implementation
    return { content: [{ type: "text", text: `Result` }] };
  }
);
```

Tool annotations:
- `readOnlyHint: true` — the tool doesn't modify page state
- `destructiveHint: true` — the tool may have irreversible side-effects
- `openWorldHint: true` — the tool makes real network/filesystem calls

After adding a tool, add a corresponding test case to `smoke-test.mjs`.

## Current tools

| Tool | Read-only | Open world |
|---|---|---|
| `navigate` | No | Yes |
| `screenshot` | Yes | No |
| `click` | No | No |
| `fill` | No | No |
| `type` | No | No |
| `press` | No | No |
| `resize` | No | No |
| `console_logs` | Yes | No |

## Code style

- ES modules (`import`/`export`), no transpilation
- Async/await throughout
- No external runtime dependencies beyond `@modelcontextprotocol/sdk`, `playwright`, and `zod`
- Keep tool descriptions short but explicit about *when* to use each tool —
  they're resent to the model on every turn, so brevity matters

## Reporting bugs

Open an issue at <https://github.com/MatinMHF/visual-inspector-mcp/issues>
with steps to reproduce, your OS, Node.js version, and MCP client.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
