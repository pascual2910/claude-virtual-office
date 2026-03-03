# Claude Virtual Office

A visual dashboard for monitoring and interacting with Claude Code agent teams in real time.

![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?logo=svelte&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS_8-E72264?logo=pixi.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Features

- **Live office canvas** — PixiJS-rendered workspace where each agent sits at a desk with real-time status animations
- **Tool visualizations** — See what each agent is doing (reading, editing, searching, running commands) with animated icons
- **Task board** — Track pending, in-progress, and completed tasks with owner assignments
- **Chat panel** — View agent activity, send messages to agents, and wake idle agents
- **Agent detail panel** — Click an agent to see status, activity sparkline, recent files, and send quick messages
- **4 themes** — Modern Office, Cozy Library, Space Station, Coffee Shop — each with unique PixiJS environments, decorations, and ambient particles
- **Sound notifications** — Web Audio API tones for task completions, idle agents, and messages (with mute toggle)
- **Task completion celebrations** — Confetti animations when tasks are completed
- **VS Code extension** — Embed the dashboard in a VS Code webview panel

## How It Works

Claude Virtual Office connects to Claude Code via [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks). A local Express server receives hook events (tool use, agent status changes, task updates) and broadcasts them over WebSocket to the Svelte/PixiJS frontend.

Agent communication uses file-based inboxes (`~/.claude/teams/{team}/inboxes/{agent}.json`), so sending messages from the dashboard costs zero API tokens.

## Quick Start

```bash
# Install dependencies
npm install

# Register Claude Code hooks
npm run build && node dist/bin/cli.js setup

# Start dev server (Express + Vite)
npm run dev
```

Open http://localhost:5173 in your browser, then start a Claude Code team session — agents will appear in the office automatically.

## Project Structure

```
server/          Express server, WebSocket, hook handlers, file watchers
client/          Svelte 5 frontend with PixiJS canvas
  src/
    canvas/      PixiJS office renderer (desks, agents, animations, particles)
    components/  Svelte components (TaskBoard, ChatPanel, AgentDetail, etc.)
    state/       Reactive store, WebSocket client, sound notifications
    themes/      Theme definitions (4 visual environments)
shared/          TypeScript types shared between server and client
vscode-extension/ VS Code extension (webview panel)
```

## Stack

- **Frontend:** Svelte 5 (runes), Vite 7, Tailwind v4, PixiJS 8
- **Backend:** Express 5, WebSocket (ws), TypeScript
- **Build:** tsup (server), Vite (client)

## VS Code Extension

```bash
cd vscode-extension
npm install && npm run compile
npx @vscode/vsce package
code --install-extension claude-virtual-office-1.0.0.vsix
```

Then run the command **"Claude: Open Claude Virtual Office"** from the command palette.

## Themes

| Theme | Description |
|-------|-------------|
| Modern Office | Sleek dark office with glass partitions and blue accents |
| Cozy Library | Warm wooden library with bookshelves and floating dust particles |
| Space Station | Sci-fi command center with holographic displays and drifting stars |
| Coffee Shop | Warm cafe with round tables, plants, and rising steam particles |
