# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅ Yes     |

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for security vulnerabilities.**

To report a security issue, contact the maintainer directly through one of these channels:

- Open a [GitHub Security Advisory](https://github.com/MatinMHF/visual-inspector-mcp/security/advisories/new) (private disclosure)
- Or message via GitHub profile: [@MatinMHF](https://github.com/MatinMHF)

Please include:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested mitigations

You can expect an acknowledgement within **72 hours** and a status update within **7 days**.

## Security considerations for this server

`visual-inspector-mcp` launches a headless Chromium browser process with access to your local network and filesystem (via `file://` URLs). Keep the following in mind:

- **Only register this server with MCP clients and sessions you fully trust.**
- **Scope the server to trusted pages only.** Navigating to untrusted or attacker-controlled URLs exposes your local environment to the rendered page's JavaScript.
- **The `click` tool** is marked `destructiveHint: true` — MCP clients should confirm before invoking it on production pages.
- **Do not point this server at sensitive internal services** (admin panels, CI dashboards, credential stores) without understanding the risks.
- Chromium is kept up to date automatically by Playwright; run `npx playwright install chromium` periodically or after each `npm update`.
