# Contributing to visual-inspector-mcp

Thank you for considering a contribution! This is a small, focused project — please keep pull requests equally focused.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Development workflow](#development-workflow)
- [Commit style](#commit-style)
- [Pull request checklist](#pull-request-checklist)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.

## Reporting bugs

Open a [GitHub Issue](https://github.com/MatinMHF/visual-inspector-mcp/issues) and include:

- Node.js version (`node --version`)
- Playwright version (`npx playwright --version`)
- Operating system
- MCP client you are using (Claude Code, Claude Desktop, …)
- Steps to reproduce, expected behaviour, and actual behaviour
- Any relevant log output

## Suggesting features

Open an issue with the `enhancement` label. Describe the use-case clearly before any implementation detail — the simpler the API surface the better.

## Development workflow

```bash
git clone https://github.com/MatinMHF/visual-inspector-mcp.git
cd visual-inspector-mcp
npm install          # also installs Chromium via postinstall
node index.js        # run the server manually (exits when stdin closes)
npm test             # end-to-end smoke test
```

The entire server lives in `index.js`. There is no build step.

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

Examples:
- `feat(screenshot): add support for clip regions`
- `fix(navigate): handle redirects with non-2xx status`
- `docs: add Windows PowerShell registration example`

## Pull request checklist

- [ ] `npm test` passes locally
- [ ] Changes are limited to a single concern
- [ ] New behaviour is covered by the smoke test where feasible
- [ ] Commit messages follow Conventional Commits
- [ ] The PR description explains *why*, not just *what*
