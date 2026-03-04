# Claude Virtual Office

Visual dashboard for monitoring Claude Code agent teams directly inside VS Code.

## Features

- **Live office view** — Watch agents at desks with real-time status animations (PixiJS canvas)
- **Task board** — Track pending, in-progress, and completed tasks with owner assignments
- **Activity feed** — Follow agent messages, tool usage, and file activity in real time
- **Send messages** — Communicate with agents and wake idle teammates (zero API cost)
- **4 themes** — Modern Office, Cozy Library, Space Station, Coffee Shop
- **Status bar** — See server connection status at a glance

## Getting Started

1. Install the extension
2. Start the Virtual Office server:

   ```bash
   cd /path/to/claude-virtual-office
   npm install
   npm run build && node dist/bin/cli.js setup   # register hooks (once)
   npm run dev                                     # start server + client
   ```

3. Open the command palette (`Cmd+Shift+P`) and run **Claude: Open Claude Virtual Office**

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `claudeVirtualOffice.port` | `3377` | Port the server runs on |
| `claudeVirtualOffice.autoStart` | `false` | Auto-start server when panel opens (requires `projectPath`) |
| `claudeVirtualOffice.projectPath` | `""` | Absolute path to the claude-virtual-office project |

## Commands

| Command | Description |
|---------|-------------|
| **Claude: Open Claude Virtual Office** | Open the dashboard in a VS Code panel |
| **Claude: Open Claude Virtual Office in Browser** | Open in your default browser |

## How It Works

The extension embeds the Virtual Office web dashboard in a VS Code webview panel. The dashboard connects to a local Express server (port 3377) that receives Claude Code hook events and broadcasts them via WebSocket.

Agent communication uses file-based inboxes (`~/.claude/teams/{team}/inboxes/`), so sending messages from the dashboard costs zero API tokens.

## Requirements

The [claude-virtual-office](https://github.com/pascual2910/claude-virtual-office) server must be running. See the main project README for full setup instructions.
