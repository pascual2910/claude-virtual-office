import type { WsMessage } from '../../../shared/types';
import {
  updateFullState,
  updateAgent,
  updateTasks,
  addChatMessage,
  updateTeam,
  updateProjectPath,
  setConnected,
  recordStatusChange,
  soundState,
} from './store.svelte';
import { playSound, setMuted } from './sounds';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(): () => void {
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      setConnected(true);
      console.log('[WS] Connected');
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    });

    ws.addEventListener('close', () => {
      setConnected(false);
      console.log('[WS] Disconnected, reconnecting in 2s...');
      reconnectTimer = setTimeout(connect, 2000);
    });

    ws.addEventListener('error', (err) => {
      console.error('[WS] Error:', err);
      ws?.close();
    });
  }

  connect();

  return () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
  };
}

function handleMessage(msg: WsMessage): void {
  // Sync mute state from reactive store to sounds module
  setMuted(soundState.muted);

  switch (msg.type) {
    case 'full-state':
      updateFullState(msg.state);
      break;
    case 'agent-updated':
      updateAgent(msg.agent);
      recordStatusChange(msg.agent.id, msg.agent.status);
      break;
    case 'tasks-updated':
      updateTasks(msg.tasks);
      break;
    case 'chat-message':
      addChatMessage(msg.message);
      // Sound triggers
      if (msg.message.type === 'system' && msg.message.content.includes('went idle')) {
        playSound('agent-idle');
      } else if (msg.message.type === 'system' && msg.message.content.startsWith('Completed:')) {
        playSound('task-completed');
      } else if (msg.message.type === 'agent-message') {
        playSound('message-received');
      }
      break;
    case 'team-changed':
      updateTeam(msg.teamName, msg.agents);
      break;
    case 'project-path':
      updateProjectPath(msg.path);
      break;
  }
}
