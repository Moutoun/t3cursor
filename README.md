# T3Cursor

[![Download T3Cursor for Windows](https://img.shields.io/badge/Download-Windows%20alpha-blue)](https://github.com/Moutoun/t3cursor/releases/download/v0.1.0-alpha/T3Cursor-Setup.exe)

T3Cursor is an independent open-source project created and maintained by **Moutoun**. Built on [T3 Code](https://github.com/pingdotgg/t3code), it brings coding agents, an integrated editor and code review into one workspace. It is not affiliated with or endorsed by T3 Tools or Cursor.

## Install the Windows alpha

1. Download [T3Cursor-Setup.exe](https://github.com/Moutoun/t3cursor/releases/download/v0.1.0-alpha/T3Cursor-Setup.exe).
2. Open the installer and follow Windows prompts. The alpha installer is unsigned, so Windows may display a warning.
3. Launch T3Cursor and connect an installed, authenticated coding agent.

T3Cursor uses a separate Electron profile and `~/.t3cursor` data directory. It does not automatically import the official application's conversations, settings or credentials. Provider authentication may need to be configured separately.

## Alpha limitations

- Ask mode with guaranteed read-only enforcement is not available. Agent and Plan are available where supported by the selected provider.
- Monaco is optional in the existing file panel. File-level Accept/Reject controls are not yet available.
- The official binary updater is disabled; automatic T3Cursor application updates are not yet available.
- The upstream source-update script requires a development checkout and does not update installed binaries.
- Side-by-side installation and uninstallation have received a limited local smoke test. Existing official conversations and credentials have not been individually inspected.
- Some inherited T3 Code branding remains and will be replaced in a later alpha.

## Develop

Install Git, [Vite+](https://viteplus.dev/guide/) and the Node.js version pinned in `package.json`. Windows desktop packaging additionally requires Rust and Visual Studio Build Tools with the C++ workload and Windows SDK.

```powershell
vp install
vp run dev
```

The packaged desktop app defaults to `~/.t3cursor`; `T3CURSOR_HOME` overrides it. See [custom/README.md](custom/README.md) for the tested upstream merge and source rollback workflow.

## Contributing

Issues and pull requests are welcome. Keep changes focused, test affected behavior, and do not commit secrets or personal data. Existing project documentation describes inherited architecture and test conventions.

## License and attribution

T3Cursor builds on T3 Code, originally created by T3 Tools and contributors. Original copyright notices and the [MIT License](LICENSE) are retained. T3 Code and Cursor are trademarks of their respective owners; T3Cursor is an independent community project.
