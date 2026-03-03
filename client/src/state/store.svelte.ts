import type {
  VirtualOfficeState,
  AgentState,
  TaskState,
  ChatMessage,
} from '../../../shared/types';

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
