import type {
  VirtualOfficeState,
  AgentState,
  AgentStatus,
  TaskState,
  ChatMessage,
  ThemeConfig,
} from '../../../shared/types';
import { getThemeById } from '../themes';

function createDefaultState(): VirtualOfficeState {
  return {
    teamName: null,
    agents: [],
    tasks: [],
    chatLog: [],
    connected: false,
  };
}

// Reactive state using Svelte 5 runes (in .svelte.ts files)
// All exports are `const` — we only mutate properties, never reassign
export const officeState: VirtualOfficeState = $state(createDefaultState());

// Wrap selectedAgent in an object so we can export it as const
export const selection: { agentId: string | null } = $state({ agentId: null });

export function updateFullState(state: VirtualOfficeState): void {
  officeState.teamName = state.teamName;
  officeState.agents = state.agents;
  officeState.tasks = state.tasks;
  officeState.chatLog = state.chatLog;
  officeState.connected = state.connected;
}

export function updateAgent(agent: AgentState): void {
  const index = officeState.agents.findIndex((a) => a.id === agent.id);
  if (index >= 0) {
    officeState.agents[index] = agent;
  } else {
    officeState.agents.push(agent);
  }
}

export function updateTasks(tasks: TaskState[]): void {
  officeState.tasks = tasks;
}

export function addChatMessage(msg: ChatMessage): void {
  officeState.chatLog.push(msg);
}

export function updateTeam(teamName: string | null, agents: AgentState[]): void {
  officeState.teamName = teamName;
  officeState.agents = agents;
}

export function selectAgent(id: string | null): void {
  selection.agentId = id;
}

export function setConnected(value: boolean): void {
  officeState.connected = value;
}

// Theme state
const savedThemeId = typeof localStorage !== 'undefined'
  ? localStorage.getItem('vo-theme') ?? 'modern-office'
  : 'modern-office';

export const themeState: { current: ThemeConfig } = $state({
  current: getThemeById(savedThemeId),
});

export function setTheme(id: string): void {
  themeState.current = getThemeById(id);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('vo-theme', id);
  }
  applyThemeCssVars(themeState.current);
}

export function applyThemeCssVars(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--vo-primary', theme.palette.primary);
  root.style.setProperty('--vo-primary-hover', theme.palette.secondary);
  root.style.setProperty('--vo-secondary', theme.palette.secondary);
  root.style.setProperty('--vo-accent', theme.palette.accent);
  root.style.setProperty('--vo-background', theme.palette.background);
  root.style.setProperty('--vo-surface', theme.palette.surface);
  root.style.setProperty('--vo-text', theme.palette.text);
  root.style.setProperty('--vo-text-secondary', theme.palette.textSecondary);
  root.style.setProperty('--vo-success', theme.palette.success);
  root.style.setProperty('--vo-warning', theme.palette.warning);
  root.style.setProperty('--vo-error', theme.palette.error);
  root.style.setProperty('--vo-idle', theme.palette.idle);
  // Derived vars for UI components
  root.style.setProperty('--vo-surface-hover', lightenHex(theme.palette.surface, 20));
  root.style.setProperty('--vo-border', lightenHex(theme.palette.surface, 30));
  root.style.setProperty('--vo-text-muted', theme.palette.idle);
}

/** Lighten a hex color by a percentage (0-100). */
function lightenHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// --- Status history for sparklines ---

export interface StatusHistoryEntry {
  status: AgentStatus;
  timestamp: number;
}

const MAX_HISTORY = 30;

export const statusHistory: Map<string, StatusHistoryEntry[]> = $state(new Map());

export function recordStatusChange(agentId: string, status: AgentStatus): void {
  if (!statusHistory.has(agentId)) {
    statusHistory.set(agentId, []);
  }
  const history = statusHistory.get(agentId)!;
  // Only record if status actually changed
  if (history.length > 0 && history[history.length - 1].status === status) return;

  history.push({ status, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// --- Sound state ---

const savedMuted = typeof localStorage !== 'undefined'
  ? localStorage.getItem('vo-muted') === 'true'
  : false;

export const soundState: { muted: boolean } = $state({ muted: savedMuted });

export function toggleMute(): void {
  soundState.muted = !soundState.muted;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('vo-muted', String(soundState.muted));
  }
}
