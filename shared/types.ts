// Agent status derived from hooks + JSONL events
export type AgentStatus =
  | 'working'
  | 'idle'
  | 'typing'
  | 'reading'
  | 'running-command'
  | 'searching'
  | 'thinking'
  | 'stopped';

// Current tool being used by an agent
export type ToolName =
  | 'Bash'
  | 'Edit'
  | 'Write'
  | 'Read'
  | 'Glob'
  | 'Grep'
  | 'WebFetch'
  | 'WebSearch'
  | 'Agent'
  | 'TodoWrite'
  | 'SendMessage'
  | 'TaskCreate'
  | 'TaskUpdate'
  | string;

export interface Position {
  x: number;
  y: number;
}

export interface AgentState {
  id: string;
  name: string;
  agentType: string;
  status: AgentStatus;
  currentTool: ToolName | null;
  currentAction: string | null;
  lastMessage: string | null;
  seatPosition: Position;
  taskId: string | null;
  lastActivityTime: number;
}

export interface TaskState {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string | null;
  activeForm?: string;
}

export interface ChatMessage {
  timestamp: number;
  agentName: string;
  content: string;
  type: 'agent-message' | 'tool-use' | 'system' | 'user-sent';
}

export interface VirtualOfficeState {
  teamName: string | null;
  agents: AgentState[];
  tasks: TaskState[];
  chatLog: ChatMessage[];
  connected: boolean;
}

// WebSocket message types from server to client
export type WsMessage =
  | { type: 'full-state'; state: VirtualOfficeState }
  | { type: 'agent-updated'; agent: AgentState }
  | { type: 'tasks-updated'; tasks: TaskState[] }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'team-changed'; teamName: string | null; agents: AgentState[] };

// Hook event from Claude Code
export interface HookEvent {
  hook_event_name: string;
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: any;
  tool_response?: any;
  teammate_name?: string;
  team_name?: string;
  task_id?: string;
  task_subject?: string;
  last_assistant_message?: string;
  message?: string;
  notification_type?: string;
  [key: string]: any;
}

// Theme definition
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    idle: string;
  };
  office: {
    backgroundColor: number; // PixiJS hex color
    deskColor: number;
    floorColor: number;
    wallColor: number;
  };
}
