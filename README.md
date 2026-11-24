# T3Cursor

T3Cursor is an independent, community project built on the open-source T3 Code project. It aims to combine a fast interface for coding agents with an integrated editing and review workflow. It is not affiliated with or endorsed by T3 Tools or Cursor.

> This project is under active development. Installer isolation, strict read-only Ask mode, change acceptance, and in-app updates are not yet complete. Do not use an experimental build as a replacement for an existing installation.

## Development

The repository uses Windows, macOS, or Linux and requires Git, Vite+, and the Node.js version pinned in `package.json`. Windows desktop packaging additionally requires Rust and Visual Studio Build Tools with the C++ workload and Windows SDK.

```powershell
# Install Vite+ using the instructions at https://viteplus.dev/guide/
vp install
vp run dev
```

Use a separate data directory when developing alongside T3 Code. The packaged desktop app defaults to `~/.t3cursor`; `T3CURSOR_HOME` overrides it. T3Cursor uses a separate Electron profile. Existing T3 Code data is not migrated automatically.

## Upstream maintenance

The `upstream` remote tracks the original [T3 Code repository](https://github.com/pingdotgg/t3code). The source-update workflow in [custom/README.md](custom/README.md) stages and tests a merge in a separate worktree and provides a source rollback. It does not update an installed application.

## Contributing

Issues and pull requests are welcome. Keep changes focused, test the affected behavior, and do not commit secrets or personal data. The upstream [AGENTS.md](AGENTS.md) and development documentation describe the architecture and test conventions inherited by this project.

## License and attribution

The original T3 Code source is available under the [MIT License](LICENSE). T3 Code and its branding belong to their respective owners. T3Cursor is an independent community fork; Cursor is a trademark of its respective owner.
