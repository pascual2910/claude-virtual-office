import type {
  VirtualOfficeState,
  AgentState,
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
}
