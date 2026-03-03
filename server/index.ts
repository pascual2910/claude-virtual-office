import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import type { ChatMessage, TaskState, WsMessage } from '../shared/types.js';
import { StateManager } from './state-manager.js';
import { FileWatcher } from './file-watcher.js';
import { createHooksRouter } from './hooks-handler.js';
import { InboxWriter } from './inbox-writer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  claudeDir?: string;
  teamName?: string;
  openBrowser?: boolean;
}

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, claudeDir, teamName, openBrowser = true } = options;

  const app = express();
  const server = createServer(app);

  // Parse JSON bodies (for hooks endpoint)
  app.use(express.json({ limit: '1mb' }));

  // State manager
  const stateManager = new StateManager();

  // Mount hooks router
  const hooksRouter = createHooksRouter(stateManager);
  app.use(hooksRouter);

  // API endpoints
  app.get('/api/state', (_req, res) => {
    res.json(stateManager.getState());
  });

  app.get('/api/teams', async (_req, res) => {
    const teams = await fileWatcher.scanForTeams();
    res.json({ teams });
  });

  // Inbox writer for sending messages to agents
  const inboxWriter = new InboxWriter(claudeDir);

  app.post('/api/send-message', async (req, res) => {
    const { teamName: tn, agentName, text, summary } = req.body;
    const team = tn ?? stateManager.getState().teamName;
    if (!team || !agentName || !text) {
      res.status(400).json({ error: 'teamName, agentName, and text are required' });
      return;
    }
    try {
      await inboxWriter.sendMessage(team, agentName, {
        text,
        summary: summary ?? text.slice(0, 50),
      });
      stateManager.addChatMessage({
        timestamp: Date.now(),
        agentName: 'You',
        content: `[to ${agentName}] ${text}`,
        type: 'user-sent',
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/wake-agent', async (req, res) => {
    const { teamName: tn, agentName } = req.body;
    const team = tn ?? stateManager.getState().teamName;
    if (!team || !agentName) {
      res.status(400).json({ error: 'teamName and agentName are required' });
      return;
    }
    try {
      await inboxWriter.sendMessage(team, agentName, {
        text: 'You have been nudged awake from the Virtual Office dashboard. Check your task list for pending work.',
        summary: 'Wake up nudge from dashboard',
      });
      stateManager.addChatMessage({
        timestamp: Date.now(),
        agentName: 'You',
        content: `Woke up ${agentName}`,
        type: 'user-sent',
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Serve static files from dist/client/ (production build)
  // After tsup, __dirname is dist/server/ or dist/, so we go up to project root
  const clientDistCandidates = [
    path.resolve(__dirname, '..', 'client'),        // dist/server/ -> dist/client/
    path.resolve(__dirname, 'client'),               // dist/ -> dist/client/
    path.resolve(__dirname, '..', 'dist', 'client'), // project root -> dist/client/
  ];
  const clientDist = clientDistCandidates.find(d => existsSync(d)) ?? clientDistCandidates[0];
  app.use(express.static(clientDist));

  // Fallback to index.html for SPA routing (Express v5 syntax)
  app.get('/{*splat}', (_req, res) => {
    const indexPath = path.join(clientDist, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send(`
        <html><head><title>Claude Virtual Office</title></head>
        <body style="background:#0f172a;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="text-align:center">
            <h1>Claude Virtual Office</h1>
            <p>Server is running. Client not built yet.</p>
            <p>Run <code style="background:#1e293b;padding:2px 8px;border-radius:4px">npm run build:client</code> then refresh.</p>
          </div>
        </body></html>
      `);
    }
  });

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (msg: WsMessage): void => {
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  };

  wss.on('connection', (ws) => {
    // Send full state on connect
    const fullState: WsMessage = {
      type: 'full-state',
      state: stateManager.getState(),
    };
    ws.send(JSON.stringify(fullState));
  });

  // Subscribe to state events and broadcast to WebSocket clients
  stateManager.on('agent-updated', (agent) => {
    broadcast({ type: 'agent-updated', agent });
  });

  stateManager.on('tasks-updated', (tasks) => {
    broadcast({ type: 'tasks-updated', tasks });
  });

  stateManager.on('chat-message', (message) => {
    broadcast({ type: 'chat-message', message });
  });

  stateManager.on('team-changed', (name, agents) => {
    broadcast({ type: 'team-changed', teamName: name, agents });
  });

  // File watcher
  const fileWatcher = new FileWatcher(claudeDir);

  // Wire file watcher events to state manager
  fileWatcher.on('team-config-changed', (config) => {
    if (config && config.name && Array.isArray(config.members)) {
      stateManager.setTeam(
        config.name,
        config.members.map((m: any) => ({
          name: m.name ?? 'unknown',
          agentId: m.agentId ?? m.agent_id ?? 'unknown',
          agentType: m.agentType ?? m.agent_type ?? 'agent',
        }))
      );
    }
  });

  fileWatcher.on('tasks-changed', (tasks) => {
    const normalized: TaskState[] = tasks.map((t: any) => ({
      id: t.id ?? String(Math.random()),
      content: t.content ?? t.title ?? '',
      status: t.status ?? 'pending',
      owner: t.owner ?? null,
      activeForm: t.activeForm ?? undefined,
    }));
    stateManager.updateTasks(normalized);
  });

  fileWatcher.on('jsonl-entry', (entry) => {
    // Extract chat messages from JSONL entries
    if (entry.type === 'assistant' && entry.message?.content) {
      const content =
        typeof entry.message.content === 'string'
          ? entry.message.content
          : Array.isArray(entry.message.content)
            ? entry.message.content
                .filter((b: any) => b.type === 'text')
                .map((b: any) => b.text)
                .join('')
            : '';

      if (content) {
        const msg: ChatMessage = {
          timestamp: Date.now(),
          agentName: entry.session_id ?? 'agent',
          content: content.slice(0, 500),
          type: 'agent-message',
        };
        stateManager.addChatMessage(msg);
      }
    }

    if (entry.type === 'tool_use') {
      const agentId = entry.session_id ?? 'agent';
      const toolName = entry.name ?? entry.tool_name ?? 'unknown';
      stateManager.updateAgentStatus(agentId, 'working', toolName);
    }
  });

  fileWatcher.on('error', (err) => {
    console.error('  [FileWatcher]', err.message);
  });

  // Start the file watcher
  fileWatcher.start(teamName);

  // Handle server errors (e.g. port in use)
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Error: Port ${port} is already in use.`);
      console.error(`  Try: kill $(lsof -ti :${port})  or  use --port <other>`);
      process.exit(1);
    }
    throw err;
  });

  // Start listening
  server.listen(port, '127.0.0.1', async () => {
    const url = `http://localhost:${port}`;
    console.log(`  Server:    ${url}`);
    console.log(`  WebSocket: ws://localhost:${port}/ws`);
    console.log(`  Hooks:     POST ${url}/hooks`);
    console.log();
    console.log('  Watching for Claude Code team activity...');
    console.log('  Press Ctrl+C to stop.\n');

    if (openBrowser) {
      try {
        const open = (await import('open')).default;
        await open(url);
      } catch {
        // Silently ignore if browser fails to open
      }
    }
  });
}
